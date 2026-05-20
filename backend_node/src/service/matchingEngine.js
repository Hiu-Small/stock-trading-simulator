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
 * Kiểm tra một giao dịch/khoản tiền bán đã thanh toán xong theo quy tắc T+2.5 chưa
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
 * Giải phóng Tiền bán chờ về (T+2.5) cho tất cả người dùng
 */
const clearPendingCashesCycle = async () => {
    const t = await db.sequelize.transaction();
    try {
        // Tìm tất cả PendingCash chưa thanh toán (cleared = false)
        const unclearedList = await db.PendingCash.findAll({
            where: { cleared: false },
            transaction: t
        });

        const now = new Date();
        for (const pending of unclearedList) {
            if (isTradeCleared(pending.matched_at, now)) {
                // Lấy ví người dùng
                const wallet = await db.Wallet.findOne({
                    where: { user_id: pending.user_id },
                    transaction: t
                });

                if (wallet) {
                    const amountToClear = parseFloat(pending.amount);
                    const newBalance = parseFloat(wallet.balance) + amountToClear;
                    const newPendingCash = Math.max(0, parseFloat(wallet.pending_cash || 0) - amountToClear);

                    await wallet.update({
                        balance: newBalance,
                        pending_cash: newPendingCash
                    }, { transaction: t });

                    await pending.update({ cleared: true }, { transaction: t });
                    console.log(`[MatchingEngine] 💸 Đã giải tỏa ${amountToClear.toLocaleString('vi-VN')} ₫ tiền bán chờ về cho User #${pending.user_id}`);
                }
            }
        }

        await t.commit();
    } catch (err) {
        await t.rollback();
        console.error('[clearPendingCashesCycle] Lỗi giải phóng tiền chờ về:', err);
    }
};

const isMarketOpenNow = () => {
    const now = new Date();
    // Chuyển sang múi giờ Asia/Ho_Chi_Minh
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const day = vnTime.getDay(); // 0 = Chủ nhật, 6 = Thứ 7
    if (day === 0 || day === 6) {
        return false;
    }

    const hour = vnTime.getHours();
    const minute = vnTime.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Phiên sáng: 9:00 (540 phút) đến 11:30 (690 phút)
    const isMorning = totalMinutes >= 540 && totalMinutes <= 690;
    // Phiên chiều: 13:00 (780 phút) đến 15:00 (900 phút)
    const isAfternoon = totalMinutes >= 780 && totalMinutes <= 900;

    return isMorning || isAfternoon;
};

let engineRunning = false;

