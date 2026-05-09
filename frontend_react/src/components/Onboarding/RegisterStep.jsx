import React, { useState } from 'react';
import axios from '../../setup/axios';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import './RegisterStep.scss';

const RegisterStep = () => {
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!agree) {
            toast.warn("Vui lòng đồng ý với điều khoản sử dụng");
            return;
        }

        // Validate số điện thoại (chỉ số, đúng 10 số)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            toast.error("Số điện thoại phải là 10 chữ số");
            return;
        }
        if (!phone.startsWith('0')) {
            toast.error("Số điện thoại phải bắt đầu bằng số 0");
            return;
        }

        // Validate mật khẩu
        if (password.length < 8) {
            toast.error("Mật khẩu phải có ít nhất 8 ký tự");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/register', {
                phone, email, password
            });

            if (response && +response.EC === 0) {
                toast.success(
                    <div>
                        <strong>Khởi tạo tài khoản thành công!</strong>
                        <br />
                        Số tài khoản của bạn là: <span style={{color: '#ffeb3b', fontWeight: '700'}}>{response.DT.account_number}</span>
                        <br />
                        Vui lòng dùng Số tài khoản hoặc SĐT để đăng nhập.
                    </div>, 
                    { autoClose: 10000 }
                );
                // Lưu thông tin tạm thời hoặc yêu cầu đăng nhập
                // Theo yêu cầu, sau khi đăng ký có thể tự động đăng nhập hoặc dẫn tới trang KYC
                // Ở đây ta dẫn tới trang đăng nhập để bảo mật
                navigate('/');
                // Hoặc nếu muốn mượt hơn, ta có thể lưu token vào context nếu API trả về
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi hệ thống khi đăng ký");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="onboarding-form" onSubmit={handleRegister}>
            <div className="form-group-row">
                <div className="form-group">
                    <label>Số điện thoại <span className="required">*</span></label>
                    <input 
                        type="text" 
                        placeholder="Nhập số điện thoại" 
                        value={phone}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                            setPhone(val);
                        }}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Email <span className="required">*</span></label>
                    <input 
                        type="email" 
                        placeholder="Nhập email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
            </div>
            
            <div className="form-group-row">
                <div className="form-group">
                    <label>Mật khẩu <span className="required">*</span></label>
                    <div className="input-with-icon">
                        <input 
                            type="password" 
                            placeholder="Nhập mật khẩu" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Mã người giới thiệu (Nếu có)</label>
                    <input 
                        type="text" 
                        placeholder="Nhập mã giới thiệu" 
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                    />
                </div>
            </div>

            <div className="form-checkbox">
                <input 
                    type="checkbox" 
                    id="agree" 
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                />
                <label htmlFor="agree">
                    Tôi xác nhận đã đọc, hiểu và đồng ý với <Link to="#">Điều kiện và điều khoản</Link>, 
                    <Link to="#">Chính sách bảo mật</Link> và <Link to="#">Quy chế hoạt động</Link> của công ty.
                </label>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Mở tài khoản'}
            </button>

            <div className="form-footer">
                Đã có tài khoản? <Link to="/">Đăng nhập ngay</Link>
            </div>
        </form>
    );
};

export default RegisterStep;
