import db from '../models';
import marketService from './marketService';
import bcrypt from 'bcryptjs';
import orderService from './orderService';

const getAllUsers = async () => {
    try {
        const users = await db.UserAccount.findAll({
            attributes: { exclude: ['password'] },
            include: [
                { 
                    model: db.UserProfile, 
                    as: 'profile',
                    attributes: [
                        'full_name', 'dob', 'gender', 'id_card_number', 
                        'id_card_issue_date', 'id_card_issue_place', 
                        'id_card_expiry_date', 'address', 'nationality'
                    ]
                },
                { 
                    model: db.Wallet, 
                    as: 'wallet',
                    attributes: ['balance']
                },
                {
                    model: db.Holding,
                    as: 'holdings',
                    where: {
                        quantity: { [db.Sequelize.Op.gt]: 0 }
                    },
                    required: false,
                    include: [
                        {
                            model: db.Stock,
                            as: 'stock',
                            attributes: ['symbol']
                        }
                    ]
                }
            ],
            order: [['id', 'DESC']]
        });

        // 1. Get all unique symbols from all users' holdings
        const allSymbols = new Set();
        users.forEach(user => {
            if (user.holdings) {
                user.holdings.forEach(h => {
                    if (h.stock && h.stock.symbol) {
                        allSymbols.add(h.stock.symbol);
                    }
                });
            }
        });

        // 2. Fetch real-time prices for all unique symbols
        const priceMap = {};
        const symbolArray = Array.from(allSymbols);
        
        await Promise.all(symbolArray.map(async (symbol) => {
            try {
                const stockData = await marketService.getStockDetail(symbol);
                const rawPrice = stockData?.data?.matchPrice || stockData?.data?.match_price || stockData?.data?.refPrice || 0;
                priceMap[symbol] = rawPrice;
            } catch (err) {
                console.error(`Error fetching price for ${symbol}:`, err);
                priceMap[symbol] = 0;
            }
        }));

        // 3. Calculate portfolio value for each user using real-time prices
        const result = await Promise.all(users.map(async (user) => {
            let totalHoldingsValue = 0;
            const updatedHoldings = [];

            if (user.holdings && user.holdings.length > 0) {
                await Promise.all(user.holdings.map(async (h) => {
                    const symbol = h.stock?.symbol;
                    const currentPrice = priceMap[symbol] || 0;
                    const holdingsValue = h.quantity * currentPrice;
                    totalHoldingsValue += holdingsValue;

                    let sellableQuantity = h.quantity;
                    if (symbol) {
                        try {
                            sellableQuantity = await orderService.getSellableQtyHelper(user.id, symbol, h.quantity);
                        } catch (err) {
                            console.error(`Error calculating sellableQty for user ${user.id} and symbol ${symbol}:`, err);
                        }
                    }

                    updatedHoldings.push({
                        ...h.get({ plain: true }),
                        currentPrice: currentPrice,
                        totalValue: holdingsValue,
                        sellableQuantity: sellableQuantity
                    });
                }));
                // Sắp xếp theo updatedAt giảm dần (mới nhất lên đầu)
                updatedHoldings.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            }

            const virtualBalance = user.wallet ? parseFloat(user.wallet.balance) : 0;
            const portfolioValue = totalHoldingsValue;

            return {
                id: user.id,
                profile: user.profile, // Trả về toàn bộ profile để Modal sử dụng
                email: user.email,
                phone: user.phone,
                role: user.role,
                virtual_balance: virtualBalance,
                portfolio_value: portfolioValue,
                status: user.status,
                account_number: user.account_number,
                createdAt: user.createdAt,
                holdings: updatedHoldings
            };
        }));

        return {
            EM: 'Lấy danh sách người dùng thành công',
            EC: 0,
            DT: result
        };
    } catch (e) {
        console.log(e);
        return {
            EM: 'Lỗi hệ thống',
            EC: -1,
            DT: []
        };
    }
};

