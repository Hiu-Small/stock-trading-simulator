import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { UserContext } from '../../context/UserContext';
import axios from '../../setup/axios';
import './AccountSettings.scss';

const AccountSettings = () => {
    console.log("Rendering AccountSettings component...");
    const { user } = useContext(UserContext);
    const [showPassModal, setShowPassModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // Visibility toggles
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [showPinAuthPass, setShowPinAuthPass] = useState(false);
    
    // Form states
    const [passForm, setPassForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [pinForm, setPinForm] = useState({
        password: '',
        newPin: ['', '', '', '', '', ''],
        confirmPin: ['', '', '', '', '', '']
    });

    const handleCopyAccount = () => {
        const accNum = user?.account?.account_number || 'Q191741';
        navigator.clipboard.writeText(accNum);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePinInput = (index, value, type) => {
        if (!/^\d*$/.test(value)) return;
        
        const field = type === 'new' ? 'newPin' : 'confirmPin';
        const newPinArr = [...pinForm[field]];
        newPinArr[index] = value.slice(-1);
        
        setPinForm({ ...pinForm, [field]: newPinArr });

        // Auto focus next input if a digit is entered
        if (value && index < 5) {
            const nextInput = document.querySelector(`input[name="${type}-pin-${index + 1}"]`);
            if (nextInput) nextInput.focus();
        }
    };

    const handlePinKeyDown = (e, index, type) => {
        if (e.key === 'Backspace') {
            const field = type === 'new' ? 'newPin' : 'confirmPin';
            const newPinArr = [...pinForm[field]];
            
            // If current field is empty and not the first field, move focus back
            if (!newPinArr[index] && index > 0) {
                const prevInput = document.querySelector(`input[name="${type}-pin-${index - 1}"]`);
                if (prevInput) {
                    prevInput.focus();
                    // Optional: also clear the previous field
                    const prevPinArr = [...newPinArr];
                    prevPinArr[index - 1] = '';
                    setPinForm({ ...pinForm, [field]: prevPinArr });
                }
            } else {
                // Just clear current field
                newPinArr[index] = '';
                setPinForm({ ...pinForm, [field]: newPinArr });
            }
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passForm.newPassword !== passForm.confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp!");
            return;
        }
        if (passForm.newPassword.length < 8) {
            toast.error("Mật khẩu mới phải có ít nhất 8 ký tự!");
            return;
        }

        try {
            const response = await axios.post('/api/change-password', {
                oldPassword: passForm.currentPassword,
                newPassword: passForm.newPassword
            });
            if (response && +response.EC === 0) {
                toast.success("Thay đổi mật khẩu thành công!");
                setShowPassModal(false);
                setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            toast.error("Lỗi hệ thống khi đổi mật khẩu");
        }
    };

    const handlePinChange = async (e) => {
        e.preventDefault();
        const newPin = pinForm.newPin.join('');
        const confirmPin = pinForm.confirmPin.join('');

        if (newPin.length < 6 || confirmPin.length < 6) {
            toast.error("Vui lòng nhập đầy đủ 6 số PIN!");
            return;
        }
        if (newPin !== confirmPin) {
            toast.error("Mã PIN xác nhận không khớp!");
            return;
        }

        try {
            const response = await axios.post('/api/change-pin', {
                password: pinForm.password,
                newPin
            });
            if (response && +response.EC === 0) {
                toast.success("Thay đổi mã PIN thành công!");
                setShowPinModal(false);
                setPinForm({ password: '', newPin: ['', '', '', '', '', ''], confirmPin: ['', '', '', '', '', ''] });
            } else {
                toast.error(response.EM);
            }
        } catch (error) {
            toast.error("Lỗi hệ thống khi đổi mã PIN");
        }
    };

    return (
        <div className="account-settings-container">
            <div className="settings-content">
                <header className="settings-header">
                    <h1>Thông tin & Bảo mật</h1>
                    <p>Quản lý thông tin đăng nhập và mã bảo vệ tài khoản của bạn.</p>
                </header>

                <div className="settings-card account-card">
                    <div className="card-item">
                        <span className="label">Tài khoản giao dịch</span>
                        <div className="value-group">
                            <span className="account-number">
                                {user?.account?.account_number || user?.account?.username || (user?.isLoading ? "Đang tải..." : "N/A")}
                            </span>
                            <button className="copy-btn" onClick={handleCopyAccount} disabled={!user?.account?.account_number}>
                                {copied ? <i className="fa-solid fa-check" style={{color: '#00c805'}}></i> : <i className="fa-regular fa-copy"></i>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="settings-card security-card">
                    <div className="security-item">
                        <div className="item-icon">
                            <i className="fa-solid fa-lock"></i>
                        </div>
                        <div className="item-info">
                            <span className="title">Mật khẩu</span>
                            <span className="desc">Được dùng để đăng nhập vào hệ thống</span>
                        </div>
                        <div className="item-status">
                            <span className="dots">••••••••</span>
                            <button className="action-btn" onClick={() => setShowPassModal(true)}>Thay đổi mật khẩu</button>
                        </div>
                    </div>

                    <div className="divider"></div>

                    <div className="security-item">
                        <div className="item-icon">
                            <i className="fa-solid fa-shield-halved"></i>
                        </div>
                        <div className="item-info">
                            <span className="title">Mã PIN giao dịch</span>
                            <span className="desc">Mã 6 số dùng để xác thực đặt lệnh và rút tiền</span>
                        </div>
                        <div className="item-status">
                            <span className="dots">••••••</span>
                            <button className="action-btn" onClick={() => setShowPinModal(true)}>Thay đổi mã PIN</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Modal */}
            {showPassModal && (
                <div className="modal-overlay">
                    <div className="modal-content password-modal">
                        <div className="modal-header">
                            <h2>Thay đổi mật khẩu</h2>
                            <button className="close-modal" onClick={() => setShowPassModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handlePasswordChange}>
                            <div className="form-group">
                                <label>Mật khẩu hiện tại</label>
                                <div className="input-wrapper">
                                    <input 
                                        type={showCurrentPass ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={passForm.currentPassword}
                                        onChange={(e) => setPassForm({...passForm, currentPassword: e.target.value})}
                                        required
                                    />
                                    <i 
                                        className={`fa-regular ${showCurrentPass ? 'fa-eye-slash' : 'fa-eye'}`}
                                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                                    ></i>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Mật khẩu mới</label>
                                <div className="input-wrapper">
                                    <input 
                                        type={showNewPass ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={passForm.newPassword}
                                        onChange={(e) => setPassForm({...passForm, newPassword: e.target.value})}
                                        required
                                    />
                                    <i 
                                        className={`fa-regular ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`}
                                        onClick={() => setShowNewPass(!showNewPass)}
                                    ></i>
                                </div>
                                <span className="input-hint">Mật khẩu phải có ít nhất 8 ký tự.</span>
                            </div>
                            <div className="form-group">
                                <label>Xác nhận mật khẩu mới</label>
                                <div className="input-wrapper">
                                    <input 
                                        type={showConfirmPass ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={passForm.confirmPassword}
                                        onChange={(e) => setPassForm({...passForm, confirmPassword: e.target.value})}
                                        required
                                    />
                                    <i 
                                        className={`fa-regular ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`}
                                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                                    ></i>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowPassModal(false)}>Hủy</button>
                                <button type="submit" className="btn-primary">Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PIN Modal */}
            {showPinModal && (
                <div className="modal-overlay">
                    <div className="modal-content pin-modal">
                        <div className="modal-header">
                            <h2>Thay đổi mã PIN giao dịch</h2>
                            <button className="close-modal" onClick={() => setShowPinModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handlePinChange}>
                            <div className="form-group">
                                <label>Mật khẩu đăng nhập</label>
                                <div className="input-wrapper">
                                    <input 
                                        type={showPinAuthPass ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={pinForm.password}
                                        onChange={(e) => setPinForm({...pinForm, password: e.target.value})}
                                        required
                                    />
                                    <i 
                                        className={`fa-regular ${showPinAuthPass ? 'fa-eye-slash' : 'fa-eye'}`}
                                        onClick={() => setShowPinAuthPass(!showPinAuthPass)}
                                    ></i>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Mã PIN mới</label>
                                <div className="pin-input-group">
                                    {pinForm.newPin.map((digit, idx) => (
                                        <input
                                            key={`new-${idx}`}
                                            name={`new-pin-${idx}`}
                                            type="password"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handlePinInput(idx, e.target.value, 'new')}
                                            onKeyDown={(e) => handlePinKeyDown(e, idx, 'new')}
                                            required
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Xác nhận mã PIN mới</label>
                                <div className="pin-input-group">
                                    {pinForm.confirmPin.map((digit, idx) => (
                                        <input
                                            key={`confirm-${idx}`}
                                            name={`confirm-pin-${idx}`}
                                            type="password"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handlePinInput(idx, e.target.value, 'confirm')}
                                            onKeyDown={(e) => handlePinKeyDown(e, idx, 'confirm')}
                                            required
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowPinModal(false)}>Hủy</button>
                                <button type="submit" className="btn-primary">Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountSettings;
