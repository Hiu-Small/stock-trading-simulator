import React, { useState, useRef, useContext } from 'react';
import axios from '../../setup/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import './PINStep.scss';
import { UserContext } from '../../context/UserContext';

const PINStep = () => {
    const { t } = useTranslation();
    const { updateUserStatus, refreshBalance } = useContext(UserContext);
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
            toast.warn(t("onboarding.toastPinDigits"));
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/setup-pin', { pin: pinString });
            if (response && +response.EC === 0) {
                toast.success(
                    <div>
                        <strong style={{ fontSize: '13px' }}>{t("onboarding.toastPinSuccess")}</strong>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#ffeb3b', fontWeight: '500', lineHeight: '1.4' }}>
                            💡 {t("onboarding.toastCapitalGrant")}
                        </div>
                    </div>, 
                    { autoClose: 15000 }
                );
                updateUserStatus('ACTIVE');
                if (refreshBalance) {
                    refreshBalance();
                }
                // Chuyển hướng về trang chủ
                navigate('/');
                // Không cần reload nữa vì context đã được cập nhật
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            console.error(error);
            toast.error(t("onboarding.toastPinError"));
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
                {t("onboarding.pinDesc")}
            </p>

            <div className="pin-input-container">
                {pin.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="password"
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
                {loading ? t("onboarding.confirming") : t("onboarding.confirmBtn")}
            </button>
        </form>
    );
};

export default PINStep;
