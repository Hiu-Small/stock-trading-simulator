import authService from '../service/authService';
import db from "../models";

const handleRegister = async (req, res) => {
    try {
        if (!req.body.phone || !req.body.password || !req.body.email) {
            return res.status(200).json({
                EM: 'Vui lòng nhập đầy đủ SĐT, Email và Mật khẩu',
                EC: '1',
                DT: ''
            });
        }

        let data = await authService.registerNewUser(req.body);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log('>>> Error Register:', e);
        return res.status(500).json({
            EM: 'error from server',
            EC: '-1',
            DT: ''
        });
    }
};

const handleLogin = async (req, res) => {
    try {
        if (!req.body.username || !req.body.password) {
            return res.status(200).json({
                EM: 'Vui lòng nhập Số tài khoản hoặc Số điện thoại',
                EC: '1',
                DT: ''
            });
        }

        let data = await authService.loginUser(req.body);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        console.log('>>> Error Login:', e);
        return res.status(500).json({
            EM: 'error from server',
            EC: '-1',
            DT: ''
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy từ middleware verifyToken
        const data = await authService.getFullUserProfile(userId);
        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({ EM: 'error from server', EC: '-1', DT: '' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await authService.updateUserProfile(userId, req.body);
        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({ EM: 'error from server', EC: '-1', DT: '' });
    }
};

const handleChangePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(200).json({ EM: 'Vui lòng nhập mật khẩu cũ và mới', EC: 1, DT: '' });
        }
        const data = await authService.changePassword(userId, oldPassword, newPassword);
        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({ EM: 'error from server', EC: '-1', DT: '' });
    }
};

const handleChangePin = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password, newPin } = req.body;
        if (!password || !newPin) {
            return res.status(200).json({ EM: 'Vui lòng nhập mật khẩu và mã PIN mới', EC: 1, DT: '' });
        }
        const data = await authService.changePin(userId, password, newPin);
        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({ EM: 'error from server', EC: '-1', DT: '' });
    }
};

const handleCompleteKYC = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await authService.completeKYC(userId, req.body);
        return res.status(200).json(data);
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'error from server', EC: '-1', DT: '' });
    }
};

const handleSetupPIN = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pin } = req.body;
        if (!pin || pin.length !== 6) {
            return res.status(200).json({ EM: 'Mã PIN phải gồm 6 chữ số', EC: 1, DT: '' });
        }
        const data = await authService.setupPIN(userId, pin);
        return res.status(200).json(data);
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'error from server', EC: '-1', DT: '' });
    }
};

const handleGetProfile = async (req, res) => {
    try {
        const data = await authService.getProfile(req.user.id);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        return res.status(500).json({
            EM: 'Lỗi server',
            EC: -1,
            DT: ''
        });
    }
};

const handleUpdateProfile = async (req, res) => {
    try {
        const data = await authService.updateProfile(req.user.id, req.body);
        return res.status(200).json({
            EM: data.EM,
            EC: data.EC,
            DT: data.DT
        });
    } catch (e) {
        return res.status(500).json({
            EM: 'Lỗi server',
            EC: -1,
            DT: ''
        });
    }
};

const handleVerifyPin = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pin } = req.body;
        if (!pin || pin.length !== 6) {
            return res.status(200).json({ EM: 'Mã PIN phải gồm 6 chữ số', EC: 1, DT: false });
        }
        const data = await authService.verifyPIN(userId, pin);
        return res.status(200).json(data);
    } catch (e) {
        console.log(e);
        return res.status(500).json({ EM: 'Lỗi hệ thống khi xác thực PIN', EC: -1, DT: false });
    }
};

const handleMarkAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await db.UserHistory.update({ is_read: true }, {
            where: { user_id: userId, is_read: false }
        });
        return res.status(200).json({ EM: 'Đánh dấu đọc tất cả thành công', EC: 0, DT: '' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleMarkNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const notif = await db.UserHistory.findOne({
            where: { id: id, user_id: userId }
        });
        
        if (!notif) {
            return res.status(200).json({ EM: 'Không tìm thấy thông báo', EC: 1, DT: '' });
        }
        
        const nextReadState = !notif.is_read;
        await notif.update({ is_read: nextReadState });
        
        return res.status(200).json({ 
            EM: `Đã đánh dấu là ${nextReadState ? 'đã đọc' : 'chưa đọc'}`, 
            EC: 0, 
            DT: { is_read: nextReadState } 
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

export default {
    handleRegister,
    handleLogin,
    getProfile,
    updateProfile,
    handleChangePassword,
    handleChangePin,
    handleCompleteKYC,
    handleSetupPIN,
    handleGetProfile,
    handleUpdateProfile,
    handleVerifyPin,
    handleMarkAllNotificationsRead,
    handleMarkNotificationRead
};

