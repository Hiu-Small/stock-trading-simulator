import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { updateUser, resetPassword, resetPin } from '../../../services/adminService';
import './EditUserModal.scss';

const EditUserModal = ({ show, handleClose, userData, onSuccess }) => {
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
            const dataToSend = {
                ...formData,
                dob: formatDateForBackend(formData.dob),
                id_card_issue_date: formatDateForBackend(formData.id_card_issue_date),
                id_card_expiry_date: formatDateForBackend(formData.id_card_expiry_date)
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
            <Modal.Header closeButton>
                <Modal.Title>Chỉnh sửa thông tin người dùng</Modal.Title>
            </Modal.Header>
            <Modal.Body className="edit-modal-scrollable">
                <div className="edit-section-header">Thông tin tài khoản</div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Quyền hạn</label>
                            <select name="role" value={formData.role} onChange={handleInputChange}>
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    </div>
                </div>

                <hr className="my-4 border-secondary opacity-25" />

                <div className="edit-section-header">Thông tin cá nhân & Định danh</div>
                <div className="form-group">
                    <label>Họ và tên</label>
                    <input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} />
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Ngày sinh (dd/mm/yyyy)</label>
                            <input type="text" name="dob" value={formData.dob} onChange={handleInputChange} placeholder="dd/mm/yyyy" />
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
                <div className="form-group">
                    <label>Số CMND/CCCD</label>
                    <input type="text" name="id_card_number" value={formData.id_card_number} onChange={handleInputChange} />
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Ngày cấp (dd/mm/yyyy)</label>
                            <input type="text" name="id_card_issue_date" value={formData.id_card_issue_date} onChange={handleInputChange} placeholder="dd/mm/yyyy" />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Ngày hết hạn (dd/mm/yyyy)</label>
                            <input type="text" name="id_card_expiry_date" value={formData.id_card_expiry_date} onChange={handleInputChange} placeholder="dd/mm/yyyy" />
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label>Nơi cấp</label>
                    <input type="text" name="id_card_issue_place" value={formData.id_card_issue_place} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label>Địa chỉ</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows="3"></textarea>
                </div>

                <hr className="my-4 border-secondary opacity-25" />

                <div className="edit-section-header">Bảo mật & Hệ thống</div>
                <div className="security-actions">
                    <button className="btn btn-outline-warning w-100 mb-2" onClick={handleResetPass}>
                        <i className="fa-solid fa-key me-2"></i> Reset Mật khẩu (12345678)
                    </button>
                    <button className="btn btn-outline-info w-100" onClick={handleResetPinAction}>
                        <i className="fa-solid fa-shield me-2"></i> Reset mã PIN (123456)
                    </button>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-secondary" onClick={handleClose}>Hủy</button>
                <button className="btn btn-primary" onClick={handleSubmit}>Lưu thay đổi</button>
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
