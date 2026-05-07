import db from '../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
require('dotenv').config();

const registerNewUser = async (userData) => {
    try {
        // Check if user exists
        const userExists = await db.User.findOne({
            where: { username: userData.username }
        });
        if (userExists) {
            return {
                EM: 'Tên đăng nhập đã tồn tại',
                EC: 1,
                DT: ''
            };
        }

        const emailExists = await db.User.findOne({
            where: { email: userData.email }
        });
        if (emailExists) {
            return {
                EM: 'Email đã tồn tại',
                EC: 1,
                DT: ''
            };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        await db.User.create({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            role: 'USER',
            balance: 100000000.00 // 100 triệu
        });

        return {
            EM: 'Đăng ký thành công',
            EC: 0,
            DT: ''
        };
    } catch (e) {
        console.log(e);
        return {
            EM: 'Lỗi hệ thống',
            EC: -1,
            DT: ''
        };
    }
};

const loginUser = async (rawData) => {
    try {
        const user = await db.User.findOne({
            where: { username: rawData.username }
        });

        if (!user) {
            return {
                EM: 'Tên đăng nhập hoặc mật khẩu không đúng',
                EC: 1,
                DT: ''
            };
        }

        const isPasswordCorrect = await bcrypt.compare(rawData.password, user.password);
        if (!isPasswordCorrect) {
            return {
                EM: 'Tên đăng nhập hoặc mật khẩu không đúng',
                EC: 1,
                DT: ''
            };
        }

        // Generate JWT
        const payload = {
            id: user.id,
            username: user.username,
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
                    username: user.username,
                    role: user.role,
                    email: user.email,
                    balance: user.balance
                }
            }
        };
    } catch (e) {
        console.log(e);
        return {
            EM: 'Lỗi hệ thống',
            EC: -1,
            DT: ''
        };
    }
};

export default {
    registerNewUser,
    loginUser
};
