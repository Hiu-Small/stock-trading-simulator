import React, { useState, useRef, useContext } from 'react';
import axios from '../../setup/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './PINStep.scss';
import { UserContext } from '../../context/UserContext';

const PINStep = () => {
    const { updateUserStatus } = useContext(UserContext);
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef([]);
    const navigate = useNavigate();

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newPin = [...pin];
        newPin[index] = value.substring(value.length - 1);
        setPin(newPin);

        // Auto focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const pinString = pin.join('');
        if (pinString.length !== 6) {
            toast.warn("Vui lòng nhập đầy đủ 6 chữ số");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/setup-pin', { pin: pinString });
            if (response && +response.EC === 0) {
                toast.success("Thiết lập mã PIN thành công! Tài khoản của bạn đã được kích hoạt.");
                updateUserStatus('ACTIVE');
                // Chuyển hướng về trang chủ
                navigate('/');
                // Không cần reload nữa vì context đã được cập nhật
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi thiết lập mã PIN");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="onboarding-form pin-setup-form" onSubmit={handleSubmit}>
            <div className="pin-visual">
                <i className="fa-solid fa-shield-halved pin-icon"></i>
            </div>
            
            <p className="pin-description">
                Mã PIN gồm 6 chữ số dùng để xác thực mỗi khi đặt lệnh mua/bán cổ phiếu hoặc rút tiền. 
                Tuyệt đối không chia sẻ mã này.
            </p>

            <div className="pin-input-container">
                {pin.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="pin-digit-input"
                    />
                ))}
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>
        </form>
    );
};

export default PINStep;
