import db from '../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
require('dotenv').config();

const registerNewUser = async (userData) => {
    const t = await db.sequelize.transaction();
    try {
        // Kiểm tra email đã tồn tại chưa
        const emailExists = await db.UserAccount.findOne({
            where: { email: userData.email }
        });
        if (emailExists) {
            return { EM: 'Email đã tồn tại', EC: 1, DT: '' };
        }

        // Kiểm tra định dạng số điện thoại (10 số, bắt đầu bằng 0)
        const phoneRegex = /^[0-9]{10}$/;
        if (!userData.phone || !phoneRegex.test(userData.phone)) {
            return { EM: 'Số điện thoại phải là 10 chữ số', EC: 1, DT: '' };
        }
        if (!userData.phone.startsWith('0')) {
            return { EM: 'Số điện thoại phải bắt đầu bằng số 0', EC: 1, DT: '' };
        }

        // Kiểm tra số điện thoại đã tồn tại chưa
        const phoneExists = await db.UserAccount.findOne({
            where: { phone: userData.phone }
        });
        if (phoneExists) {
            return { EM: 'Số điện thoại đã tồn tại', EC: 1, DT: '' };
        }

        // Tự cấp số tài khoản và username: Q + 6 số cuối điện thoại
        const phone = userData.phone;
        const accountNumber = 'Q' + phone.substring(phone.length - 6);
        const username = accountNumber; // Username mặc định là số tài khoản

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const newUser = await db.UserAccount.create({
            account_number: accountNumber,
            username: username,
            email: userData.email,
            phone: userData.phone,
            password: hashedPassword,
            role: 'USER',
            status: 'UNVERIFIED'
        }, { transaction: t });

        // Create profile
        await db.UserProfile.create({
            user_id: newUser.id,
            full_name: userData.full_name || ''
        }, { transaction: t });

        // Lấy số dư ảo ban đầu từ cấu hình hệ thống (Settings)
        const initialBalanceSetting = await db.Setting.findOne({
            where: { key: 'initial_balance' }
        }, { transaction: t });
        const startBalance = initialBalanceSetting ? parseFloat(initialBalanceSetting.value) : 100000000;

        // Create wallet
        await db.Wallet.create({
            user_id: newUser.id,
            balance: startBalance
        }, { transaction: t });

        await t.commit();
        return { EM: 'Đăng ký thành công', EC: 0, DT: { account_number: accountNumber, username: username } };
    } catch (e) {
        await t.rollback();
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const completeKYC = async (userId, kycData) => {
    const t = await db.sequelize.transaction();
    try {
        const user = await db.UserAccount.findByPk(userId);
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        // Kiểm tra dữ liệu không được để trống
        if (!kycData.full_name || !kycData.dob || !kycData.id_card_number || 
            !kycData.id_card_issue_date || !kycData.id_card_issue_place || 
            !kycData.id_card_expiry_date || !kycData.address) {
            return { EM: 'Vui lòng nhập đầy đủ các trường thông tin bắt buộc', EC: 1, DT: '' };
        }

        // 1. Kiểm tra tính duy nhất của CCCD
        const idCardExists = await db.UserProfile.findOne({
            where: { 
                id_card_number: kycData.id_card_number,
                user_id: { [db.Sequelize.Op.ne]: userId }
            }
        });
        if (idCardExists) {
            return { EM: 'Số CMND/CCCD này đã được sử dụng cho tài khoản khác', EC: 1, DT: '' };
        }

        // 2. Kiểm tra độ tuổi (>= 18)
        const dob = new Date(kycData.dob);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        if (age < 18) {
            return { EM: 'Bạn phải đủ 18 tuổi để mở tài khoản chứng khoán', EC: 1, DT: '' };
        }

        // 3. Kiểm tra ngày hết hạn (Phải > ngày hiện tại ít nhất 1 tháng)
        const expiryDate = new Date(kycData.id_card_expiry_date);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        if (expiryDate < nextMonth) {
            return { EM: 'Giấy tờ định danh phải còn hạn trên 1 tháng', EC: 1, DT: '' };
        }

        // 4. Kiểm tra địa chỉ (>= 10 ký tự)
        if (!kycData.address || kycData.address.length < 10) {
            return { EM: 'Vui lòng cung cấp địa chỉ đầy đủ (tối thiểu 10 ký tự)', EC: 1, DT: '' };
        }

        const profile = await db.UserProfile.findOne({ where: { user_id: userId } });
        if (!profile) return { EM: 'Hồ sơ không tồn tại', EC: 1, DT: '' };

        // Cập nhật thông tin KYC
        await profile.update({
            full_name: kycData.full_name.toUpperCase(), // Tự động viết hoa tên
            dob: kycData.dob,
            gender: kycData.gender,
            id_card_number: kycData.id_card_number,
            id_card_issue_date: kycData.id_card_issue_date,
            id_card_issue_place: kycData.id_card_issue_place,
            id_card_expiry_date: kycData.id_card_expiry_date,
            address: kycData.address
        }, { transaction: t });

        // Cập nhật trạng thái tài khoản
        user.status = 'KYC_COMPLETED';
        await user.save({ transaction: t });

        await t.commit();
        return { EM: 'Hoàn tất KYC thành công', EC: 0, DT: '' };
    } catch (e) {
        await t.rollback();
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const setupPIN = async (userId, pin) => {
    try {
        const user = await db.UserAccount.findByPk(userId, {
            include: [{ model: db.Wallet, as: 'wallet' }]
        });
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        // Lưu mã PIN (có thể hash nếu cần bảo mật cao hơn)
        user.pin_code = pin;
        
        // Kiểm tra xem đây có phải lần đầu tiên kích hoạt ACTIVE không
        const isFirstActivation = user.status !== 'ACTIVE';
        user.status = 'ACTIVE'; // Kích hoạt tài khoản sau khi xong mã PIN
        await user.save();

        if (isFirstActivation) {
            // Lấy số dư hiện tại trong ví hoặc mặc định 200.000.000
            const balance = user.wallet ? user.wallet.balance : 200000000;
            const formattedBalance = parseFloat(balance).toLocaleString('vi-VN');

            // Tạo thông báo chào mừng & tặng vốn ảo trong lịch sử thông báo
            await db.UserHistory.create({
                user_id: userId,
                field_name: 'balance',
                old_value: '0',
                new_value: `Tài khoản của bạn vừa được Admin cộng thêm ${formattedBalance} ₫ vốn ảo. Lý do: Chào mừng bạn tham gia iBoard! Vì đây là trang web giả lập giao dịch chứng khoán dành cho người mới đầu tư, hệ thống đã cấp sẵn cho bạn ${formattedBalance} ₫ vốn ảo để bắt đầu luyện tập.`,
                change_type: 'SYSTEM_ADJUST_BALANCE',
                is_read: false
            });
        }

        return { EM: 'Thiết lập mã PIN thành công', EC: 0, DT: '' };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const loginUser = async (rawData) => {
    try {
        const { Op } = db.Sequelize;
        const user = await db.UserAccount.findOne({
            where: {
                [Op.or]: [
                    { username: rawData.username },
                    { phone: rawData.username }
                ]
            },
            include: [
                { model: db.Wallet, as: 'wallet' },
                { model: db.UserProfile, as: 'profile' }
            ]
        });

        if (!user) {
            return { EM: 'Tên đăng nhập hoặc mật khẩu không đúng', EC: 1, DT: '' };
        }

        const isPasswordCorrect = await bcrypt.compare(rawData.password, user.password);
        if (!isPasswordCorrect) {
            return { EM: 'Tên đăng nhập hoặc mật khẩu không đúng', EC: 1, DT: '' };
        }

        // Kiểm tra trạng thái tài khoản
        if (user.status === 'LOCKED') {
            return { EM: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ.', EC: 1, DT: '' };
        }

        // Generate JWT
        const payload = {
            id: user.id,
            username: user.username,
            account_number: user.account_number,
            role: user.role,
            email: user.email
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        return {
            EM: 'Đăng nhập thành công',
            EC: 0,
            DT: {
                access_token: token,
                user: {
                    account_number: user.account_number,
                    username: user.username,
                    full_name: user.profile ? user.profile.full_name : '',
                    role: user.role,
                    email: user.email,
                    balance: user.wallet ? user.wallet.balance : 0,
                    status: user.status
                }
            }
        };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const getFullUserProfile = async (userId) => {
    try {
        const user = await db.UserAccount.findOne({
            where: { id: userId },
            attributes: ['id', 'username', 'email', 'phone', 'account_number', 'status'],
            include: [
                { model: db.UserProfile, as: 'profile' },
                { 
                    model: db.UserHistory, 
                    as: 'histories',
                    order: [['createdAt', 'DESC']],
                    limit: 20
                }
            ]
        });

        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        return { EM: 'Lấy thông tin thành công', EC: 0, DT: user };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const updateUserProfile = async (userId, profileData) => {
    const t = await db.sequelize.transaction();
    try {
        const profile = await db.UserProfile.findOne({ where: { user_id: userId } });
        if (!profile) return { EM: 'Profile không tồn tại', EC: 1, DT: '' };

        // Các trường cho phép cập nhật
        const fieldsToUpdate = [
            'full_name', 'dob', 'gender', 'nationality', 
            'id_card_number', 'id_card_issue_date', 
            'id_card_issue_place', 'id_card_expiry_date', 'address'
        ];

        for (const field of fieldsToUpdate) {
            if (profileData[field] !== undefined && profileData[field] !== profile[field]) {
                // Lưu lịch sử
                await db.UserHistory.create({
                    user_id: userId,
                    field_name: field,
                    old_value: profile[field] ? String(profile[field]) : '',
                    new_value: String(profileData[field]),
                    change_type: 'PROFILE_UPDATE'
                }, { transaction: t });

                // Cập nhật giá trị
                profile[field] = profileData[field];
            }
        }

        await profile.save({ transaction: t });
        await t.commit();
        return { EM: 'Cập nhật thành công', EC: 0, DT: profile };
    } catch (e) {
        await t.rollback();
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const changePassword = async (userId, oldPassword, newPassword) => {
    const t = await db.sequelize.transaction();
    try {
        const user = await db.UserAccount.findByPk(userId);
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordCorrect) return { EM: 'Mật khẩu cũ không đúng', EC: 1, DT: '' };

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save({ transaction: t });

        // Lưu lịch sử
        await db.UserHistory.create({
            user_id: userId,
            field_name: 'password',
            old_value: '******',
            new_value: '******',
            change_type: 'PASSWORD_CHANGE'
        }, { transaction: t });

        await t.commit();
        return { EM: 'Đổi mật khẩu thành công', EC: 0, DT: '' };
    } catch (e) {
        await t.rollback();
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const changePin = async (userId, password, newPin) => {
    const t = await db.sequelize.transaction();
    try {
        const user = await db.UserAccount.findByPk(userId);
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };

        // Verify password first
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return { EM: 'Mật khẩu đăng nhập không đúng', EC: 1, DT: '' };

        const oldPin = user.pin_code;
        user.pin_code = newPin;
        await user.save({ transaction: t });

        // Lưu lịch sử
        await db.UserHistory.create({
            user_id: userId,
            field_name: 'pin_code',
            old_value: oldPin ? '****' : '',
            new_value: '****',
            change_type: 'PIN_CHANGE'
        }, { transaction: t });

        await t.commit();
        return { EM: 'Đổi mã PIN thành công', EC: 0, DT: '' };
    } catch (e) {
        await t.rollback();
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const getProfile = async (userId) => {
    try {
        const user = await db.UserAccount.findByPk(userId, {
            include: [
                { model: db.UserProfile, as: 'profile' },
                { model: db.Wallet, as: 'wallet' },
                {
                    model: db.UserHistory,
                    as: 'histories',
                    order: [['createdAt', 'DESC']],
                    limit: 30
                }
            ],
            attributes: { exclude: ['password', 'pin_code'] }
        });
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: '' };



        return { EM: 'Lấy thông tin thành công', EC: 0, DT: user };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const updateProfile = async (userId, data) => {
    const t = await db.sequelize.transaction();
    try {
        const user = await db.UserAccount.findByPk(userId);
        const profile = await db.UserProfile.findOne({ where: { user_id: userId } });
        
        if (!user || !profile) return { EM: 'Người dùng hoặc hồ sơ không tồn tại', EC: 1, DT: '' };

        await profile.update({
            full_name: data.full_name,
            dob: data.dob,
            gender: data.gender,
            id_card_number: data.id_card_number,
            id_card_issue_date: data.id_card_issue_date,
            id_card_issue_place: data.id_card_issue_place,
            id_card_expiry_date: data.id_card_expiry_date,
            address: data.address,
            nationality: data.nationality || profile.nationality
        }, { transaction: t });

        // Tự động cập nhật trạng thái nếu đã điền đủ thông tin KYC
        let newStatus = user.status;
        if (user.status === 'UNVERIFIED') {
            const isKycComplete = data.full_name && data.dob && data.id_card_number && 
                                data.id_card_issue_date && data.id_card_issue_place && 
                                data.id_card_expiry_date && data.address;
            
            if (isKycComplete) {
                user.status = 'KYC_COMPLETED';
                await user.save({ transaction: t });
                newStatus = 'KYC_COMPLETED';
            }
        }

        await t.commit();
        return { EM: 'Cập nhật thông tin thành công', EC: 0, DT: { status: newStatus } };
    } catch (e) {
        await t.rollback();
        console.log(e);
        return { EM: 'Lỗi hệ thống', EC: -1, DT: '' };
    }
};

const verifyPIN = async (userId, pin) => {
    try {
        const user = await db.UserAccount.findByPk(userId);
        if (!user) return { EM: 'Người dùng không tồn tại', EC: 1, DT: false };

        if (!user.pin_code) {
            return { EM: 'Bạn chưa thiết lập mã PIN giao dịch. Vui lòng thiết lập trong Cài đặt tài khoản.', EC: 2, DT: false };
        }

        if (user.pin_code !== pin) {
            return { EM: 'Mã PIN giao dịch không chính xác!', EC: 3, DT: false };
        }

        return { EM: 'Xác thực mã PIN thành công', EC: 0, DT: true };
    } catch (e) {
        console.log(e);
        return { EM: 'Lỗi hệ thống khi xác thực PIN', EC: -1, DT: false };
    }
};

export default {
    registerNewUser,
    loginUser,
    getFullUserProfile,
    updateUserProfile,
    changePassword,
    changePin,
    completeKYC,
    setupPIN,
    getProfile,
    updateProfile,
    verifyPIN
};

