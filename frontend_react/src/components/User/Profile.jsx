import React, { useState, useEffect, useContext } from 'react';
import { getUserProfile } from '../../services/userService';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import './Profile.scss';

const Profile = () => {
    const { user, updateUserStatus } = useContext(UserContext);
    const [editingSection, setEditingSection] = useState(null); // 'id', 'contact' or null
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState({
        full_name: '',
        dob: '',
        gender: 'Nam',
        id_card_number: '',
        id_card_issue_date: '',
        id_card_issue_place: '',
        id_card_expiry_date: '',
        address: '',
        email: '',
        phone: '',
        nationality: 'Việt Nam'
    });
    const [originalData, setOriginalData] = useState({});
    const [expandedSections, setExpandedSections] = useState({
        id: true,
        contact: true
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const fetchProfile = async () => {
        try {
            const response = await getUserProfile();
            if (response && +response.EC === 0) {
                const data = response.DT;
                const formattedData = {
                    full_name: data.profile?.full_name || '',
                    dob: data.profile?.dob || '',
                    gender: data.profile?.gender || 'Nam',
                    id_card_number: data.profile?.id_card_number || '',
                    id_card_issue_date: data.profile?.id_card_issue_date || '',
                    id_card_issue_place: data.profile?.id_card_issue_place || '',
                    id_card_expiry_date: data.profile?.id_card_expiry_date || '',
                    address: data.profile?.address || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    nationality: data.profile?.nationality || 'Việt Nam'
                };
                setProfileData(formattedData);
                setOriginalData(formattedData);
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi tải thông tin hồ sơ");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const { full_name, dob, id_card_number, id_card_issue_date, id_card_issue_place, id_card_expiry_date, address, email } = profileData;
        
        // 1. Validate Họ tên
        if (!full_name || full_name.trim() === "") {
            toast.error("Vui lòng nhập họ và tên");
            return false;
        }
        if (full_name.trim().split(/\s+/).length < 2) {
            toast.error("Họ tên phải có tối thiểu 2 từ");
            return false;
        }

        // 2. Validate Tuổi (>= 18)
        if (!dob) {
            toast.error("Vui lòng chọn ngày sinh");
            return false;
        }
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 18) {
            toast.error("Bạn phải đủ 18 tuổi");
            return false;
        }

        // 3. Validate CCCD (9 hoặc 12 số)
        if (!id_card_number) {
            toast.error("Vui lòng nhập số CMND/CCCD");
            return false;
        }
        const idRegex = /^\d+$/;
        if (!idRegex.test(id_card_number) || (id_card_number.length !== 9 && id_card_number.length !== 12)) {
            toast.error("Số CMND/CCCD phải là 9 hoặc 12 chữ số");
            return false;
        }

        // 4. Validate Ngày cấp, Nơi cấp
        if (!id_card_issue_date) {
            toast.error("Vui lòng chọn ngày cấp");
            return false;
        }
        if (!id_card_issue_place || id_card_issue_place.trim() === "") {
            toast.error("Vui lòng nhập nơi cấp");
            return false;
        }

        // 5. Validate Ngày hết hạn (> 1 tháng tính từ hiện tại)
        if (!id_card_expiry_date) {
            toast.error("Vui lòng chọn ngày hết hạn");
            return false;
        }
        const expiry = new Date(id_card_expiry_date);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        if (expiry < nextMonth) {
            toast.error("Giấy tờ định danh phải còn hạn trên 1 tháng");
            return false;
        }

        // 6. Validate Địa chỉ (>= 10 ký tự)
        if (!address || address.trim() === "") {
            toast.error("Vui lòng nhập địa chỉ liên hệ");
            return false;
        }
        if (address.length < 10) {
            toast.error("Địa chỉ quá ngắn (tối thiểu 10 ký tự)");
            return false;
        }

        // 7. Validate Email đơn giản
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                toast.error("Email không hợp lệ");
                return false;
            }
        }

        return true;
    };

    const handleSave = async () => {
        if (!isDataChanged()) {
            setEditingSection(null);
            return;
        }

        if (!validateForm()) return;

        setLoading(true);
        try {
            const response = await axios.post('/api/update-profile', profileData);
            if (response && +response.EC === 0) {
                toast.success("Cập nhật hồ sơ thành công!");
                
                // Nếu backend có trả về status mới (tự động nâng cấp KYC)
                if (response.DT && response.DT.status) {
                    updateUserStatus(response.DT.status);
                }

                setEditingSection(null);
                fetchProfile();
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi hệ thống khi cập nhật");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setProfileData(originalData); // Restore from original
        setEditingSection(null);
    };

    const isDataChanged = () => {
        return JSON.stringify(profileData) !== JSON.stringify(originalData);
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const maxDob = new Date();
    maxDob.setFullYear(maxDob.getFullYear() - 18);
    const maxDobStr = maxDob.toISOString().split('T')[0];
    const minExpiry = new Date();
    minExpiry.setMonth(minExpiry.getMonth() + 1);
    const minExpiryStr = minExpiry.toISOString().split('T')[0];

    return (
        <>
            <div className="profile-container">
                <div className="profile-content">
                    <div className="profile-header">
                        <h2>Thông tin KH & cập nhật CC/CCCD</h2>
                        <button className="refresh-btn" onClick={fetchProfile} title="Tải lại">
                            <i className="fa-solid fa-rotate-right"></i>
                        </button>
                    </div>

                    {/* Section 1: Định danh */}
                    <div className="profile-section">
                        <div className="section-title" onClick={() => toggleSection('id')}>
                            <h3>
                                Định danh 
                                <i className={`fa-solid fa-chevron-${expandedSections.id ? 'up' : 'down'} toggle-icon`}></i>
                            </h3>
                            {expandedSections.id && (
                                <>
                                    {editingSection !== 'id' ? (
                                        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); setEditingSection('id'); }}>
                                            <i className="fa-solid fa-pen"></i> Thay đổi
                                        </button>
                                    ) : (
                                        <button className="btn-edit save" onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                                            <i className="fa-solid fa-check"></i> Đang chỉnh sửa
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {expandedSections.id && (
                            <div className="info-list">
                                <div className="info-item">
                                    <label>Họ tên</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <input 
                                            name="full_name"
                                            value={profileData.full_name} 
                                            onChange={(e) => setProfileData({...profileData, full_name: e.target.value.toUpperCase()})}
                                            disabled={editingSection !== 'id'} 
                                            placeholder="CHƯA CÓ THÔNG TIN"
                                        />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Ngày sinh</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <input 
                                            name="dob"
                                            type="date"
                                            max={maxDobStr}
                                            value={profileData.dob} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'id'} 
                                        />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Giới tính</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <select 
                                            name="gender"
                                            value={profileData.gender} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'id'}
                                        >
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Quốc tịch</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <input 
                                            name="nationality"
                                            value={profileData.nationality} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'id'} 
                                        />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Số CMND/CCCD/HC</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <input 
                                            name="id_card_number"
                                            value={profileData.id_card_number} 
                                            onChange={(e) => setProfileData({...profileData, id_card_number: e.target.value.replace(/\D/g, '').substring(0, 12)})}
                                            disabled={editingSection !== 'id'} 
                                        />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Ngày cấp</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <input 
                                            name="id_card_issue_date"
                                            type="date"
                                            max={todayStr}
                                            value={profileData.id_card_issue_date} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'id'} 
                                        />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Nơi cấp</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <input 
                                            name="id_card_issue_place"
                                            value={profileData.id_card_issue_place} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'id'} 
                                        />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Ngày hết hạn</label>
                                    <div className={`info-value ${editingSection === 'id' ? 'editable' : ''}`}>
                                        <input 
                                            name="id_card_expiry_date"
                                            type="date"
                                            min={minExpiryStr}
                                            value={profileData.id_card_expiry_date} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'id'} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="dropdown-divider" style={{margin: '20px 0', opacity: 0.1}}></div>

                    {/* Section 2: Liên hệ */}
                    <div className="profile-section">
                        <div className="section-title" onClick={() => toggleSection('contact')}>
                            <h3>
                                Liên hệ 
                                <i className={`fa-solid fa-chevron-${expandedSections.contact ? 'up' : 'down'} toggle-icon`}></i>
                            </h3>
                            {expandedSections.contact && (
                                <>
                                    {editingSection !== 'contact' ? (
                                        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); setEditingSection('contact'); }}>
                                            <i className="fa-solid fa-pen"></i> Thay đổi
                                        </button>
                                    ) : (
                                        <button className="btn-edit save" onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                                            <i className="fa-solid fa-check"></i> Đang chỉnh sửa
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {expandedSections.contact && (
                            <div className="info-list">
                                <div className="info-item">
                                    <label>Số điện thoại</label>
                                    <div className="info-value">
                                        <input value={profileData.phone} disabled={true} />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Email</label>
                                    <div className={`info-value ${editingSection === 'contact' ? 'editable' : ''}`}>
                                        <input 
                                            name="email"
                                            value={profileData.email} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'contact'} 
                                        />
                                    </div>
                                </div>
                                <div className="info-item">
                                    <label>Địa chỉ liên hệ</label>
                                    <div className={`info-value ${editingSection === 'contact' ? 'editable' : ''}`}>
                                        <textarea 
                                            name="address"
                                            value={profileData.address} 
                                            onChange={handleChange}
                                            disabled={editingSection !== 'contact'}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions bar when editing */}
                    {editingSection && (
                        <div className="profile-actions">
                            <button className="btn-cancel" onClick={handleCancel}>Hủy bỏ</button>
                            <button 
                                className="btn-save-main" 
                                onClick={handleSave} 
                                disabled={loading || !isDataChanged()}
                            >
                                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Profile;