const runMatchingCycle = async () => {
    if (engineRunning) return; // Prevent overlapping cycles
    engineRunning = true;

    try {
        // 1. Kiểm tra trạng thái đóng cửa thủ công từ Admin
        const globalSetting = await db.Setting.findOne({ where: { key: 'market_status' } });
        const globalStatus = globalSetting ? globalSetting.value : 'OPEN';
        if (globalStatus === 'CLOSED') {
            engineRunning = false;
            return;
        }

        // 2. Kiểm tra giờ giao dịch chuẩn Việt Nam (Thứ 2 - Thứ 6, 9:00-11:30 & 13:00-15:00)
        if (!isMarketOpenNow()) {
            engineRunning = false;
            return;
        }

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
                // 1. Lấy dữ liệu khớp lệnh chi tiết trong ngày (Tick-by-Tick)
                let matchTicks = [];
                try {
                    const intradayResponse = await axios.get(PYTHON_API.STOCK_INTRADAY(symbol), { timeout: 5000 });
                    const intradayData = intradayResponse.data;
                    matchTicks = intradayData && intradayData.match ? intradayData.match : [];
                } catch (intraErr) {
                    console.warn(`[MatchingEngine] Không lấy được intraday cho ${symbol}, chuyển sang dự phòng:`, intraErr.message);
                }

                // 2. Lấy dữ liệu snapshot bảng giá làm dự phòng (hoặc để lấy thông tin cơ bản)
                const stockResponse = await axios.get(PYTHON_API.STOCK(symbol), { timeout: 5000 });
                const responseData = stockResponse.data;
                const stockData = responseData && responseData.data ? responseData.data : responseData;
                const rawMatchPrice = stockData.matchPrice || stockData.match_price || 0;
                const matchPrice = rawMatchPrice;
                const matchVolume = stockData.matchVolume || stockData.match_volume || stockData.matchVol || 0;

                // Xử lý từng lệnh của mã này
                for (const order of symbolMap[symbol]) {
                    if (matchTicks.length > 0) {
                        // Khớp tick-by-tick siêu thực tế
                        await processOrderWithTicks(order, matchTicks);
                    } else if (matchPrice > 0) {
                        // Cơ chế dự phòng nếu API tick-by-tick gặp lỗi hoặc rỗng
                        await processOrder(order, matchPrice, matchVolume);
                    }
                }

            } catch (apiErr) {
                console.warn(`[MatchingEngine] Không lấy được dữ liệu khớp lệnh cho ${symbol}:`, apiErr.message);
            }
        }

        // Tự động giải tỏa Tiền bán chờ về đã đủ ngày T+2.5
        await clearPendingCashesCycle();

    } catch (e) {
        console.error('[MatchingEngine] Lỗi chu kỳ:', e);
    } finally {
        engineRunning = false;
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
 * Xử lý khớp lệnh cực kỳ thực tế dựa trên lịch sử khớp lệnh trong ngày (Tick-by-Tick)
 */
const processOrderWithTicks = async (order, matchTicks) => {
    try {
        // 1. Tìm mốc thời gian khớp gần nhất của lệnh này để tránh khớp trùng
        const latestTrade = await db.Trade.findOne({
            where: { order_id: order.id },
            order: [['matched_at', 'DESC']]
        });
        
        // Nếu chưa từng khớp, ta tính từ lúc đặt hoặc sửa lệnh gần nhất (updatedAt)
        const sinceTime = latestTrade ? new Date(latestTrade.matched_at) : new Date(order.updatedAt);
        
        // 2. Lấy danh sách các giao dịch tick-by-tick hợp lệ (xảy ra sau sinceTime)
        const todayVNStr = getVietnamDateString(new Date()); // YYYY-MM-DD
        const eligibleTicks = [];
        
        for (const tick of matchTicks) {
            // tick.time dạng "HH:MM:SS"
            const tickTimeStr = `${todayVNStr}T${tick.time}+07:00`;
            const tickDate = new Date(tickTimeStr);
            
            if (tickDate > sinceTime) {
                eligibleTicks.push({
                    date: tickDate,
                    price: parseFloat(tick.price) * 1000, // Đổi từ giá hiển thị (VND/1000) sang giá trị VND thực tế
                    volume: parseInt(tick.volume),
                    side: tick.side
                });
            }
        }
        
        // Sắp xếp các tick theo thời gian từ cũ đến mới (chronological order)
        eligibleTicks.sort((a, b) => a.date - b.date);
        
        if (eligibleTicks.length === 0) return;
        
        // 3. Khớp lần lượt từng tick
        for (const tick of eligibleTicks) {
            if (order.remaining_quantity <= 0) break;
            
            const orderPrice = parseFloat(order.price);
            const priceMatches = order.side === 'BUY'
                ? tick.price <= orderPrice
                : tick.price >= orderPrice;
                
            if (!priceMatches) continue;
            
            const isOddLot = order.quantity < ODD_LOT_THRESHOLD;
            let fillQty;
            if (isOddLot) {
                fillQty = order.remaining_quantity;
            } else {
                fillQty = Math.min(order.remaining_quantity, tick.volume);
            }
            
            if (fillQty <= 0) continue;
            
            // Khớp lệnh thực tế và ghi nhận mốc thời gian của tick đó
            await processOrder(order, tick.price, fillQty, tick.date);
        }
    } catch (err) {
        console.error(`[MatchingEngine] Lỗi khớp tick-by-tick cho lệnh #${order.id}:`, err);
    }
};

/**
 * Xử lý khớp lệnh cho một lệnh cụ thể
 */
const processOrder = async (order, matchPrice, matchVolume, tickDate = null) => {
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
            matched_at: tickDate || new Date()
        }, { transaction: t });

        if (order.side === 'BUY') {
            // Tính phí ứng trước tỷ lệ cho phần khớp lệnh này
            const proportionalAdvanceFee = order.advance_fee ? (fillQty / order.quantity) * parseFloat(order.advance_fee) : 0;

            // Tính tiền thực tế phải trả (bao gồm cả phí ứng trước tỷ lệ)
            const actualCost = fillAmount + feeAmount + proportionalAdvanceFee;

            // Phần đã đóng băng (bao gồm cả phí ứng trước tỷ lệ để giải phóng tương ứng)
            const frozenForFill = (fillQty * orderPrice * (1 + baseFeePct / 100)) + proportionalAdvanceFee;

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
            await updateWalletTotalInvested(order.user_id, t);

        } else if (order.side === 'SELL') {
            // Cộng tiền bán về ví dưới dạng Tiền chờ về (T+2.5)
            const taxAmount = fillAmount * (taxPct / 100);
            const earned = fillAmount - feeAmount - taxAmount;
            
            await db.PendingCash.create({
                user_id: order.user_id,
                amount: earned,
                matched_at: tickDate || new Date(),
                cleared: false
            }, { transaction: t });

            await wallet.update({
                pending_cash: parseFloat(wallet.pending_cash || 0) + earned
            }, { transaction: t });
            // Holding đã bị trừ khi đặt lệnh, không cần trừ thêm
        }

        // Tạo lịch sử khớp lệnh kèm mốc thời gian khớp cực kỳ chi tiết
        const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
        const matchStatusText = newStatus === 'MATCHED' ? 'Khớp hoàn toàn' : 'Khớp một phần';
        const changeType = newStatus === 'MATCHED' ? 'ORDER_MATCH' : 'ORDER_PARTIAL_MATCH';
        
        let timeStr = "";
        if (tickDate) {
            const formatter = new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            timeStr = ` vào lúc ${formatter.format(tickDate)}`;
        }

        await db.UserHistory.create({
            user_id: order.user_id,
            field_name: order.symbol,
            old_value: '',
            new_value: `${matchStatusText} lệnh ${sideText}: Đã khớp ${fillQty} CP ${order.symbol} với giá ${matchPrice.toLocaleString('vi-VN')} ₫${timeStr}`,
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
