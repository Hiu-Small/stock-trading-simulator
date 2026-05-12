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
        const data = await adminService.getSystemLogs();
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
    handleUpdateBalance,
    handleUpdateStatus,
    handleUpdateUser,
    handleResetPassword,
    handleResetPin,
    handleGetSystemLogs
};
