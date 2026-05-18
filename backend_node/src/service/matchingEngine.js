/**
 * matchingEngine.js
 * Background job — Chạy mỗi 10 giây để kiểm tra giá thực tế và khớp lệnh PENDING.
 * Logic:
 *   - Lô chẵn (>=100 CP): khớp dựa theo matchVolume từ API thị trường
 *   - Lô lẻ (<100 CP): chỉ cần matchPrice trùng giá lệnh → khớp toàn bộ KL luôn
 */

import axios from "axios";
import db from "../models/index.js";
import PYTHON_API from "../config/pythonApi.js";

const POLL_INTERVAL_MS = 10000; // 10 giây
const ODD_LOT_THRESHOLD = 100;  // Lô lẻ là < 100 CP

let engineRunning = false;

const runMatchingCycle = async () => {
    if (engineRunning) return; // Prevent overlapping cycles
    engineRunning = true;

    try {
        // Lấy tất cả lệnh đang chờ khớp
        const pendingOrders = await db.Order.findAll({
            where: {
                status: { [db.Sequelize.Op.in]: ['PENDING', 'PARTIAL_MATCHED'] }
            }
        });

        if (pendingOrders.length === 0) {
            engineRunning = false;
            return;
        }

        // Nhóm theo symbol để gọi API mỗi mã 1 lần
        const symbolMap = {};
        for (const order of pendingOrders) {
            if (!symbolMap[order.symbol]) symbolMap[order.symbol] = [];
            symbolMap[order.symbol].push(order);
        }

        // Xử lý từng mã cổ phiếu
        for (const symbol of Object.keys(symbolMap)) {
            try {
                const response = await axios.get(PYTHON_API.STOCK(symbol), { timeout: 5000 });
                const responseData = response.data;
                const stockData = responseData && responseData.data ? responseData.data : responseData;

                // matchPrice từ API (giữ nguyên đơn vị VNĐ để khớp chính xác với order.price)
                const rawMatchPrice = stockData.matchPrice || stockData.match_price || 0;
                const matchPrice = rawMatchPrice;
                const matchVolume = stockData.matchVolume || stockData.match_volume || stockData.matchVol || 0;

                if (matchPrice <= 0) continue;

                // Xử lý từng lệnh của mã này
                for (const order of symbolMap[symbol]) {
                    await processOrder(order, matchPrice, matchVolume);
                }

            } catch (apiErr) {
                // Nếu không lấy được giá, bỏ qua mã này, thử lần sau
                console.warn(`[MatchingEngine] Không lấy được giá cho ${symbol}:`, apiErr.message);
            }
        }

    } catch (e) {
        console.error('[MatchingEngine] Lỗi chu kỳ:', e);
    } finally {
        engineRunning = false;
    }
};

/**
 * Xử lý khớp lệnh cho một lệnh cụ thể
 */
