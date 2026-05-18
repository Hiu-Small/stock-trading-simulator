import db from "../models";
import axios from "axios";
import PYTHON_API from "../config/pythonApi.js";

/**
 * Đặt lệnh mới — tạo trạng thái PENDING, đóng băng tiền/cổ phiếu
 */
const placeOrder = async (orderData) => {
    const t = await db.sequelize.transaction();
    try {
        const { userId, symbol, quantity, price, side, type } = orderData;
        const qtyToTrade = parseInt(quantity);
        const tradePrice = parseFloat(price);

        // 1. Kiểm tra trạng thái thị trường tổng (Kill Switch)
        const globalSetting = await db.Setting.findOne({ where: { key: 'market_status' }, transaction: t });
        const globalStatus = globalSetting ? globalSetting.value : 'OPEN';
        if (globalStatus === 'CLOSED') {
            await t.rollback();
            return { EM: 'Thị trường hiện đang đóng cửa bởi Admin. Không thể đặt lệnh.', EC: -1, DT: '' };
        }

        // 2. Kiểm tra mã cổ phiếu
        const stock = await db.Stock.findOne({ where: { symbol: symbol.toUpperCase() }, transaction: t });
        if (!stock) {
            await t.rollback();
            return { EM: `Mã cổ phiếu ${symbol} không tồn tại trong hệ thống.`, EC: -1, DT: '' };
        }
        if (stock.is_active === false) {
            await t.rollback();
            return { EM: `Mã cổ phiếu ${symbol} đang bị tạm dừng giao dịch bởi Admin.`, EC: -1, DT: '' };
        }

        // 3. Lấy phí & thuế từ Settings
        const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
        const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;

        const tradeAmount = qtyToTrade * tradePrice;
        const estimatedFee = tradeAmount * (baseFeePct / 100);
        const totalRequired = tradeAmount + estimatedFee; // Tổng tiền cần đóng băng khi mua

        // 4. Lấy ví người dùng
        const wallet = await db.Wallet.findOne({ where: { user_id: userId }, transaction: t });
        if (!wallet) {
            await t.rollback();
            return { EM: 'Tài khoản ví không tồn tại. Vui lòng liên hệ Admin.', EC: -1, DT: '' };
        }

        if (side === 'BUY') {
            // Kiểm tra số dư khả dụng (balance - frozen_balance)
            const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.frozen_balance);
            if (availableBalance < totalRequired) {
                await t.rollback();
                return {
                    EM: `Số dư khả dụng không đủ. Cần: ${totalRequired.toLocaleString('vi-VN')} ₫ (gồm phí ước tính), Khả dụng: ${availableBalance.toLocaleString('vi-VN')} ₫.`,
                    EC: -1, DT: ''
                };
            }
            // Đóng băng tiền
            await wallet.update({ frozen_balance: parseFloat(wallet.frozen_balance) + totalRequired }, { transaction: t });

        } else if (side === 'SELL') {
            // Kiểm tra sở hữu cổ phiếu
            const holding = await db.Holding.findOne({ where: { user_id: userId, stock_id: stock.id }, transaction: t });
            if (!holding || holding.quantity < qtyToTrade) {
                await t.rollback();
                return {
                    EM: `Số lượng cổ phiếu ${symbol} không đủ để bán. Sở hữu: ${holding ? holding.quantity : 0} CP.`,
                    EC: -1, DT: ''
                };
            }

            // Kiểm tra quy tắc T+0
            const t0Setting = await db.Setting.findOne({ where: { key: 'enable_t0_trading' }, transaction: t });
            const enableT0 = t0Setting ? t0Setting.value === 'true' : true;
            if (!enableT0) {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const todayBuys = await db.Order.findAll({
                    where: {
                        user_id: userId, symbol: symbol.toUpperCase(),
                        side: 'BUY', status: 'MATCHED',
                        createdAt: { [db.Sequelize.Op.gte]: today }
                    }, transaction: t
                });
                const qtyBoughtToday = todayBuys.reduce((sum, o) => sum + (o.quantity - o.remaining_quantity), 0);
                const sellable = holding.quantity - qtyBoughtToday;
                if (qtyToTrade > sellable) {
                    await t.rollback();
                    return {
                        EM: `Quy tắc T+2 đang bật. Không thể bán CP mua hôm nay. Có thể bán tối đa: ${Math.max(0, sellable)} CP.`,
                        EC: -1, DT: ''
                    };
                }
            }

            // Đóng băng cổ phiếu (giảm holding.quantity khả dụng = tạo holding "chờ bán")
            await holding.update({ quantity: holding.quantity - qtyToTrade }, { transaction: t });
        }

        // 5. Tạo lệnh ở trạng thái PENDING
        const newOrder = await db.Order.create({
            user_id: userId,
            stock_id: stock.id,
            symbol: symbol.toUpperCase(),
            side: side,
            order_type: type || 'LO',
            price: tradePrice,
            quantity: qtyToTrade,
            remaining_quantity: qtyToTrade,
            status: 'PENDING'
        }, { transaction: t });

        // Tạo lịch sử đặt lệnh
        const sideText = side === 'BUY' ? 'MUA' : 'BÁN';
        const priceText = (type && type !== 'LO') ? type : `${tradePrice.toLocaleString('vi-VN')} ₫`;
        await db.UserHistory.create({
            user_id: userId,
            field_name: symbol.toUpperCase(),
            old_value: '',
            new_value: `Đặt thành công lệnh ${sideText} ${qtyToTrade} CP ${symbol.toUpperCase()} với giá ${priceText}`,
            change_type: 'ORDER_PLACE'
        }, { transaction: t });

        await t.commit();
        return {
            EM: `Đặt lệnh ${side === 'BUY' ? 'MUA' : 'BÁN'} thành công! Lệnh đang chờ khớp với giá ${tradePrice.toLocaleString('vi-VN')} × ${qtyToTrade} CP.`,
            EC: 0,
            DT: newOrder
        };

    } catch (e) {
        await t.rollback();
        console.error('[placeOrder] Error:', e);
        return { EM: 'Lỗi hệ thống khi đặt lệnh', EC: -2, DT: '' };
    }
};