const getAllOrders = async ({ startDate, endDate } = {}) => {
    try {
        const where = {};
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

        const orders = await db.Order.findAll({
            where,
            include: [
                {
                    model: db.UserAccount,
                    as: 'user',
                    attributes: ['id', 'account_number', 'email']
                },
                {
                    model: db.Stock,
                    as: 'stock',
                    attributes: ['symbol', 'company_name']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 200
        });

        return {
            EM: 'Lấy danh sách lệnh hệ thống thành công',
            EC: 0,
            DT: orders
        };
    } catch (e) {
        console.error('[getAllOrders] Error:', e);
        return {
            EM: 'Lỗi hệ thống',
            EC: -1,
            DT: []
        };
    }
};

const forceCancelOrder = async (orderId, adminId, ipAddress) => {
    const t = await db.sequelize.transaction();
    try {
        const order = await db.Order.findOne({ where: { id: orderId }, transaction: t });
        if (!order) {
            await t.rollback();
            return { EM: 'Lệnh không tồn tại.', EC: -1, DT: '' };
        }
        if (order.status !== 'PENDING' && order.status !== 'PARTIAL_MATCHED' && order.status !== 'FAILED_STUCK') {
            await t.rollback();
            return { EM: `Không thể hủy lệnh ở trạng thái ${order.status}.`, EC: -1, DT: '' };
        }

        const userId = order.user_id;
        const wallet = await db.Wallet.findOne({ where: { user_id: userId }, transaction: t });
        const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
        const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;

        if (order.side === 'BUY' && wallet) {
            const remainingAmount = parseFloat(order.price) * order.remaining_quantity;
            const remainingFee = remainingAmount * (baseFeePct / 100);
            const refundAmount = remainingAmount + remainingFee;
            const newFrozen = Math.max(0, parseFloat(wallet.frozen_balance) - refundAmount);
            await wallet.update({ frozen_balance: newFrozen }, { transaction: t });
        } else if (order.side === 'SELL') {
            const stock = await db.Stock.findOne({ where: { symbol: order.symbol }, transaction: t });
            if (stock) {
                let holding = await db.Holding.findOne({ where: { user_id: userId, stock_id: stock.id }, transaction: t });
                if (holding) {
                    await holding.update({ quantity: holding.quantity + order.remaining_quantity }, { transaction: t });
                } else {
                    await db.Holding.create({
                        user_id: userId,
                        stock_id: stock.id,
                        quantity: order.remaining_quantity,
                        average_price: parseFloat(order.price),
                        currentPrice: parseFloat(order.price),
                        totalValue: order.remaining_quantity * parseFloat(order.price)
                    }, { transaction: t });
                }
            }
        }

        await order.update({ status: 'CANCELLED' }, { transaction: t });

        // Tạo lịch sử hủy lệnh cho user
        const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
        await db.UserHistory.create({
            user_id: userId,
            field_name: order.symbol,
            old_value: '',
            new_value: `Admin đã can thiệp hủy lệnh ${sideText} ${order.remaining_quantity} CP ${order.symbol} bị lỗi/kẹt`,
            change_type: 'ORDER_CANCEL'
        }, { transaction: t });

        // Ghi log admin
        await db.AdminLog.create({
            admin_id: adminId,
            action: 'FORCE_CANCEL_ORDER',
            level: 'WARN',
            target_id: orderId,
            details: `Admin force cancelled stuck/failed order #${orderId} of user #${userId}`,
            ip_address: ipAddress
        }, { transaction: t });

        await t.commit();
        return { EM: 'Hủy lệnh bị kẹt thành công. Tiền/cổ phiếu đã được hoàn trả.', EC: 0, DT: order };
    } catch (e) {
        await t.rollback();
        console.error('[forceCancelOrder] Error:', e);
        return { EM: 'Lỗi hệ thống khi hủy lệnh', EC: -1, DT: '' };
    }
};

const forceMatchOrder = async (orderId, adminId, ipAddress) => {
    const t = await db.sequelize.transaction();
    try {
        const order = await db.Order.findOne({ where: { id: orderId }, transaction: t });
        if (!order) {
            await t.rollback();
            return { EM: 'Lệnh không tồn tại.', EC: -1, DT: '' };
        }
        if (order.status !== 'PENDING' && order.status !== 'PARTIAL_MATCHED' && order.status !== 'FAILED_STUCK') {
            await t.rollback();
            return { EM: `Không thể khớp lệnh ở trạng thái ${order.status}.`, EC: -1, DT: '' };
        }

        const userId = order.user_id;
        const fillQty = order.remaining_quantity;
        const matchPrice = parseFloat(order.price);

        const feeSetting = await db.Setting.findOne({ where: { key: 'base_fee' }, transaction: t });
        const taxSetting = await db.Setting.findOne({ where: { key: 'income_tax' }, transaction: t });
        const baseFeePct = feeSetting ? parseFloat(feeSetting.value) : 0.15;
        const taxPct = taxSetting ? parseFloat(taxSetting.value) : 0.10;

        const fillAmount = fillQty * matchPrice;
        const feeAmount = fillAmount * (baseFeePct / 100);

        const wallet = await db.Wallet.findOne({ where: { user_id: userId }, transaction: t });
        const stock = await db.Stock.findOne({ where: { symbol: order.symbol }, transaction: t });

        // Cập nhật trạng thái lệnh thành MATCHED
        await order.update({
            remaining_quantity: 0,
            status: 'MATCHED'
        }, { transaction: t });

        // Tạo Trade
        await db.Trade.create({
            order_id: order.id,
            price: matchPrice,
            quantity: fillQty,
            fee_amount: feeAmount,
            matched_at: new Date()
        }, { transaction: t });

        if (order.side === 'BUY') {
            const actualCost = fillAmount + feeAmount;
            const frozenForFill = fillQty * matchPrice * (1 + baseFeePct / 100);

            const newBalance = parseFloat(wallet.balance) - actualCost;
            const newFrozen = Math.max(0, parseFloat(wallet.frozen_balance) - frozenForFill);
            await wallet.update({ balance: newBalance, frozen_balance: newFrozen }, { transaction: t });

            // Cập nhật Holding
            let holding = await db.Holding.findOne({ where: { user_id: userId, stock_id: stock.id }, transaction: t });
            if (!holding) {
                await db.Holding.create({
                    user_id: userId, stock_id: stock.id,
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
            const taxAmount = fillAmount * (taxPct / 100);
            const earned = fillAmount - feeAmount - taxAmount;
            await wallet.update({ balance: parseFloat(wallet.balance) + earned }, { transaction: t });
        }

        // Tạo lịch sử khớp lệnh cho user
        const sideText = order.side === 'BUY' ? 'MUA' : 'BÁN';
        await db.UserHistory.create({
            user_id: userId,
            field_name: order.symbol,
            old_value: '',
            new_value: `Admin can thiệp khớp cưỡng bức lệnh ${sideText}: Đã khớp ${fillQty} CP ${order.symbol} với giá ${matchPrice.toLocaleString('vi-VN')} ₫`,
            change_type: 'ORDER_MATCH'
        }, { transaction: t });

        // Ghi log admin
        await db.AdminLog.create({
            admin_id: adminId,
            action: 'FORCE_MATCH_ORDER',
            level: 'WARN',
            target_id: orderId,
            details: `Admin force matched stuck/failed order #${orderId} of user #${userId} for quantity ${fillQty}`,
            ip_address: ipAddress
        }, { transaction: t });

        await t.commit();
        return { EM: 'Khớp lệnh cưỡng bức thành công.', EC: 0, DT: order };
    } catch (e) {
        await t.rollback();
        console.error('[forceMatchOrder] Error:', e);
        return { EM: 'Lỗi hệ thống khi khớp lệnh', EC: -1, DT: '' };
    }
};

const updateUserBalance = async (data) => {
    const { userId, amount, type, reason, adminId } = data;
    try {
        const wallet = await db.Wallet.findOne({ 
            where: { user_id: userId },
            include: [{ model: db.UserAccount, as: 'user', attributes: ['email', 'account_number'] }]
        });
        if (!wallet) {
            return {
                EM: 'Không tìm thấy ví của người dùng',
                EC: 1,
                DT: ''
            };
        }

        let newBalance = parseFloat(wallet.balance);
        if (type === 'ADD') {
            newBalance += parseFloat(amount);
        } else if (type === 'DEDUCT') {
            newBalance -= parseFloat(amount);
        }

        if (newBalance < 0) {
            return {
                EM: 'Số dư không thể âm',
                EC: 2,
                DT: ''
            };
        }

        await wallet.update({ balance: newBalance });

        // Ghi lịch sử cho người dùng biết
        await db.UserHistory.create({
            user_id: userId,
            field_name: 'WALLET_BALANCE',
            old_value: wallet.balance.toString(),
            new_value: `Tài khoản của bạn vừa được Admin ${type === 'ADD' ? 'cộng thêm' : 'khấu trừ'} ${parseFloat(amount).toLocaleString('vi-VN')} ₫ vốn ảo. Lý do: ${reason || 'Không có'}`,
            change_type: 'SYSTEM_ADJUST_BALANCE'
        });

        // Ghi log admin
        await db.AdminLog.create({
            admin_id: adminId,
            action: `ADJUST_BALANCE_${type}`,
            level: 'INFO',
            target_id: userId,
            details: `Adjusted balance for user ${userId} (${wallet.user?.account_number || wallet.user?.email}) by ${amount}. Reason: ${reason}`,
            ip_address: data.ipAddress
        });

        return {
            EM: 'Cập nhật số dư thành công',
            EC: 0,
            DT: { newBalance }
        };
    } catch (e) {
        console.log(e);
        return {
            EM: 'Lỗi hệ thống khi cập nhật số dư',
            EC: -1,
            DT: ''
        };
    }
};

const updateUserStatus = async (data) => {
    const { userId, status, adminId } = data;
    try {
        const user = await db.UserAccount.findByPk(userId);
        if (!user) {
            return {
                EM: 'Không tìm thấy người dùng',
                EC: 1,
                DT: ''
            };
        }

        // Không cho phép khóa tài khoản ADMIN
        if (user.role === 'ADMIN' && status === 'Locked') {
            return {
                EM: 'Không thể khóa tài khoản Quản trị viên',
                EC: 3,
                DT: ''
            };
        }

        await user.update({ status: status });

        // Ghi lịch sử cho người dùng biết
        await db.UserHistory.create({
            user_id: userId,
            field_name: 'USER_STATUS',
            old_value: '',
            new_value: `Trạng thái tài khoản của bạn vừa được Admin thay đổi thành: ${status === 'Active' ? 'Hoạt động (Active)' : 'Khóa (Locked)'}`,
            change_type: 'SYSTEM_UPDATE_STATUS'
        });

        // Ghi log admin
        await db.AdminLog.create({
            admin_id: adminId,
            action: `UPDATE_USER_STATUS_${status.toUpperCase()}`,
            level: 'INFO',
            target_id: userId,
            details: `Updated status for user ${userId} (${user.account_number || user.email}) to ${status}`,
            ip_address: data.ipAddress
        });

        return {
            EM: 'Cập nhật trạng thái thành công',
            EC: 0,
            DT: { status }
        };
    } catch (e) {
        console.log(e);
        return {
            EM: 'Lỗi hệ thống khi cập nhật trạng thái',
            EC: -1,
            DT: ''
        };
    }
};

const updateUserInfo = async (data) => {
    const t = await db.sequelize.transaction();
    try {
        const { userId, adminId, ipAddress, ...updateData } = data;
        const user = await db.UserAccount.findByPk(userId);
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        // Helper to handle empty dates
        const cleanDate = (val) => (val === "" || val === undefined) ? null : val;

        // Cập nhật thông tin UserAccount (email, phone, role)
        await user.update({
            email: updateData.email,
            phone: updateData.phone,
            role: updateData.role
        }, { transaction: t });

        // Cập nhật thông tin UserProfile (full_name, dob, gender, id_card_number, ...)
        const profile = await db.UserProfile.findOne({ where: { user_id: userId } });
        if (profile) {
            await profile.update({
                full_name: updateData.full_name,
                dob: cleanDate(updateData.dob),
                gender: updateData.gender,
                id_card_number: updateData.id_card_number,
                id_card_issue_date: cleanDate(updateData.id_card_issue_date),
                id_card_issue_place: updateData.id_card_issue_place,
                id_card_expiry_date: cleanDate(updateData.id_card_expiry_date),
                address: updateData.address
            }, { transaction: t });
        }

        // Ghi log admin
        await db.AdminLog.create({
            admin_id: adminId,
            action: 'UPDATE_USER_INFO',
            level: 'INFO',
            target_id: userId,
            details: `Updated info for user ${userId} (${user.account_number || user.email})`,
            ip_address: ipAddress
        }, { transaction: t });

        await t.commit();
        return { EM: 'Cập nhật thông tin người dùng thành công', EC: 0, DT: '' };
    } catch (e) {
        await t.rollback();
        console.log(e);
        if (e.name === 'SequelizeUniqueConstraintError') {
            const field = e.errors[0].path;
            let message = 'Thông tin đã tồn tại trong hệ thống';
            if (field === 'email') message = 'Email này đã được sử dụng bởi người dùng khác';
            if (field === 'phone') message = 'Số điện thoại này đã được sử dụng bởi người dùng khác';
            if (field === 'id_card_number') message = 'Số CMND/CCCD này đã tồn tại';
            return { EM: message, EC: 1, DT: field };
        }
        return { EM: 'Lỗi hệ thống khi cập nhật thông tin', EC: -1, DT: '' };
    }
};

const resetPassword = async (userId, adminId, ipAddress) => {
    try {
        const user = await db.UserAccount.findByPk(userId);
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        const hashedPassword = await bcrypt.hash('12345678', 10);
        await user.update({ password: hashedPassword });

        // Ghi lịch sử cho người dùng biết
        await db.UserHistory.create({
            user_id: userId,
            field_name: 'PASSWORD_RESET',
            old_value: '',
            new_value: `Mật khẩu đăng nhập tài khoản của bạn vừa được Admin đặt lại về mặc định (12345678). Hãy đổi lại mật khẩu mới ngay để đảm bảo an toàn.`,
            change_type: 'SYSTEM_RESET_PASSWORD'
        });

        // Log action
        await db.AdminLog.create({
            admin_id: adminId || 1, 
            action: 'RESET_PASSWORD',
            level: 'WARN',
            target_id: userId,
            details: `Admin reset password for user ${user.username} to default 12345678`,
            ip_address: ipAddress
        });

        return { EM: 'Đã đặt lại mật khẩu về mặc định (12345678)', EC: 0, DT: '' };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống khi reset mật khẩu', EC: -1, DT: '' };
    }
};

const resetPin = async (userId, adminId, ipAddress) => {
    try {
        const user = await db.UserAccount.findByPk(userId);
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        await user.update({ pin_code: '123456' });

        // Ghi lịch sử cho người dùng biết
        await db.UserHistory.create({
            user_id: userId,
            field_name: 'PIN_RESET',
            old_value: '',
            new_value: `Mã PIN giao dịch của bạn vừa được Admin đặt lại về mặc định (123456). Hãy đổi lại mã PIN mới ngay lập tức.`,
            change_type: 'SYSTEM_RESET_PIN'
        });

        // Log action
        await db.AdminLog.create({
            admin_id: adminId || 1,
            action: 'RESET_PIN',
            level: 'WARN',
            target_id: userId,
            details: `Admin reset PIN for user ${user.username} to default 123456`,
            ip_address: ipAddress
        });

        return { EM: 'Đã đặt lại mã PIN về mặc định (123456)', EC: 0, DT: '' };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống khi reset mã PIN', EC: -1, DT: '' };
    }
};

const getSystemLogs = async (page = 1, limit = 20) => {
    try {
        const offset = (page - 1) * limit;

        // 1. Lấy tổng số lượng từ cả 2 bảng để tính phân trang
        const adminLogsCount = await db.AdminLog.count();
        const userHistoriesCount = await db.UserHistory.count();
        const totalRows = adminLogsCount + userHistoriesCount;
        const totalPages = Math.ceil(totalRows / limit);

        // 2. Lấy dữ liệu (Lấy page * limit để đảm bảo sắp xếp đúng khi gộp)
        // Lưu ý: Đây là cách tiếp cận đơn giản cho dữ liệu vừa phải. 
        // Nếu dữ liệu cực lớn, cần giải pháp Union hoặc bảng log tập trung.
        const adminLogsPromise = db.AdminLog.findAll({
            include: [{ model: db.UserAccount, as: 'admin', attributes: ['email'] }],
            order: [['createdAt', 'DESC']],
            limit: page * limit
        });

        const userHistoriesPromise = db.UserHistory.findAll({
            include: [{ model: db.UserAccount, as: 'user', attributes: ['email', 'account_number'] }],
            order: [['createdAt', 'DESC']],
            limit: page * limit
        });

        const [adminLogs, userHistories] = await Promise.all([adminLogsPromise, userHistoriesPromise]);

        // 3. Định dạng Admin Logs
        const formattedAdminLogs = adminLogs.map(log => ({
            timestamp: log.createdAt,
            level: log.level || 'INFO',
            actor: log.admin ? log.admin.email : 'System',
            action: log.action,
            details: log.details,
            type: 'ADMIN'
        }));

        // 4. Định dạng User Histories
        const formattedUserLogs = userHistories.map(log => {
            let actionText = `User action: ${log.change_type}`;
            let detailsText = "";

            const userEmail = log.user ? log.user.email : 'Unknown User';
            const userAcc = log.user ? log.user.account_number : 'N/A';
            const userDesc = `${userEmail} (${userAcc})`;

            if (log.change_type === 'PROFILE_UPDATE') {
                actionText = `User updated profile: ${log.field_name}`;
                detailsText = `Field "${log.field_name}" changed from "${log.old_value || 'N/A'}" to "${log.new_value || 'N/A'}" for user ${userDesc}`;
            } else if (log.change_type === 'PASSWORD_CHANGE') {
                actionText = `User changed password`;
                detailsText = `User changed account password successfully for user ${userDesc}`;
            } else if (log.change_type === 'PIN_CHANGE') {
                actionText = `User changed PIN`;
                detailsText = `User changed transaction PIN successfully for user ${userDesc}`;
            } else if (log.change_type === 'ORDER_PLACE') {
                actionText = `User placed order`;
                detailsText = (log.new_value || 'N/A').replace("Đặt thành công lệnh", `Tài khoản ${userDesc} đặt thành công lệnh`);
            } else if (log.change_type === 'ORDER_CANCEL') {
                actionText = `User cancelled order`;
                detailsText = (log.new_value || 'N/A')
                    .replace("Đã hủy thành công lệnh", `Tài khoản ${userDesc} đã hủy thành công lệnh`)
                    .replace("Admin đã can thiệp hủy lệnh", `Admin đã can thiệp hủy lệnh của tài khoản ${userDesc}`);
            } else if (log.change_type === 'ORDER_MATCH') {
                actionText = `Order matched`;
                detailsText = (log.new_value || 'N/A')
                    .replace("Khớp hoàn toàn lệnh", `Khớp hoàn toàn lệnh của tài khoản ${userDesc}`)
                    .replace("Admin can thiệp khớp cưỡng bức lệnh", `Admin can thiệp khớp cưỡng bức lệnh của tài khoản ${userDesc}`);
            } else if (log.change_type === 'ORDER_PARTIAL_MATCH') {
                actionText = `Order partially matched`;
                detailsText = (log.new_value || 'N/A').replace("Khớp một phần lệnh", `Khớp một phần lệnh của tài khoản ${userDesc}`);
            } else if (log.change_type === 'ORDER_EXPIRED_CANCEL') {
                actionText = `Order expired and cancelled`;
                detailsText = (log.new_value || 'N/A').replace("Lệnh hết hạn cuối ngày: Đã tự động hủy lệnh", `Lệnh hết hạn cuối ngày: Đã tự động hủy lệnh của tài khoản ${userDesc}`);
            } else if (log.change_type === 'ORDER_MODIFY') {
                actionText = `User modified order`;
                detailsText = (log.new_value || 'N/A').replace("Đã sửa lệnh", `Tài khoản ${userDesc} đã sửa lệnh`);
            } else if (log.change_type === 'SYSTEM_ADJUST_BALANCE') {
                actionText = `System adjusted wallet balance`;
                detailsText = (log.new_value || 'N/A').replace("Tài khoản của bạn", `Tài khoản của ${userDesc}`);
            } else if (log.change_type === 'SYSTEM_UPDATE_STATUS') {
                actionText = `System updated account status`;
                detailsText = (log.new_value || 'N/A').replace("Trạng thái tài khoản của bạn", `Trạng thái tài khoản của ${userDesc}`);
            } else if (log.change_type === 'SYSTEM_RESET_PASSWORD') {
                actionText = `System reset account password`;
                detailsText = (log.new_value || 'N/A').replace("Mật khẩu đăng nhập tài khoản của bạn", `Mật khẩu đăng nhập tài khoản của ${userDesc}`);
            } else if (log.change_type === 'SYSTEM_RESET_PIN') {
                actionText = `System reset account PIN`;
                detailsText = (log.new_value || 'N/A').replace("Mã PIN giao dịch của bạn", `Mã PIN giao dịch của ${userDesc}`);
            } else {
                detailsText = `Field "${log.field_name}" changed from "${log.old_value || 'N/A'}" to "${log.new_value || 'N/A'}" for user ${userDesc}`;
            }

            return {
                timestamp: log.createdAt,
                level: (log.change_type === 'PASSWORD_CHANGE' || log.change_type === 'PIN_CHANGE' || log.change_type === 'SYSTEM_RESET_PASSWORD' || log.change_type === 'SYSTEM_RESET_PIN') ? 'WARN' : 'INFO',
                actor: log.user ? log.user.email : 'Unknown User',
                action: actionText,
                details: detailsText,
                type: 'USER'
            };
        });

        // 5. Gộp, sắp xếp và cắt theo trang
        const allLogs = [...formattedAdminLogs, ...formattedUserLogs]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(offset, offset + limit);

        return {
            EM: 'Lấy danh sách logs thành công',
            EC: 0,
            DT: {
                totalRows,
                totalPages,
                logs: allLogs
            }
        };
    } catch (e) {
        console.log(e);
        return {
            EM: 'Lỗi hệ thống khi lấy logs',
            EC: -1,
            DT: { totalRows: 0, totalPages: 0, logs: [] }
        };
    }
};

const getMarketData = async (group = "HOSE") => {
    try {
        // 1. Lấy dữ liệu real-time từ Python API
        const boardData = await marketService.getBoardByGroup(group);
        if (!boardData || !boardData.success) {
            return { EM: 'Không lấy được dữ liệu từ Python API', EC: 1, DT: [] };
        }

        // 2. Lấy trạng thái từ Database và tính toán thống kê tổng thể
        const dbStocks = await db.Stock.findAll({
            attributes: ['symbol', 'is_active']
        });
        
        const totalCount = dbStocks.length;
        let dbActiveCount = 0;
        let dbHaltedCount = 0;
        
        // Tạo map để tra cứu nhanh trạng thái từ DB
        const statusMap = {};
        dbStocks.forEach(s => {
            statusMap[s.symbol] = s.is_active;
            if (s.is_active) dbActiveCount++;
            else dbHaltedCount++;
        });

        // 3. Gộp dữ liệu: Ưu tiên trạng thái từ DB, giá từ real-time
        const mergedData = boardData.data.map(s => ({
            ...s,
            is_active: statusMap[s.symbol] !== undefined ? statusMap[s.symbol] : true // Mặc định là true nếu chưa có trong DB
        }));

        return {
            EM: 'Lấy dữ liệu thị trường thành công',
            EC: 0,
            DT: {
                stocks: mergedData,
                summary: {
                    total: totalCount,
                    active: dbActiveCount,
                    halted: dbHaltedCount
                }
            }
        };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: [] };
    }
};

const updateStockStatus = async (data) => {
    const { symbol, is_active, adminId, ipAddress } = data;
    try {
        const [stock, created] = await db.Stock.findOrCreate({
            where: { symbol: symbol },
            defaults: {
                symbol: symbol,
                company_name: '---', 
                exchange: 'HOSE',
                is_active: is_active
            }
        });

        if (!created) {
            await stock.update({ is_active: is_active });
        }

        // Log action
        await db.AdminLog.create({
            admin_id: adminId || 1,
            action: is_active ? 'ACTIVATE_STOCK' : 'HALT_STOCK',
            level: is_active ? 'INFO' : 'WARN',
            target_id: stock.id,
            details: `Admin ${is_active ? 'activated' : 'halted'} trading for symbol ${symbol}`,
            ip_address: ipAddress
        });

        return {
            EM: 'Cập nhật trạng thái cổ phiếu thành công',
            EC: 0,
            DT: stock
        };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi khi cập nhật trạng thái cổ phiếu', EC: -1, DT: '' };
    }
};

const syncStocks = async () => {
    try {
        const groups = ["HOSE", "HNX", "UPCOM"];
        let totalNew = 0;
        let totalProcessed = 0;

        // 1. Lấy danh sách mã đã tồn tại
        const existingStocks = await db.Stock.findAll({ attributes: ['symbol'], raw: true });
        const existingSymbols = new Set(existingStocks.map(s => s.symbol));

        const newStocksToInsert = [];

        for (const group of groups) {
            const boardData = await marketService.getBoardByGroup(group);
            if (boardData && boardData.success && boardData.data) {
                for (const s of boardData.data) {
                    totalProcessed++;
                    if (!existingSymbols.has(s.symbol)) {
                        newStocksToInsert.push({
                            symbol: s.symbol,
                            company_name: s.companyName || '---',
                            exchange: group,
                            is_active: true
                        });
                        existingSymbols.add(s.symbol);
                    }
                }
            }
        }

        // 2. Thực hiện Bulk Insert theo từng Chunks (mỗi lần 500 mã) để tránh lỗi packet lớn
        const chunkSize = 500;
        for (let i = 0; i < newStocksToInsert.length; i += chunkSize) {
            const chunk = newStocksToInsert.slice(i, i + chunkSize);
            await db.Stock.bulkCreate(chunk);
        }

        totalNew = newStocksToInsert.length;

        return {
            EM: `Đồng bộ thành công! Đã xử lý ${totalProcessed} mã, thêm mới ${totalNew} mã vào database.`,
            EC: 0,
            DT: { totalNew, totalProcessed }
        };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi đồng bộ dữ liệu. Vui lòng thử lại.', EC: -1 };
    }
};

const getMarketStatus = async () => {
    try {
        const setting = await db.Setting.findOne({ where: { key: 'market_status' } });
        return {
            EM: 'Lấy trạng thái thị trường thành công',
            EC: 0,
            DT: setting ? setting.value : 'OPEN'
        };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi lấy trạng thái thị trường', EC: -1 };
    }
};

const updateMarketStatus = async (status, adminId, ipAddress) => {
    try {
        const [setting, created] = await db.Setting.findOrCreate({
            where: { key: 'market_status' },
            defaults: {
                key: 'market_status',
                value: status,
                description: 'Trạng thái mở cửa/đóng cửa thị trường'
            }
        });

        if (!created) {
            await setting.update({ value: status });
        }

        // Log action
        await db.AdminLog.create({
            admin_id: adminId || 1,
            action: status === 'OPEN' ? 'OPEN_MARKET' : 'CLOSE_MARKET',
            level: status === 'OPEN' ? 'INFO' : 'CRITICAL',
            target_id: setting.id,
            details: `Admin ${status === 'OPEN' ? 'opened' : 'closed'} the global market trading status`,
            ip_address: ipAddress
        });

        return {
            EM: `Thị trường đã chuyển sang trạng thái: ${status}`,
            EC: 0,
            DT: status
        };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi cập nhật trạng thái thị trường', EC: -1 };
    }
};

const getSettings = async () => {
    try {
        const settings = await db.Setting.findAll();
        const settingsMap = {};
        settings.forEach(item => {
            settingsMap[item.key] = item.value;
        });

        return {
            EM: 'Lấy cấu hình thành công',
            EC: 0,
            DT: {
                baseFee: settingsMap['base_fee'] || '0.15',
                incomeTax: settingsMap['income_tax'] || '0.10',
                initialBalance: settingsMap['initial_balance'] || '100000000',
                enableT0Trading: settingsMap['enable_t0_trading'] === 'true' || settingsMap['enable_t0_trading'] === undefined,
                cashAdvanceRate: settingsMap['cash_advance_rate'] || '0.038'
            }
        };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống khi lấy cấu hình', EC: -1, DT: null };
    }
};

const updateSettings = async (settingsData, adminId, ipAddress) => {
    const t = await db.sequelize.transaction();
    try {
        const { baseFee, incomeTax, initialBalance, enableT0Trading, cashAdvanceRate } = settingsData;
        
        const settingsToUpdate = [
            { key: 'base_fee', value: String(baseFee), description: 'Phí giao dịch cơ sở (%)' },
            { key: 'income_tax', value: String(incomeTax), description: 'Thuế thu nhập khi bán (%)' },
            { key: 'initial_balance', value: String(initialBalance), description: 'Số dư ảo ban đầu cho tài khoản mới (VND)' },
            { key: 'enable_t0_trading', value: String(enableT0Trading), description: 'Cho phép giao dịch trong ngày T+0 (true/false)' },
            { key: 'cash_advance_rate', value: String(cashAdvanceRate || '0.038'), description: 'Lãi suất ứng trước tiền bán theo ngày (%)' }
        ];

        const logDetails = [];

        for (const item of settingsToUpdate) {
            const [setting, created] = await db.Setting.findOrCreate({
                where: { key: item.key },
                defaults: { key: item.key, value: item.value, description: item.description },
                transaction: t
            });

            if (!created) {
                const oldValue = setting.value;
                if (oldValue !== item.value) {
                    await setting.update({ value: item.value }, { transaction: t });
                    logDetails.push(`${item.key} (${oldValue} -> ${item.value})`);
                }
            } else {
                logDetails.push(`Tạo ${item.key} (${item.value})`);
            }
        }

        if (logDetails.length > 0) {
            await db.AdminLog.create({
                admin_id: adminId || 1,
                action: 'UPDATE_SETTINGS',
                level: 'WARN',
                target_id: null,
                details: `Admin cập nhật cấu hình hệ thống: ${logDetails.join(', ')}`,
                ip_address: ipAddress
            }, { transaction: t });
        }

        await t.commit();
        return {
            EM: 'Cập nhật cấu hình hệ thống thành công',
            EC: 0,
            DT: settingsData
        };
    } catch (e) {
        await t.rollback();
        console.log(e);
        return { EM: 'Lỗi hệ thống khi cập nhật cấu hình', EC: -1, DT: null };
    }
};

const adminCancelOrder = async (orderId, adminId, ipAddress) => {
    try {
        const data = await orderService.cancelOrder(orderId, null, true);
        if (data && data.EC === 0) {
            await db.AdminLog.create({
                admin_id: adminId || 1,
                action: 'ADMIN_CANCEL_ORDER',
                level: 'INFO',
                target_id: orderId,
                details: `Admin cancelled pending/partial order #${orderId}`,
                ip_address: ipAddress
            });
        }
        return data;
    } catch (e) {
        console.error('[adminCancelOrder] Error:', e);
        return { EM: 'Lỗi hệ thống khi hủy lệnh', EC: -1, DT: '' };
    }
};

const adminModifyOrder = async (orderId, { newPrice, newQuantity }, adminId, ipAddress) => {
    try {
        const data = await orderService.modifyOrder(orderId, null, { newPrice, newQuantity }, true);
        if (data && data.EC === 0) {
            const changeDesc = newPrice !== undefined
                ? `thành giá mới ${newPrice}`
                : `thành khối lượng mới ${newQuantity}`;
            await db.AdminLog.create({
                admin_id: adminId || 1,
                action: 'ADMIN_MODIFY_ORDER',
                level: 'INFO',
                target_id: orderId,
                details: `Admin modified order #${orderId} ${changeDesc}`,
                ip_address: ipAddress
            });
        }
        return data;
    } catch (e) {
        console.error('[adminModifyOrder] Error:', e);
        return { EM: 'Lỗi hệ thống khi sửa lệnh', EC: -1, DT: '' };
    }
};

const adminPlaceOrderOnBehalf = async (orderData, adminId, ipAddress) => {
    try {
        const { targetUserId, symbol, quantity, price, side, type } = orderData;
        const data = await orderService.placeOrder({
            userId: targetUserId,
            symbol,
            quantity,
            price,
            side,
            type: type || 'LO',
            isAdmin: true
        });
        if (data && data.EC === 0) {
            await db.AdminLog.create({
                admin_id: adminId || 1,
                action: 'ADMIN_PLACE_ORDER_BEHALF',
                level: 'INFO',
                target_id: targetUserId,
                details: `Admin placed ${side} order behalf of user #${targetUserId}: ${quantity} ${symbol} @ ${price}`,
                ip_address: ipAddress
            });
        }
        return data;
    } catch (e) {
        console.error('[adminPlaceOrderOnBehalf] Error:', e);
        return { EM: 'Lỗi hệ thống khi đặt lệnh hộ', EC: -1, DT: '' };
    }
};

module.exports = {
    getAllUsers,
    getAllOrders,
    forceCancelOrder,
    forceMatchOrder,
    updateUserBalance,
    updateUserStatus,
    updateUserInfo,
    resetPassword,
    resetPin,
    getSystemLogs,
    getMarketData,
    updateStockStatus,
    syncStocks,
    getMarketStatus,
    updateMarketStatus,
    getSettings,
    updateSettings,
    adminCancelOrder,
    adminModifyOrder,
    adminPlaceOrderOnBehalf
};
