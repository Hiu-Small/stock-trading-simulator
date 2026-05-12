import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { updateUser, resetPassword, resetPin } from '../../../services/adminService';
import './EditUserModal.scss';

const EditUserModal = ({ show, handleClose, userData, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        userId: '',
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

    // Helper to format date string to DD/MM/YYYY for text input
    const formatDateForDisplay = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to convert DD/MM/YYYY back to YYYY-MM-DD for backend
    const formatDateForBackend = (displayDate) => {
        if (!displayDate || !displayDate.includes('/')) return displayDate;
        const parts = displayDate.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return displayDate;
    };

    // Helper to convert YYYY-MM-DD from picker to DD/MM/YYYY
    const convertPickerToDisplay = (pickerDate) => {
        if (!pickerDate) return '';
        const parts = pickerDate.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return pickerDate;
    };

    useEffect(() => {
        if (userData) {
            setFormData({
                userId: userData.id || '',
                full_name: userData.profile?.full_name || '',
                email: userData.email || '',
                phone: userData.phone || '',
                role: userData.role || 'USER',
                id_card_number: userData.profile?.id_card_number || '',
                dob: formatDateForDisplay(userData.profile?.dob),
                gender: userData.profile?.gender || 'Nam',
                id_card_issue_date: formatDateForDisplay(userData.profile?.id_card_issue_date),
                id_card_issue_place: userData.profile?.id_card_issue_place || '',
                id_card_expiry_date: formatDateForDisplay(userData.profile?.id_card_expiry_date),
                address: userData.profile?.address || ''
            });
        }
    }, [userData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            // Convert dates back to YYYY-MM-DD before sending
            const dataToSend = {
                ...formData,
                dob: formatDateForBackend(formData.dob),
                id_card_issue_date: formatDateForBackend(formData.id_card_issue_date),
                id_card_expiry_date: formatDateForBackend(formData.id_card_expiry_date)
            };
            const res = await updateUser(dataToSend);
            if (res && +res.EC === 0) {
                toast.success("Cập nhật thông tin người dùng thành công!");
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
            <Modal.Header closeButton>
                <Modal.Title>Chỉnh sửa thông tin người dùng</Modal.Title>
            </Modal.Header>
            <div className="modal-tabs">
                <button 
                    className={`tab-item ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    Thông tin chung
                </button>
                <button 
                    className={`tab-item ${activeTab === 'kyc' ? 'active' : ''}`}
                    onClick={() => setActiveTab('kyc')}
                >
                    Định danh (KYC)
                </button>
                <button 
                    className={`tab-item ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    Bảo mật
                </button>
            </div>
            <Modal.Body>
                {activeTab === 'general' && (
                    <div className="tab-content">
                        <div className="form-group">
                            <label>Họ và tên</label>
                            <input 
                                type="text" 
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                placeholder="Nhập họ tên"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="example@gmail.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input 
                                type="text" 
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="Nhập số điện thoại"
                            />
                        </div>
                        <div className="form-group">
                            <label>Quyền hạn</label>
                            <select name="role" value={formData.role} onChange={handleInputChange}>
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'kyc' && (
                    <div className="tab-content scrollable">
                        <div className="form-group">
                            <label>Số CMND/CCCD</label>
                            <input 
                                type="text" 
                                name="id_card_number"
                                value={formData.id_card_number}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="row">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label>Ngày sinh</label>
                                    <div className="date-input-wrapper">
                                        <input 
                                            type="text" 
                                            name="dob"
                                            value={formData.dob}
                                            onChange={handleInputChange}
                                            placeholder="DD/MM/YYYY"
                                        />
                                        <input 
                                            type="date" 
                                            className="hidden-date-picker"
                                            onChange={(e) => setFormData(prev => ({ ...prev, dob: convertPickerToDisplay(e.target.value) }))}
                                        />
                                        <i className="fa-regular fa-calendar-days calendar-icon"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label>Giới tính</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange}>
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label>Ngày cấp</label>
                                    <div className="date-input-wrapper">
                                        <input 
                                            type="text" 
                                            name="id_card_issue_date"
                                            value={formData.id_card_issue_date}
                                            onChange={handleInputChange}
                                            placeholder="DD/MM/YYYY"
                                        />
                                        <input 
                                            type="date" 
                                            className="hidden-date-picker"
                                            onChange={(e) => setFormData(prev => ({ ...prev, id_card_issue_date: convertPickerToDisplay(e.target.value) }))}
                                        />
                                        <i className="fa-regular fa-calendar-days calendar-icon"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-group">
                                    <label>Ngày hết hạn</label>
                                    <div className="date-input-wrapper">
                                        <input 
                                            type="text" 
                                            name="id_card_expiry_date"
                                            value={formData.id_card_expiry_date}
                                            onChange={handleInputChange}
                                            placeholder="DD/MM/YYYY"
                                        />
                                        <input 
                                            type="date" 
                                            className="hidden-date-picker"
                                            onChange={(e) => setFormData(prev => ({ ...prev, id_card_expiry_date: convertPickerToDisplay(e.target.value) }))}
                                        />
                                        <i className="fa-regular fa-calendar-days calendar-icon"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Nơi cấp CCCD (Tỉnh/Thành phố)</label>
                            <input 
                                type="text" 
                                name="id_card_issue_place"
                                value={formData.id_card_issue_place}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Địa chỉ liên hệ</label>
                            <textarea 
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                            ></textarea>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="tab-content">
                        <div className="security-card">
                            <div className="card-icon">
                                <i className="fa-solid fa-lock"></i>
                            </div>
                            <div className="card-info">
                                <h6>Reset Mật khẩu</h6>
                                <p>Hệ thống sẽ đặt lại mật khẩu của người dùng về mặc định: <strong>12345678</strong></p>
                            </div>
                            <button className="btn-reset" onClick={handleResetPass}>Reset Password</button>
                        </div>

                        <div className="security-card">
                            <div className="card-icon">
                                <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <div className="card-info">
                                <h6>Reset Mã PIN</h6>
                                <p>Hệ thống sẽ đặt lại mã PIN giao dịch về mặc định: <strong>123456</strong></p>
                            </div>
                            <button className="btn-reset" onClick={handleResetPinAction}>Reset PIN</button>
                        </div>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button className="btn-cancel" onClick={handleClose}>Hủy</button>
                <button className="btn-save" onClick={handleSubmit}>Lưu thay đổi</button>
            </Modal.Footer>

            {/* Confirmation Modal */}
            <Modal 
                show={confirmModal.show} 
                onHide={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                centered
                size="sm"
                className="confirm-sub-modal"
            >
                <Modal.Body className="text-center py-4">
                    <div className="confirm-icon mb-3">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h5>{confirmModal.title}</h5>
                    <p>{confirmModal.message}</p>
                </Modal.Body>
                <Modal.Footer className="justify-content-center border-0 pb-4">
                    <button 
                        className="btn-confirm-cancel" 
                        onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        className="btn-confirm-ok" 
                        onClick={confirmModal.onConfirm}
                    >
                        Xác nhận
                    </button>
                </Modal.Footer>
            </Modal>
        </Modal>
    );
};

export default EditUserModal;
