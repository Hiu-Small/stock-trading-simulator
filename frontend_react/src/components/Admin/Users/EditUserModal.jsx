import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { updateUser, resetPassword, resetPin } from '../../../services/adminService';
import { useTranslation } from '../../../context/LanguageContext';
import './EditUserModal.scss';

const EditUserModal = ({ show, handleClose, userData, onSuccess }) => {
    const { t, lang } = useTranslation();
    const [formData, setFormData] = useState({
        userId: '',
        account_number: '',
        full_name: '',
        email: '',
        phone: '',
        role: 'USER',
        id_card_number: '',
        dob: '',
        gender: 'Nam',
        id_card_issue_date: '',
        id_card_issue_place: '',
        id_card_expiry_date: '',
        address: ''
    });

    // Helper to format date string to YYYY-MM-DD for date input
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            // Get local date components to avoid timezone shifts
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return '';
        }
    };

    useEffect(() => {
        if (userData) {
            setFormData({
                userId: userData.id || '',
                account_number: userData.account_number || '',
                full_name: (userData.profile?.full_name || '').toUpperCase(),
                email: userData.email || '',
                phone: userData.phone || '',
                role: userData.role || 'USER',
                id_card_number: userData.profile?.id_card_number || '',
                dob: formatDateForInput(userData.profile?.dob),
                gender: userData.profile?.gender || 'Nam',
                id_card_issue_date: formatDateForInput(userData.profile?.id_card_issue_date),
                id_card_issue_place: userData.profile?.id_card_issue_place || '',
                id_card_expiry_date: formatDateForInput(userData.profile?.id_card_expiry_date),
                address: userData.profile?.address || ''
            });
        }
    }, [userData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'phone') {
            // Only allow numbers and limit to 10 digits
            const numericValue = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: numericValue }));
            return;
        }

        if (name === 'full_name') {
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
            return;
        }
        
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (formData.phone && formData.phone.length !== 10) {
            toast.error("Số điện thoại phải có đúng 10 chữ số!");
            return;
        }
        try {
            const dataToSend = {
                ...formData
            };
            const res = await updateUser(dataToSend);
            if (res && +res.EC === 0) {
                toast.success("Cập nhật thành công!");
                onSuccess();
                handleClose();
            } else {
                toast.error(res.EM);
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi hệ thống khi cập nhật");
        }
    };

    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: null
    });

    const handleResetPass = () => {
        setConfirmModal({
            show: true,
            title: 'Reset Mật khẩu',
            message: 'Bạn có chắc chắn muốn đặt lại mật khẩu về mặc định (12345678)?',
            onConfirm: async () => {
                try {
                    const res = await resetPassword(formData.userId);
                    if (res && +res.EC === 0) {
                        toast.success(res.EM);
                    } else {
                        toast.error(res.EM);
                    }
                } catch (error) {
                    toast.error("Lỗi khi reset mật khẩu");
                }
                setConfirmModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    const handleResetPinAction = () => {
        setConfirmModal({
            show: true,
            title: 'Reset Mã PIN',
            message: 'Bạn có chắc chắn muốn đặt lại mã PIN giao dịch về mặc định (123456)?',
            onConfirm: async () => {
                try {
                    const res = await resetPin(formData.userId);
                    if (res && +res.EC === 0) {
                        toast.success(res.EM);
                    } else {
                        toast.error(res.EM);
                    }
                } catch (error) {
                    toast.error("Lỗi khi reset mã PIN");
                }
                setConfirmModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg" className="edit-user-modal">
            <Modal.Header>
                <Modal.Title>{t("admin.users.modalEditTitle")}</Modal.Title>
                <button className="btn-close" onClick={handleClose}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </Modal.Header>
            <Modal.Body className="edit-modal-scrollable">
                <div className="edit-section-header">{t("admin.users.accountInfo") || (lang === "vi" ? "Thông tin tài khoản" : "Account Information")}</div>
                <div className="row">
                    <div className="col-md-4">
                        <div className="form-group">
                            <label>{t("admin.users.accountNumber") || (lang === "vi" ? "Số tài khoản" : "Account Number")}</label>
                            <input type="text" value={formData.account_number} readOnly className="readonly-input" />
                        </div>
                    </div>
                    <div className="col-md-8">
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{lang === "vi" ? "Số điện thoại" : "Phone Number"}</label>
                            <input 
                                type="text" 
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleInputChange} 
                                maxLength="10"
                                placeholder={lang === "vi" ? "VD: 0912345678" : "e.g. 0912345678"}
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{lang === "vi" ? "Quyền hạn" : "Role"}</label>
                            <select name="role" value={formData.role} onChange={handleInputChange}>
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    </div>
                </div>

                <hr className="my-4 border-secondary opacity-25" />

                <div className="edit-section-header">{lang === "vi" ? "Thông tin cá nhân & Định danh" : "Personal Information & Identification"}</div>
                <div className="form-group">
                    <label>{lang === "vi" ? "Họ và tên" : "Full Name"}</label>
                    <input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{lang === "vi" ? "Ngày sinh" : "Date of Birth"}</label>
                            <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{lang === "vi" ? "Giới tính" : "Gender"}</label>
                            <select name="gender" value={formData.gender} onChange={handleInputChange}>
                                <option value="Nam">{lang === "vi" ? "Nam" : "Male"}</option>
                                <option value="Nữ">{lang === "vi" ? "Nữ" : "Female"}</option>
                                <option value="Khác">{lang === "vi" ? "Khác" : "Other"}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label>{lang === "vi" ? "Số CMND/CCCD" : "ID Card Number"}</label>
                    <input type="text" name="id_card_number" value={formData.id_card_number} onChange={handleInputChange} />
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{lang === "vi" ? "Ngày cấp" : "Issue Date"}</label>
                            <input type="date" name="id_card_issue_date" value={formData.id_card_issue_date} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>{lang === "vi" ? "Ngày hết hạn" : "Expiry Date"}</label>
                            <input type="date" name="id_card_expiry_date" value={formData.id_card_expiry_date} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label>{lang === "vi" ? "Nơi cấp" : "Issue Place"}</label>
                    <input type="text" name="id_card_issue_place" value={formData.id_card_issue_place} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label>{lang === "vi" ? "Địa chỉ" : "Address"}</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows="3"></textarea>
                </div>

                <hr className="my-4 border-secondary opacity-25" />

                <div className="edit-section-header">{lang === "vi" ? "Bảo mật & Hệ thống" : "Security & System"}</div>
                <div className="security-actions">
                    <button className="btn btn-outline-warning w-100 mb-2" onClick={handleResetPass}>
                        <i className="fa-solid fa-key me-2"></i> {lang === "vi" ? "Reset Mật khẩu (12345678)" : "Reset Password (12345678)"}
                    </button>
                    <button className="btn btn-outline-info w-100" onClick={handleResetPinAction}>
                        <i className="fa-solid fa-shield me-2"></i> {lang === "vi" ? "Reset mã PIN (123456)" : "Reset PIN (123456)"}
                    </button>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-secondary" onClick={handleClose}>{t("sidebar.createWatchlistCancel")}</button>
                <button className="btn btn-primary" onClick={handleSubmit}>{lang === "vi" ? "Lưu thay đổi" : "Save Changes"}</button>
            </Modal.Footer>

            <Modal 
                show={confirmModal.show} 
                onHide={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                centered
                size="sm"
                className="confirm-sub-modal"
            >
                <Modal.Body className="text-center py-4 bg-dark text-white rounded">
                    <div className="confirm-icon mb-3 text-warning">
                        <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
                    </div>
                    <h5 className="mb-2">{confirmModal.title}</h5>
                    <p className="small mb-4">{confirmModal.message}</p>
                    <div className="d-flex gap-2 justify-content-center">
                        <button className="btn btn-sm btn-secondary" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>Hủy bỏ</button>
                        <button className="btn btn-sm btn-primary" onClick={confirmModal.onConfirm}>Xác nhận</button>
                    </div>
                </Modal.Body>
            </Modal>
        </Modal>
    );
};

export default EditUserModal;
