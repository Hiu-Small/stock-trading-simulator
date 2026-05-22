import React, { useState, useContext } from 'react';
import axios from '../../setup/axios';
import { toast } from 'react-toastify';
import { useTranslation } from '../../context/LanguageContext';
import './KYCStep.scss';
import { UserContext } from '../../context/UserContext';

const KYCStep = (props) => {
    const { t } = useTranslation();
    const { updateUserStatus } = useContext(UserContext);
    const [formData, setFormData] = useState({
        full_name: '',
        dob: '',
        gender: 'Nam',
        id_card_number: '',
        id_card_issue_date: '',
        id_card_issue_place: '',
        id_card_expiry_date: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const validateForm = () => {
        const { full_name, dob, id_card_number, id_card_expiry_date, address } = formData;
        
        // 1. Validate Họ tên
        // Chỉ kiểm tra có nhập hay không
        if (!full_name || full_name.trim() === "") {
            toast.error(t("onboarding.toastNameRequired"));
            return false;
        }
        if (full_name.trim().split(/\s+/).length < 2) {
            toast.error(t("onboarding.toastNameWords"));
            return false;
        }

        // 2. Validate Tuổi (>= 18)
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 18) {
            toast.error(t("onboarding.toastAgeLimit"));
            return false;
        }

        // 3. Validate CCCD (9 hoặc 12 số)
        const idRegex = /^\d+$/;
        if (!idRegex.test(id_card_number) || (id_card_number.length !== 9 && id_card_number.length !== 12)) {
            toast.error(t("onboarding.toastIdDigits"));
            return false;
        }

        // 4. Validate Ngày hết hạn (> 1 tháng tính từ hiện tại)
        const expiry = new Date(id_card_expiry_date);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        if (expiry < nextMonth) {
            toast.error(t("onboarding.toastExpiryLimit"));
            return false;
        }

        // 5. Validate Địa chỉ (>= 10 ký tự)
        if (address.length < 10) {
            toast.error(t("onboarding.toastAddressLength"));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setLoading(true);
        try {
            const response = await axios.post('/api/complete-kyc', formData);
            if (response && +response.EC === 0) {
                toast.success(t("onboarding.toastKycSuccess"));
                updateUserStatus('KYC_COMPLETED');
                props.onNext();
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            console.error(error);
            toast.error(t("onboarding.toastKycError"));
        } finally {
            setLoading(false);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const maxDob = new Date();
    maxDob.setFullYear(maxDob.getFullYear() - 18);
    const maxDobStr = maxDob.toISOString().split('T')[0];
    const minExpiry = new Date();
    minExpiry.setMonth(minExpiry.getMonth() + 1);
    const minExpiryStr = minExpiry.toISOString().split('T')[0];

    return (
        <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="info-box">
                <i className="fa-solid fa-circle-info"></i>
                <span>{t("onboarding.kycInfoBox")}</span>
            </div>

            <div className="form-group">
                <label>{t("onboarding.fullNameLabel")} <span className="required">*</span></label>
                <input 
                    name="full_name"
                    type="text" 
                    placeholder={t("onboarding.fullNamePlaceholder")} 
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value.toUpperCase()})}
                    required
                />
            </div>

            <div className="form-group-row">
                <div className="form-group">
                    <label>{t("onboarding.dobLabel")} <span className="required">*</span></label>
                    <input 
                        name="dob"
                        type="date" 
                        max={maxDobStr}
                        value={formData.dob}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>{t("onboarding.genderLabel")} <span className="required">*</span></label>
                    <select name="gender" value={formData.gender} onChange={handleChange}>
                        <option value="Nam">{t("onboarding.genderMale")}</option>
                        <option value="Nữ">{t("onboarding.genderFemale")}</option>
                        <option value="Khác">{t("onboarding.genderOther")}</option>
                    </select>
                </div>
            </div>

            <div className="form-group-row">
                <div className="form-group">
                    <label>{t("onboarding.idCardLabel")} <span className="required">*</span></label>
                    <input 
                        name="id_card_number"
                        type="text" 
                        placeholder={t("onboarding.idCardPlaceholder")} 
                        value={formData.id_card_number}
                        onChange={(e) => setFormData({...formData, id_card_number: e.target.value.replace(/\D/g, '').substring(0, 12)})}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>{t("onboarding.issuePlaceLabel")} <span className="required">*</span></label>
                    <input 
                        name="id_card_issue_place"
                        type="text" 
                        placeholder={t("onboarding.issuePlacePlaceholder")} 
                        value={formData.id_card_issue_place}
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>

            <div className="form-group-row">
                <div className="form-group">
                    <label>{t("onboarding.issueDateLabel")} <span className="required">*</span></label>
                    <input 
                        name="id_card_issue_date"
                        type="date" 
                        max={todayStr}
                        value={formData.id_card_issue_date}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>{t("onboarding.expiryDateLabel")} <span className="required">*</span></label>
                    <input 
                        name="id_card_expiry_date"
                        type="date" 
                        min={minExpiryStr}
                        value={formData.id_card_expiry_date}
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>

            <div className="form-group">
                <label>{t("onboarding.addressLabel")} <span className="required">*</span></label>
                <textarea 
                    name="address"
                    rows="3"
                    placeholder={t("onboarding.addressPlaceholder")}
                    value={formData.address}
                    onChange={handleChange}
                    required
                ></textarea>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? t("onboarding.sending") : t("onboarding.continueBtn")}
            </button>
        </form>
    );
};

export default KYCStep;