const processOrder = async (order, matchPrice, matchVolume) => {
    const orderPrice = parseFloat(order.price);
    const isOddLot = order.quantity < ODD_LOT_THRESHOLD;

    // Kiểm tra điều kiện giá có thể khớp
    const priceMatches = order.side === 'BUY'
        ? matchPrice <= orderPrice   // Mua: khớp khi giá thị trường <= giá lệnh
        : matchPrice >= orderPrice;  // Bán: khớp khi giá thị trường >= giá lệnh

    if (!priceMatches) return;

    // Tính KL có thể khớp trong lần này
    let fillQty;
    if (isOddLot) {
        // Lô lẻ: khớp hết toàn bộ remaining_quantity luôn
        fillQty = order.remaining_quantity;
    } else {
        // Lô chẵn: khớp tối đa theo matchVolume thị trường.
        // Để tránh việc matchVolume từ API bằng 0 làm kẹt lệnh chẵn của người dùng,
        // ta sẽ mặc định coi như khối lượng thị trường đủ để khớp hết nếu matchVolume bằng 0 hoặc không có.
        let effectiveMatchVolume = matchVolume;
        if (!effectiveMatchVolume || effectiveMatchVolume <= 0) {
            effectiveMatchVolume = order.remaining_quantity;
        }
        fillQty = Math.min(order.remaining_quantity, effectiveMatchVolume);
        if (fillQty <= 0) return;
    }

    const t = await db.sequelize.transaction();
    try {
        const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
        const taxSetting = await db.Setting.findOne({ where: { key: 'income_tax' }, transaction: t });
        const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;
        const taxPct = taxSetting ? parseFloat(taxSetting.value) : 0.10;

        const fillAmount = fillQty * matchPrice; // Dùng giá khớp thực tế
        const feeAmount = fillAmount * (baseFeePct / 100);

        const wallet = await db.Wallet.findOne({ where: { user_id: order.user_id }, transaction: t });
        const stock = await db.Stock.findOne({ where: { symbol: order.symbol }, transaction: t });

        // Cập nhật số lượng còn lại của lệnh
        const newRemaining = order.remaining_quantity - fillQty;
        const newStatus = newRemaining === 0 ? 'MATCHED' : 'PARTIAL_MATCHED';

        await order.update({
            remaining_quantity: newRemaining,
            status: newStatus
        }, { transaction: t });

        // Tạo bản ghi Trade
        await db.Trade.create({
            order_id: order.id,
            price: matchPrice,
            quantity: fillQty,
            fee_amount: feeAmount,
            matched_at: new Date()
        }, { transaction: t });

        if (order.side === 'BUY') {
            // Tính tiền thực tế phải trả (theo giá khớp, không phải giá lệnh)
            const actualCost = fillAmount + feeAmount;

            // Phần đã đóng băng theo giá lệnh (để giải phóng đúng lượng)
            const frozenForFill = fillQty * orderPrice * (1 + baseFeePct / 100);

            // Trừ tiền balance thực tế, giải phóng frozen tương ứng
            const newBalance = parseFloat(wallet.balance) - actualCost;
            const newFrozen = Math.max(0, parseFloat(wallet.frozen_balance) - frozenForFill);

            await wallet.update({ balance: newBalance, frozen_balance: newFrozen }, { transaction: t });

            // Cập nhật / Tạo Holding
            let holding = await db.Holding.findOne({ where: { user_id: order.user_id, stock_id: stock.id }, transaction: t });
            if (!holding) {
                await db.Holding.create({
                    user_id: order.user_id, stock_id: stock.id,
                    quantity: fillQty, average_price: matchPrice,
                    currentPrice: matchPrice, totalValue: fillAmount
                }, { transaction: t });
            } else {
                const newQty = holding.quantity + fillQty;
                const newAvg = ((parseFloat(holding.average_price) * holding.quantity) + fillAmount) / newQty;
                await holding.update({
                    quantity: newQty, average_price: newAvg,
                    currentPrice: matchPrice, totalValue: newQty * matchPrice
                }, { transaction: t });
            }

        } else if (order.side === 'SELL') {
            // Cộng tiền bán về (trừ phí + thuế)
            const taxAmount = fillAmount * (taxPct / 100);
            const earned = fillAmount - feeAmount - taxAmount;
            await wallet.update({ balance: parseFloat(wallet.balance) + earned }, { transaction: t });
            // Holding đã bị trừ khi đặt lệnh, không cần trừ thêm
        }

        // Tạo lịch sử khớp lệnh
        const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
        const matchStatusText = newStatus === 'MATCHED' ? 'Khớp hoàn toàn' : 'Khớp một phần';
        const changeType = newStatus === 'MATCHED' ? 'ORDER_MATCH' : 'ORDER_PARTIAL_MATCH';
        await db.UserHistory.create({
            user_id: order.user_id,
            field_name: order.symbol,
            old_value: '',
            new_value: `${matchStatusText} lệnh ${sideText}: Đã khớp ${fillQty} CP ${order.symbol} với giá ${matchPrice.toLocaleString('vi-VN')} ₫`,
            change_type: changeType
        }, { transaction: t });

        await t.commit();
        console.log(`[MatchingEngine] ✅ Khớp ${fillQty} CP ${order.symbol} @ ${matchPrice} | Order #${order.id} → ${newStatus}`);

    } catch (e) {
        await t.rollback();
        console.error(`[MatchingEngine] Lỗi khi xử lý lệnh #${order.id}:`, e);
    }
};

