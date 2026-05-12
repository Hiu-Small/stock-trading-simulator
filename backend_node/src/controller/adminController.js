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

const handleUpdateBalance = async (req, res) => {
    try {
        const data = await adminService.updateUserBalance({
            ...req.body,
            adminId: req.user.id
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
            adminId: req.user.id
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
        const data = await adminService.updateUserInfo(req.body);
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
        const data = await adminService.resetPassword(userId, adminId);
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
        const data = await adminService.resetPin(userId, adminId);
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

export default {
    handleGetAllUsers,
    handleUpdateBalance,
    handleUpdateStatus,
    handleUpdateUser,
    handleResetPassword,
    handleResetPin
};
