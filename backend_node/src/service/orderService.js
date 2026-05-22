import db from "../models";
import axios from "axios";
import PYTHON_API from "../config/pythonApi.js";

/**
 * Chuyển Date sang chuỗi YYYY-MM-DD chuẩn múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */
const getVietnamDateString = (date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const [{ value: month },,{ value: day },,{ value: year }] = formatter.formatToParts(date);
    return `${year}-${month}-${day}`;
};

/**
 * Đếm số ngày giao dịch (loại trừ thứ 7, Chủ Nhật) giữa 2 mốc thời gian
 */
const getTradingDaysElapsed = (startDate, endDate) => {
    const startStr = getVietnamDateString(startDate);
    const endStr = getVietnamDateString(endDate);
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    let count = 0;
    const cur = new Date(start);
    while (cur < end) {
        cur.setDate(cur.getDate() + 1);
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
            count++;
        }
    }
    return count;
};

/**
 * Kiểm tra một giao dịch mua đã hoàn tất thanh toán theo quy tắc T+2.5 chưa
 */
const isTradeCleared = (matchedAt, now = new Date()) => {
    const elapsed = getTradingDaysElapsed(matchedAt, now);
    if (elapsed >= 3) return true;
    if (elapsed === 2) {
        // Cần sau 13:00 (1:00 chiều) giờ Việt Nam
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour12: false,
            hour: '2-digit'
        });
        const hour = parseInt(formatter.format(now));
        return hour >= 13;
    }
    return false;
};

/**
 * Tính số lượng cổ phiếu khả dụng để bán của người dùng
 */
const getSellableQtyHelper = async (userId, symbol, holdingQty, transaction = null) => {
    try {
        const t0Setting = await db.Setting.findOne({ 
            where: { key: 'enable_t0_trading' }, 
            transaction 
        });
        const enableT0 = t0Setting ? t0Setting.value === 'true' : true;
        if (enableT0) {
            return holdingQty;
        }

        // Tối ưu hóa: Chỉ lấy các giao dịch khớp mua trong vòng 7 ngày qua (đủ bao quát T+2.5 cả cuối tuần)
        const cutoffForFetch = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const buyTrades = await db.Trade.findAll({
            include: [{
                model: db.Order,
                as: 'order',
                where: {
                    user_id: userId,
                    symbol: symbol.toUpperCase(),
                    side: 'BUY'
                }
            }],
            where: {
                matched_at: {
                    [db.Sequelize.Op.gt]: cutoffForFetch
                }
            },
            transaction
        });

        let unclearedQty = 0;
        const now = new Date();
        for (const trade of buyTrades) {
            if (!isTradeCleared(trade.matched_at, now)) {
                unclearedQty += parseInt(trade.quantity);
            }
        }

        return Math.max(0, holdingQty - unclearedQty);
    } catch (err) {
        console.error('[getSellableQtyHelper] Error:', err);
        return holdingQty;
    }
};

/**
 * Cập nhật tổng vốn đầu tư (total_invested) trong ví của người dùng
 */
const updateWalletTotalInvested = async (userId, transaction = null) => {
    try {
        const holdings = await db.Holding.findAll({
            where: { user_id: userId },
            transaction
        });
        const total = holdings.reduce((sum, h) => {
            return sum + (parseFloat(h.quantity) * parseFloat(h.average_price));
        }, 0);

        await db.Wallet.update(
            { total_invested: total },
            { where: { user_id: userId }, transaction }
        );
    } catch (err) {
        console.error('[updateWalletTotalInvested] Error:', err);
    }
};

/**
 * Đặt lệnh mới — tạo trạng thái PENDING, đóng băng tiền/cổ phiếu
 */
