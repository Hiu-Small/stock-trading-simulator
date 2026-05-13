import db from '../models';
import marketService from './marketService';
import bcrypt from 'bcryptjs';

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
                // Giả sử stockData.data.price là giá hiện tại từ Python API
                // Cần kiểm tra cấu trúc chính xác của response từ marketService
                priceMap[symbol] = stockData?.data?.price || stockData?.data?.currentPrice || 0;
            } catch (err) {
                console.error(`Error fetching price for ${symbol}:`, err);
                priceMap[symbol] = 0;
            }
        }));

        // 3. Calculate portfolio value for each user using real-time prices
        const result = users.map(user => {
            let totalHoldingsValue = 0;
            const updatedHoldings = [];

            if (user.holdings && user.holdings.length > 0) {
                user.holdings.forEach(h => {
                    const symbol = h.stock?.symbol;
                    const currentPrice = priceMap[symbol] || 0;
                    const holdingsValue = h.quantity * currentPrice;
                    totalHoldingsValue += holdingsValue;

                    updatedHoldings.push({
                        ...h.get({ plain: true }),
                        currentPrice: currentPrice,
                        totalValue: holdingsValue
                    });
                });
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
        });

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

const getSystemLogs = async () => {
    try {
        // Lấy logs từ Admin
        const adminLogsPromise = db.AdminLog.findAll({
            include: [{ model: db.UserAccount, as: 'admin', attributes: ['email'] }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Lấy logs từ User (History)
        const userHistoriesPromise = db.UserHistory.findAll({
            include: [{ model: db.UserAccount, as: 'user', attributes: ['email'] }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        const [adminLogs, userHistories] = await Promise.all([adminLogsPromise, userHistoriesPromise]);

        // Định dạng Admin Logs
        const formattedAdminLogs = adminLogs.map(log => ({
            timestamp: log.createdAt,
            level: log.level || 'INFO',
            actor: log.admin ? log.admin.email : 'System',
            action: log.action,
            details: log.details,
            type: 'ADMIN'
        }));

        // Định dạng User Histories
        const formattedUserLogs = userHistories.map(log => {
            let actionText = `User action: ${log.change_type}`;
            if (log.change_type === 'PROFILE_UPDATE') actionText = `User updated profile: ${log.field_name}`;
            if (log.change_type === 'PASSWORD_CHANGE') actionText = `User changed password`;
            if (log.change_type === 'PIN_CHANGE') actionText = `User changed PIN`;

            return {
                timestamp: log.createdAt,
                level: (log.change_type === 'PASSWORD_CHANGE' || log.change_type === 'PIN_CHANGE') ? 'WARN' : 'INFO',
                actor: log.user ? log.user.email : 'Unknown User',
                action: actionText,
                details: `Field "${log.field_name}" changed from "${log.old_value || 'N/A'}" to "${log.new_value || 'N/A'}"`,
                type: 'USER'
            };
        });

        // Gộp và sắp xếp theo thời gian
        const allLogs = [...formattedAdminLogs, ...formattedUserLogs].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        return {
            EM: 'Lấy danh sách logs thành công',
            EC: 0,
            DT: allLogs.slice(0, 100)
        };
    } catch (e) {
        console.log(e);
        return {
            EM: 'Lỗi hệ thống khi lấy logs',
            EC: -1,
            DT: []
        };
    }
};

module.exports = {
    getAllUsers,
    updateUserBalance,
    updateUserStatus,
    updateUserInfo,
    resetPassword,
    resetPin,
    getSystemLogs
};
