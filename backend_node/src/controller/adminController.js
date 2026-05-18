import adminService from '../service/adminService';

const handleGetAllUsers = async (req, res) => {
    try {
        const data = await adminService.getAllUsers();
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            EM: 'Lỗi server',
            EC: -1,
            DT: ''
        });
    }
};

const handleGetAllOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await adminService.getAllOrders({ startDate, endDate });
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            EM: 'Lỗi server',
            EC: -1,
            DT: ''
        });
    }
};

const handleForceCancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const adminId = req.user.id;
        const ipAddress = getRealIp(req);
        const data = await adminService.forceCancelOrder(orderId, adminId, ipAddress);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleForceMatchOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const adminId = req.user.id;
        const ipAddress = getRealIp(req);
        const data = await adminService.forceMatchOrder(orderId, adminId, ipAddress);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

// Helper function to get real IP address
const getRealIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress;
    return ip === '::1' ? '127.0.0.1' : ip;
};

const handleUpdateBalance = async (req, res) => {
    try {
        const data = await adminService.updateUserBalance({
            ...req.body,
            adminId: req.user.id,
            ipAddress: getRealIp(req)
        });
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            EM: 'Lỗi server',
            EC: -1,
            DT: ''
        });
    }
};

const handleUpdateStatus = async (req, res) => {
    try {
        const data = await adminService.updateUserStatus({
            ...req.body,
            adminId: req.user.id,
            ipAddress: getRealIp(req)
        });
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            EM: 'Lỗi server',
            EC: -1,
            DT: ''
        });
    }
};

const handleUpdateUser = async (req, res) => {
    try {
        const data = await adminService.updateUserInfo({
            ...req.body,
            adminId: req.user.id,
            ipAddress: getRealIp(req)
        });
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleResetPassword = async (req, res) => {
    try {
        const { userId } = req.body;
        const adminId = req.user.id;
        const ipAddress = getRealIp(req);
        const data = await adminService.resetPassword(userId, adminId, ipAddress);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleResetPin = async (req, res) => {
    try {
        const { userId } = req.body;
        const adminId = req.user.id;
        const ipAddress = getRealIp(req);
        const data = await adminService.resetPin(userId, adminId, ipAddress);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleGetSystemLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const data = await adminService.getSystemLogs(page, limit);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

const handleGetMarketData = async (req, res) => {
    try {
        const group = req.query.group || "HOSE";
        const data = await adminService.getMarketData(group);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

const handleUpdateStockStatus = async (req, res) => {
    try {
        const data = await adminService.updateStockStatus({
            ...req.body,
            adminId: req.user.id,
            ipAddress: getRealIp(req)
        });
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

const handleSyncStocks = async (req, res) => {
    try {
        const data = await adminService.syncStocks();
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

const handleGetMarketStatus = async (req, res) => {
    try {
        const data = await adminService.getMarketStatus();
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

const handleUpdateMarketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const data = await adminService.updateMarketStatus(
            status,
            req.user.id,
            getRealIp(req)
        );
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

const handleGetSettings = async (req, res) => {
    try {
        const data = await adminService.getSettings();
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

const handleUpdateSettings = async (req, res) => {
    try {
        const data = await adminService.updateSettings(
            req.body,
            req.user.id,
            getRealIp(req)
        );
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
}

export default {
    handleGetAllUsers,
    handleGetAllOrders,
    handleForceCancelOrder,
    handleForceMatchOrder,
    handleUpdateBalance,
    handleUpdateStatus,
    handleUpdateUser,
    handleResetPassword,
    handleResetPin,
    handleGetSystemLogs,
    handleGetMarketData,
    handleUpdateStockStatus,
    handleSyncStocks,
    handleGetMarketStatus,
    handleUpdateMarketStatus,
    handleGetSettings,
    handleUpdateSettings
};