const placeOrder = async (orderData) => {
    const t = await db.sequelize.transaction();
    try {
        const { userId, symbol, quantity, price, side, type, isAdmin } = orderData;
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

        // Kiểm tra bước giá (Tick Size) đối với lệnh LO
        if (type === 'LO') {
            const currentExchange = (stock.exchange || 'HOSE').toUpperCase();
            let tickSize = 100; // Mặc định cho HNX / UPCOM là 100 ₫
            
            if (currentExchange === 'HOSE') {
                if (tradePrice < 10000) {
                    tickSize = 10;
                } else if (tradePrice < 50000) {
                    tickSize = 50;
                } else {
                    tickSize = 100;
                }
            }
            
            const priceInt = Math.round(tradePrice);
            const tickInt = Math.round(tickSize);
            
            if (priceInt % tickInt !== 0) {
                await t.rollback();
                return { 
                    EM: `Giá đặt ${tradePrice.toLocaleString('vi-VN')} ₫ không hợp lệ. Với sàn ${currentExchange} ở mức giá này, bước giá phải là bội số của ${tickSize} ₫.`, 
                    EC: -1, 
                    DT: '' 
                };
            }
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

        let calculatedAdvanceFee = 0;
        if (side === 'BUY') {
            // Sức mua khả dụng bao gồm Tiền mặt khả dụng + Tiền bán chờ về
            const availableCash = parseFloat(wallet.balance) - parseFloat(wallet.frozen_balance);
            const pendingCash = parseFloat(wallet.pending_cash || 0);
            const buyingPower = availableCash + pendingCash;

            if (buyingPower < totalRequired) {
                await t.rollback();
                return {
                    EM: `Sức mua không đủ. Cần: ${totalRequired.toLocaleString('vi-VN')} ₫ (gồm phí), Sức mua khả dụng (gồm tiền chờ về): ${buyingPower.toLocaleString('vi-VN')} ₫.`,
                    EC: -1, DT: ''
                };
            }

            // Nếu tiền mặt khả dụng không đủ, thực hiện ứng trước tiền bán
            if (availableCash < totalRequired) {
                const advanceAmount = totalRequired - availableCash;
                const rateSetting = await db.Setting.findOne({ where: { key: 'cash_advance_rate' }, transaction: t });
                const advanceRatePct = rateSetting ? parseFloat(rateSetting.value) : 0.038;
                calculatedAdvanceFee = advanceAmount * (advanceRatePct / 100) * 2;
            }

            const finalRequired = totalRequired + calculatedAdvanceFee;

            if (buyingPower < finalRequired) {
                await t.rollback();
                return {
                    EM: `Sức mua không đủ sau khi tính phí ứng trước. Cần ứng: ${(totalRequired - availableCash).toLocaleString('vi-VN')} ₫, Phí ứng trước (2 ngày): ${calculatedAdvanceFee.toLocaleString('vi-VN')} ₫. Tổng sức mua cần: ${finalRequired.toLocaleString('vi-VN')} ₫, Có: ${buyingPower.toLocaleString('vi-VN')} ₫.`,
                    EC: -1, DT: ''
                };
            }

            // Đóng băng số tiền (gồm phí ứng trước nếu có)
            await wallet.update({ frozen_balance: parseFloat(wallet.frozen_balance) + finalRequired }, { transaction: t });

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

            // Kiểm tra quy tắc T+0 / T+2.5
            const sellable = await getSellableQtyHelper(userId, symbol, holding.quantity, t);
            if (qtyToTrade > sellable) {
                await t.rollback();
                return {
                    EM: `Quy tắc T+2.5 đang bật. Không thể bán cổ phiếu chưa đủ thời gian thanh toán. Số lượng có thể bán tối đa: ${sellable} CP.`,
                    EC: -1, DT: ''
                };
            }

            // Đóng băng cổ phiếu (giảm holding.quantity khả dụng = tạo holding "chờ bán")
            await holding.update({ quantity: holding.quantity - qtyToTrade }, { transaction: t });
            await updateWalletTotalInvested(userId, t);
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
            status: 'PENDING',
            advance_fee: calculatedAdvanceFee
        }, { transaction: t });

        // Tạo lịch sử đặt lệnh
        const sideText = side === 'BUY' ? 'MUA' : 'BÁN';
        const priceText = (type && type !== 'LO') ? type : `${tradePrice.toLocaleString('vi-VN')} ₫`;
        await db.UserHistory.create({
            user_id: userId,
            field_name: symbol.toUpperCase(),
            old_value: '',
            new_value: isAdmin
                ? `Admin đã đặt lệnh ${sideText} hộ bạn: ${qtyToTrade} CP ${symbol.toUpperCase()} với giá ${priceText}`
                : `Đặt thành công lệnh ${sideText} ${qtyToTrade} CP ${symbol.toUpperCase()} với giá ${priceText}`,
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
const cancelOrder = async (orderId, userId, isAdmin = false) => {
    const t = await db.sequelize.transaction();
    try {
        const order = await db.Order.findOne({
            where: isAdmin ? { id: orderId } : { id: orderId, user_id: userId },
            transaction: t
        });
        if (!order) {
            await t.rollback();
            return { EM: isAdmin ? 'Lệnh không tồn tại.' : 'Lệnh không tồn tại hoặc không thuộc về bạn.', EC: -1, DT: '' };
        }
        if (order.status !== 'PENDING' && order.status !== 'PARTIAL_MATCHED') {
            await t.rollback();
            return { EM: `Không thể hủy lệnh ở trạng thái ${order.status}.`, EC: -1, DT: '' };
        }

        const actualUserId = order.user_id;
        const wallet = await db.Wallet.findOne({ where: { user_id: actualUserId }, transaction: t });
        const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
        const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;

        if (order.side === 'BUY') {
            // Hoàn tiền đóng băng tương ứng phần còn lại chưa khớp (gồm cả phí ứng trước tỷ lệ nếu có)
            const remainingAmount = parseFloat(order.price) * order.remaining_quantity;
            const remainingFee = remainingAmount * (baseFeePct / 100);
            const remainingAdvanceFee = order.advance_fee ? (order.remaining_quantity / order.quantity) * parseFloat(order.advance_fee) : 0;
            const refundAmount = remainingAmount + remainingFee + remainingAdvanceFee;
            
            const newFrozen = Math.max(0, parseFloat(wallet.frozen_balance) - refundAmount);
            await wallet.update({ frozen_balance: newFrozen }, { transaction: t });

        } else if (order.side === 'SELL') {
            // Hoàn cổ phiếu chưa bán được về Holding
            const stock = await db.Stock.findOne({ where: { symbol: order.symbol }, transaction: t });
            if (stock) {
                let holding = await db.Holding.findOne({ where: { user_id: actualUserId, stock_id: stock.id }, transaction: t });
                if (holding) {
                    await holding.update({ quantity: holding.quantity + order.remaining_quantity }, { transaction: t });
                } else {
                    await db.Holding.create({
                        user_id: actualUserId, stock_id: stock.id,
                        quantity: order.remaining_quantity,
                        average_price: parseFloat(order.price),
                        currentPrice: parseFloat(order.price),
                        totalValue: order.remaining_quantity * parseFloat(order.price)
                    }, { transaction: t });
                }
                await updateWalletTotalInvested(actualUserId, t);
            }
        }

        await order.update({ status: 'CANCELLED' }, { transaction: t });

        // Tạo lịch sử hủy lệnh
        const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
        await db.UserHistory.create({
            user_id: actualUserId,
            field_name: order.symbol,
            old_value: '',
            new_value: isAdmin 
                ? `Admin đã hủy lệnh ${sideText} ${order.remaining_quantity} CP ${order.symbol}`
                : `Đã hủy thành công lệnh ${sideText} ${order.remaining_quantity} CP ${order.symbol}`,
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
            where: { 
                user_id: userId,
                quantity: { [db.Sequelize.Op.gt]: 0 }
            },
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

                // Tính toán số lượng cổ phiếu khả dụng để bán
                h.sellableQuantity = await getSellableQtyHelper(userId, h.stock.symbol, h.quantity);
            } else {
                h.sellableQuantity = h.quantity;
            }
            return h;
        }));

        // Sắp xếp theo thời gian giao dịch/cập nhật mới nhất (updatedAt) giảm dần
        enrichedHoldings.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return { EM: 'Lấy danh mục thành công', EC: 0, DT: enrichedHoldings };
    } catch (e) {
        console.error('[getUserHoldings] Error:', e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

/**
 * Sửa lệnh đang chờ (Giá hoặc Khối lượng - không được cả hai cùng lúc)
 */
const modifyOrder = async (orderId, userId, { newPrice, newQuantity }, isAdmin = false) => {
    // 1. Kiểm tra không được sửa đồng thời cả 2
    if (newPrice !== undefined && newQuantity !== undefined) {
        return { EM: 'Không được phép sửa đồng thời cả Giá và Khối lượng cùng lúc.', EC: -1, DT: '' };
    }
    if (newPrice === undefined && newQuantity === undefined) {
        return { EM: 'Vui lòng cung cấp Giá mới hoặc Khối lượng mới để sửa.', EC: -1, DT: '' };
    }

    const t = await db.sequelize.transaction();
    try {
        // 2. Lấy lệnh cần sửa
        const order = await db.Order.findOne({
            where: isAdmin ? { id: orderId } : { id: orderId, user_id: userId },
            include: [{ model: db.Stock, as: 'stock' }],
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return { EM: isAdmin ? 'Lệnh không tồn tại.' : 'Lệnh không tồn tại hoặc không thuộc về bạn.', EC: -1, DT: '' };
        }

        if (order.status !== 'PENDING' && order.status !== 'PARTIAL_MATCHED') {
            await t.rollback();
            return { EM: `Không thể sửa lệnh ở trạng thái ${order.status}.`, EC: -1, DT: '' };
        }

        const actualUserId = order.user_id;
        const stock = order.stock;
        if (!stock || !stock.is_active) {
            await t.rollback();
            return { EM: 'Cổ phiếu này hiện đang tạm dừng hoặc không hoạt động.', EC: -1, DT: '' };
        }

        const oldPrice = parseFloat(order.price);
        const oldQuantity = parseInt(order.quantity);
        const matchedQuantity = oldQuantity - parseInt(order.remaining_quantity);

        let finalPrice = oldPrice;
        let finalQuantity = oldQuantity;

        if (newPrice !== undefined) {
            finalPrice = parseFloat(newPrice);
            if (isNaN(finalPrice) || finalPrice <= 0) {
                await t.rollback();
                return { EM: 'Giá mới phải là số dương hợp lệ.', EC: -1, DT: '' };
            }

            // Kiểm tra Tick Size đối với LO
            if (order.order_type === 'LO') {
                const currentExchange = (stock.exchange || 'HOSE').toUpperCase();
                let tickSize = 100;
                if (currentExchange === 'HOSE') {
                    if (finalPrice < 10000) {
                        tickSize = 10;
                    } else if (finalPrice < 50000) {
                        tickSize = 50;
                    } else {
                        tickSize = 100;
                    }
                }
                const priceInt = Math.round(finalPrice);
                const tickInt = Math.round(tickSize);
                if (priceInt % tickInt !== 0) {
                    await t.rollback();
                    return {
                        EM: `Giá đặt ${finalPrice.toLocaleString('vi-VN')} ₫ không hợp lệ. Với sàn ${currentExchange} ở mức giá này, bước giá phải là bội số của ${tickSize} ₫.`,
                        EC: -1,
                        DT: ''
                    };
                }
            }
        }

        if (newQuantity !== undefined) {
            finalQuantity = parseInt(newQuantity);
            if (isNaN(finalQuantity) || finalQuantity <= 0) {
                await t.rollback();
                return { EM: 'Khối lượng mới phải là số nguyên dương hợp lệ.', EC: -1, DT: '' };
            }

            // Số lượng mới phải lớn hơn số đã khớp
            if (finalQuantity <= matchedQuantity) {
                await t.rollback();
                return { EM: `Khối lượng mới (${finalQuantity}) phải lớn hơn khối lượng đã khớp (${matchedQuantity} CP).`, EC: -1, DT: '' };
            }

            // Kiểm tra lô chẵn / lẻ
            if (finalQuantity >= 100 && finalQuantity % 100 !== 0) {
                await t.rollback();
                return { EM: 'Khối lượng chẵn (từ 100 CP trở lên) phải là bội số của 100.', EC: -1, DT: '' };
            }
        }

        const newRemainingQuantity = finalQuantity - matchedQuantity;

        // 3. Tính toán lại phong tỏa (Wallet / Holding adjustments)
        const wallet = await db.Wallet.findOne({ where: { user_id: actualUserId }, transaction: t });
        const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
        const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;

        if (order.side === 'BUY') {
            // Tính số tiền cần đóng băng trước đó
            const oldTotalRequired = oldQuantity * oldPrice * (1 + baseFeePct / 100) + parseFloat(order.advance_fee || 0);

            // Tính số tiền mới cần đóng băng cho cả lệnh
            const newTradeAmount = finalQuantity * finalPrice;
            const newEstimatedFee = newTradeAmount * (baseFeePct / 100);
            const newTotalRequired = newTradeAmount + newEstimatedFee;

            // Tính toán lại Phí ứng trước (nếu cần)
            const availableCash = parseFloat(wallet.balance) - parseFloat(wallet.frozen_balance) + oldTotalRequired; // Hoàn lại tạm thời tiền đóng băng cũ để tính sức mua
            const pendingCash = parseFloat(wallet.pending_cash || 0);
            const buyingPower = availableCash + pendingCash;

            if (buyingPower < newTotalRequired) {
                await t.rollback();
                return {
                    EM: `Sức mua không đủ để sửa lệnh. Cần: ${newTotalRequired.toLocaleString('vi-VN')} ₫, Sức mua khả dụng: ${buyingPower.toLocaleString('vi-VN')} ₫.`,
                    EC: -1, DT: ''
                };
            }

            let newAdvanceFee = 0;
            if (availableCash < newTotalRequired) {
                const advanceAmount = newTotalRequired - availableCash;
                const rateSetting = await db.Setting.findOne({ where: { key: 'cash_advance_rate' }, transaction: t });
                const advanceRatePct = rateSetting ? parseFloat(rateSetting.value) : 0.038;
                newAdvanceFee = advanceAmount * (advanceRatePct / 100) * 2;
            }

            const finalNewRequired = newTotalRequired + newAdvanceFee;

            if (buyingPower < finalNewRequired) {
                await t.rollback();
                return {
                    EM: `Sức mua không đủ sau khi tính phí ứng trước mới. Tổng cần: ${finalNewRequired.toLocaleString('vi-VN')} ₫.`,
                    EC: -1, DT: ''
                };
            }

            // Cập nhật lại frozen_balance trong Wallet
            const diff = finalNewRequired - oldTotalRequired;
            await wallet.update({
                frozen_balance: parseFloat(wallet.frozen_balance) + diff
            }, { transaction: t });

            // Cập nhật lệnh
            await order.update({
                price: finalPrice,
                quantity: finalQuantity,
                remaining_quantity: newRemainingQuantity,
                advance_fee: newAdvanceFee
            }, { transaction: t });

        } else if (order.side === 'SELL') {
            // Đối với lệnh bán
            const holding = await db.Holding.findOne({ where: { user_id: actualUserId, stock_id: stock.id }, transaction: t });
            const diffQty = newRemainingQuantity - parseInt(order.remaining_quantity);

            if (diffQty > 0) {
                // Kiểm tra quy tắc T+2.5 đối với phần tăng thêm
                const sellable = await getSellableQtyHelper(actualUserId, stock.symbol, holding.quantity, t);
                if (diffQty > sellable) {
                    await t.rollback();
                    return {
                        EM: `Quy tắc T+2.5 đang bật. Không thể bán cổ phiếu chưa đủ thời gian thanh toán. Số lượng tăng thêm có thể bán tối đa: ${sellable} CP.`,
                        EC: -1, DT: ''
                    };
                }

                if (holding.quantity < diffQty) {
                    await t.rollback();
                    return {
                        EM: `Số lượng cổ phiếu ${stock.symbol} trong danh mục khả dụng không đủ để tăng lệnh bán.`,
                        EC: -1, DT: ''
                    };
                }
                await holding.update({ quantity: holding.quantity - diffQty }, { transaction: t });
            } else if (diffQty < 0) {
                // Giảm khối lượng bán ➔ Hoàn lại cổ phiếu vào Holding khả dụng
                await holding.update({ quantity: holding.quantity + Math.abs(diffQty) }, { transaction: t });
            }

            // Cập nhật lệnh
            await order.update({
                price: finalPrice,
                quantity: finalQuantity,
                remaining_quantity: newRemainingQuantity
            }, { transaction: t });

            await updateWalletTotalInvested(actualUserId, t);
        }

        // 4. Tạo lịch sử sửa lệnh
        const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
        const changeDesc = newPrice !== undefined
            ? `Thay đổi Giá từ ${oldPrice.toLocaleString('vi-VN')} ₫ sang ${finalPrice.toLocaleString('vi-VN')} ₫`
            : `Thay đổi Khối lượng từ ${oldQuantity} CP sang ${finalQuantity} CP (Còn lại ${newRemainingQuantity} CP)`;

        await db.UserHistory.create({
            user_id: actualUserId,
            field_name: stock.symbol,
            old_value: '',
            new_value: isAdmin
                ? `Admin đã sửa lệnh ${sideText} ${stock.symbol}: ${changeDesc}`
                : `Đã sửa lệnh ${sideText} ${stock.symbol}: ${changeDesc}`,
            change_type: 'ORDER_MODIFY'
        }, { transaction: t });

        await t.commit();
        return { EM: 'Sửa lệnh thành công!', EC: 0, DT: order };

    } catch (e) {
        await t.rollback();
        console.error('[modifyOrder] Error:', e);
        return { EM: 'Lỗi hệ thống khi sửa lệnh', EC: -1, DT: '' };
    }
};

export default { placeOrder, getUserOrders, cancelOrder, getUserHoldings, modifyOrder, getSellableQtyHelper };
