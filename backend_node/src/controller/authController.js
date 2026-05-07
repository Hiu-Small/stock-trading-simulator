import authService from '../service/authService';

const handleRegister = async (req, res) => {
    try {
        if (!req.body.username || !req.body.password || !req.body.email) {
            return res.status(200).json({
                EM: 'Vui lòng nhập đầy đủ thông tin',
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
                EM: 'Vui lòng nhập tên đăng nhập và mật khẩu',
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

export default {
    handleRegister,
    handleLogin
};
