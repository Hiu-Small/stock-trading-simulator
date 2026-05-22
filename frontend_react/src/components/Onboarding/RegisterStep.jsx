import React, { useState } from 'react';
import axios from '../../setup/axios';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';
import './RegisterStep.scss';

const RegisterStep = () => {
    const { t, lang } = useTranslation();
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const renderToastAccNo = (accNum) => {
        const text = t("onboarding.toastAccNo");
        const parts = text.split("{account}");
        return (
            <>
                {parts[0]}
                <span style={{color: '#ffeb3b', fontWeight: '700'}}>{accNum}</span>
                {parts[1]}
            </>
        );
    };

    const renderAgreeText = () => {
        const text = t("onboarding.agreeCheckbox");
        const parts = text.split(/(\{terms\}|\{privacy\}|\{policy\})/g);
        return parts.map((part, index) => {
            if (part === "{terms}") {
                return <Link key={index} to="#">{t("onboarding.termsText")}</Link>;
            }
            if (part === "{privacy}") {
                return <Link key={index} to="#">{t("onboarding.privacyText")}</Link>;
            }
            if (part === "{policy}") {
                return <Link key={index} to="#">{t("onboarding.policyText")}</Link>;
            }
            return part;
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!agree) {
            toast.warn(t("onboarding.toastAgree"));
            return;
        }

        // Validate số điện thoại (chỉ số, đúng 10 số)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            toast.error(t("onboarding.toastPhoneDigits"));
            return;
        }
        if (!phone.startsWith('0')) {
            toast.error(t("onboarding.toastPhoneStart"));
            return;
        }

        // Validate mật khẩu
        if (password.length < 8) {
            toast.error(t("onboarding.toastPasswordLength"));
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
                        <strong>{t("onboarding.toastRegisterSuccess")}</strong>
                        <br />
                        {renderToastAccNo(response.DT.account_number)}
                        <br />
                        {t("onboarding.toastLoginGuide")}
                    </div>, 
                    { autoClose: 10000 }
                );
                navigate('/');
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            console.error(error);
            toast.error(t("onboarding.toastRegisterError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="onboarding-form" onSubmit={handleRegister}>
            <div className="form-group-row">
                <div className="form-group">
                    <label>{t("onboarding.phoneLabel")} <span className="required">*</span></label>
                    <input 
                        type="text" 
                        placeholder={t("onboarding.phonePlaceholder")} 
                        value={phone}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                            setPhone(val);
                        }}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>{t("onboarding.emailLabel")} <span className="required">*</span></label>
                    <input 
                        type="email" 
                        placeholder={t("onboarding.emailPlaceholder")} 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
            </div>
            
            <div className="form-group-row">
                <div className="form-group">
                    <label>{t("onboarding.passwordLabel")} <span className="required">*</span></label>
                    <div className="input-with-icon">
                        <input 
                            type="password" 
                            placeholder={t("onboarding.passwordPlaceholder")} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>{t("onboarding.referralLabel")}</label>
                    <input 
                        type="text" 
                        placeholder={t("onboarding.referralPlaceholder")} 
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
                    {renderAgreeText()}
                </label>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? t("onboarding.processing") : t("onboarding.openAccountBtn")}
            </button>

            <div className="form-footer">
                {t("onboarding.hasAccountText")} <Link to="/">{t("onboarding.loginNowLink")}</Link>
            </div>
        </form>
    );
};

export default RegisterStep;