/**
 * Lấy danh sách lệnh của người dùng — bao gồm lịch sử khớp (Trades) + thông tin mã CP
 */
const getUserOrders = async (userId, { page = 1, limit = 20, status, startDate, endDate } = {}) => {
    try {
        const where = { user_id: userId };
        if (status) where.status = status;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                const start = new Date(`${startDate}T00:00:00`);
                where.createdAt[db.Sequelize.Op.gte] = start;
            }
            if (endDate) {
                const end = new Date(`${endDate}T23:59:59.999`);
                where.createdAt[db.Sequelize.Op.lte] = end;
            }
        }

        const offset = (page - 1) * limit;
        const { count, rows } = await db.Order.findAndCountAll({
            where,
            include: [
                {
                    model: db.Trade,
                    as: 'trades',
                    attributes: ['id', 'price', 'quantity', 'fee_amount', 'matched_at'],
                    required: false
                },
                {
                    model: db.Stock,
                    as: 'stock',
                    attributes: ['symbol', 'company_name', 'exchange'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset,
            distinct: true // Tránh count bị nhân đôi do join
        });

        return {
            EM: 'Lấy danh sách lệnh thành công',
            EC: 0,
            DT: {
                orders: rows,
                totalRows: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page)
            }
        };
    } catch (e) {
        console.error('[getUserOrders] Error:', e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

/**
 * Hủy lệnh đang chờ — hoàn trả tiền/cổ phiếu đã đóng băng
 */
const cancelOrder = async (orderId, userId) => {
    const t = await db.sequelize.transaction();
    try {
        const order = await db.Order.findOne({ where: { id: orderId, user_id: userId }, transaction: t });
        if (!order) {
            await t.rollback();
            return { EM: 'Lệnh không tồn tại hoặc không thuộc về bạn.', EC: -1, DT: '' };
        }
        if (order.status !== 'PENDING' && order.status !== 'PARTIAL_MATCHED') {
            await t.rollback();
            return { EM: `Không thể hủy lệnh ở trạng thái ${order.status}.`, EC: -1, DT: '' };
        }

        const wallet = await db.Wallet.findOne({ where: { user_id: userId }, transaction: t });
        const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
        const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;

        if (order.side === 'BUY') {
            // Hoàn tiền đóng băng tương ứng phần còn lại chưa khớp
            const remainingAmount = parseFloat(order.price) * order.remaining_quantity;
            const remainingFee = remainingAmount * (baseFeePct / 100);
            const refundAmount = remainingAmount + remainingFee;
            const newFrozen = Math.max(0, parseFloat(wallet.frozen_balance) - refundAmount);
            await wallet.update({ frozen_balance: newFrozen }, { transaction: t });

        } else if (order.side === 'SELL') {
            // Hoàn cổ phiếu chưa bán được về Holding
            const stock = await db.Stock.findOne({ where: { symbol: order.symbol }, transaction: t });
            if (stock) {
                let holding = await db.Holding.findOne({ where: { user_id: userId, stock_id: stock.id }, transaction: t });
                if (holding) {
                    await holding.update({ quantity: holding.quantity + order.remaining_quantity }, { transaction: t });
                } else {
                    await db.Holding.create({
                        user_id: userId, stock_id: stock.id,
                        quantity: order.remaining_quantity,
                        average_price: parseFloat(order.price),
                        currentPrice: parseFloat(order.price),
                        totalValue: order.remaining_quantity * parseFloat(order.price)
                    }, { transaction: t });
                }
            }
        }

        await order.update({ status: 'CANCELLED' }, { transaction: t });

        // Tạo lịch sử hủy lệnh
        const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
        await db.UserHistory.create({
            user_id: userId,
            field_name: order.symbol,
            old_value: '',
            new_value: `Đã hủy thành công lệnh ${sideText} ${order.remaining_quantity} CP ${order.symbol}`,
            change_type: 'ORDER_CANCEL'
        }, { transaction: t });

        await t.commit();
        return { EM: 'Hủy lệnh thành công. Tiền/cổ phiếu đã được hoàn trả.', EC: 0, DT: order };

    } catch (e) {
        await t.rollback();
        console.error('[cancelOrder] Error:', e);
        return { EM: 'Lỗi hệ thống khi hủy lệnh', EC: -1, DT: '' };
    }
};

/**
 * Lấy danh mục cổ phiếu của người dùng (Holdings) — bao gồm thông tin mã CP
 */
const getUserHoldings = async (userId) => {
    try {
        const holdings = await db.Holding.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: db.Stock,
                    as: 'stock',
                    attributes: ['symbol', 'company_name', 'exchange']
                }
            ]
        });

        // Lấy giá thị trường thời gian thực cho từng cổ phiếu từ Python FastAPI để đồng bộ 100% với bảng điện
        const enrichedHoldings = await Promise.all(holdings.map(async (holding) => {
            const h = holding.get({ plain: true });
            if (h.stock && h.stock.symbol) {
                try {
                    const response = await axios.get(PYTHON_API.STOCK(h.stock.symbol), { timeout: 3000 });
                    const responseData = response.data;
                    const stockData = responseData && responseData.data ? responseData.data : responseData;
                    
                    if (stockData) {
                        const rawPrice = stockData.matchPrice || stockData.match_price || stockData.refPrice || 0;
                        if (rawPrice > 0) {
                            h.currentPrice = rawPrice;
                            h.totalValue = h.quantity * rawPrice;
                        }
                    }
                } catch (err) {
                    console.warn(`[getUserHoldings] Không lấy được giá trực tiếp cho ${h.stock.symbol}:`, err.message);
                }
            }
            return h;
        }));

        // Sắp xếp theo totalValue giảm dần sau khi đã cập nhật giá mới nhất
        enrichedHoldings.sort((a, b) => parseFloat(b.totalValue || 0) - parseFloat(a.totalValue || 0));

        return { EM: 'Lấy danh mục thành công', EC: 0, DT: enrichedHoldings };
    } catch (e) {
        console.error('[getUserHoldings] Error:', e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

export default { placeOrder, getUserOrders, cancelOrder, getUserHoldings };