/**
 * Hàm tự hủy lệnh cuối ngày (gọi khi đóng cửa)
 */
const cancelExpiredOrders = async () => {
    const t = await db.sequelize.transaction();
    try {
        const expiredOrders = await db.Order.findAll({
            where: { status: { [db.Sequelize.Op.in]: ['PENDING', 'PARTIAL_MATCHED'] } },
            transaction: t
        });

        for (const order of expiredOrders) {
            const wallet = await db.Wallet.findOne({ where: { user_id: order.user_id }, transaction: t });
            const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
            const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;

            if (order.side === 'BUY' && wallet) {
                // Hoàn tiền đóng băng phần còn lại
                const refund = order.remaining_quantity * parseFloat(order.price) * (1 + baseFeePct / 100);
                await wallet.update({ frozen_balance: Math.max(0, parseFloat(wallet.frozen_balance) - refund) }, { transaction: t });
            } else if (order.side === 'SELL') {
                // Hoàn cổ phiếu lại
                const stock = await db.Stock.findOne({ where: { symbol: order.symbol }, transaction: t });
                if (stock) {
                    const holding = await db.Holding.findOne({ where: { user_id: order.user_id, stock_id: stock.id }, transaction: t });
                    if (holding) {
                        await holding.update({ quantity: holding.quantity + order.remaining_quantity }, { transaction: t });
                    }
                }
            }

            await order.update({ status: 'CANCELLED' }, { transaction: t });

            // Lịch sử tự động hủy lệnh hết hạn cuối ngày
            const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
            await db.UserHistory.create({
                user_id: order.user_id,
                field_name: order.symbol,
                old_value: '',
                new_value: `Lệnh hết hạn cuối ngày: Đã tự động hủy lệnh ${sideText} ${order.remaining_quantity} CP ${order.symbol}`,
                change_type: 'ORDER_EXPIRED_CANCEL'
            }, { transaction: t });
        }

        await t.commit();
        if (expiredOrders.length > 0) {
            console.log(`[MatchingEngine] 🔒 Đóng phiên: Đã hủy ${expiredOrders.length} lệnh chưa khớp, hoàn trả tiền/CP.`);
        }
    } catch (e) {
        await t.rollback();
        console.error('[MatchingEngine] Lỗi khi hủy lệnh cuối ngày:', e);
    }
};

/**
 * Tự động kiểm tra và thêm cột is_read vào bảng UserHistories nếu chưa có
 */
const ensureNotificationReadStatusField = async () => {
    try {
        await db.sequelize.query("SELECT is_read FROM UserHistories LIMIT 1;");
        console.log("[MatchingEngine] Database: Cột is_read đã tồn tại.");
    } catch (err) {
        console.log("[MatchingEngine] Database: Cột is_read chưa tồn tại, đang tiến hành thêm...");
        try {
            await db.sequelize.query("ALTER TABLE UserHistories ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0;");
            console.log("[MatchingEngine] Database: ✅ Đã tự động thêm cột is_read thành công.");
        } catch (alterErr) {
            console.error("[MatchingEngine] Database: ❌ Không thể tự động thêm cột is_read:", alterErr.message);
        }
    }
};

/**
 * Khởi động Matching Engine
 */
const startMatchingEngine = () => {
    console.log('[MatchingEngine] 🚀 Khởi động Matching Engine (interval: 10s)');
    
    // Đảm bảo cấu trúc cột is_read tồn tại
    ensureNotificationReadStatusField();

    const matchingInterval = setInterval(runMatchingCycle, POLL_INTERVAL_MS);

    // Kiểm tra đóng cửa mỗi 60 giây — tự hủy lệnh khi hết phiên
    const eodInterval = setInterval(() => {
        const now = new Date();
        const vnNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        const h = vnNow.getHours(), m = vnNow.getMinutes();
        // Đóng phiên chiều 15:00-15:05
        if (h === 15 && m <= 5) {
            cancelExpiredOrders();
        }
    }, 60000);

    return { matchingInterval, eodInterval };
};

export default startMatchingEngine;
