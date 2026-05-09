import React from 'react';
import './OnboardingLayout.scss';

const OnboardingLayout = (props) => {
    return (
        <div className="onboarding-container">
            <div className="onboarding-left">
                <div className="brand-logo">
                    <span className="logo-icon"><i className="fa-solid fa-arrow-trend-up"></i></span>
                    <span className="logo-name">iBoard</span>
                </div>
                
                <div className="welcome-content">
                    {props.step === 1 && (
                        <>
                            <div className="sparkle-icon">✨</div>
                            <h1>Bắt đầu hành trình đầu tư của bạn!</h1>
                            <ul className="features">
                                <li><i className="fa-solid fa-check"></i> 100% online</li>
                                <li><i className="fa-solid fa-check"></i> 3 phút xác thực</li>
                                <li><i className="fa-solid fa-check"></i> Giao dịch ngay</li>
                            </ul>
                        </>
                    )}
                    {(props.step === 2 || props.step === 3) && (
                        <>
                            <div className="brand-name">TechcomBank</div>
                            <p className="slogan">Ngân hàng số của bạn</p>
                            <ul className="benefits">
                                <li>
                                    <div className="icon-circle"><i className="fa-solid fa-check"></i></div>
                                    <div className="text">
                                        <strong>Nhanh chóng & Tiện lợi</strong>
                                        <p>Mở tài khoản chỉ trong 5 phút</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="icon-circle"><i className="fa-solid fa-check"></i></div>
                                    <div className="text">
                                        <strong>An toàn & Bảo mật</strong>
                                        <p>Công nghệ mã hóa hiện đại</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="icon-circle"><i className="fa-solid fa-check"></i></div>
                                    <div className="text">
                                        <strong>Ưu đãi hấp dẫn</strong>
                                        <p>Nhiều quà tặng cho khách hàng mới</p>
                                    </div>
                                </li>
                            </ul>
                        </>
                    )}
                </div>
                
                <div className="footer-copyright">
                    © 2026 IBoard. All rights reserved.
                </div>
            </div>
            
            <div className="onboarding-right">
                <div className="top-nav">
                    <div className="step-indicator">
                        <div className={`step-item ${props.step >= 1 ? 'active' : ''} ${props.step > 1 ? 'completed' : ''}`}>
                            <div className="step-number">{props.step > 1 ? <i className="fa-solid fa-check"></i> : '1'}</div>
                            <div className="step-label">Bước 1</div>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step-item ${props.step >= 2 ? 'active' : ''} ${props.step > 2 ? 'completed' : ''}`}>
                            <div className="step-number">{props.step > 2 ? <i className="fa-solid fa-check"></i> : '2'}</div>
                            <div className="step-label">Bước 2</div>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step-item ${props.step >= 3 ? 'active' : ''} ${props.step > 3 ? 'completed' : ''}`}>
                            <div className="step-number">{props.step > 3 ? <i className="fa-solid fa-check"></i> : '3'}</div>
                            <div className="step-label">Bước 3</div>
                        </div>
                    </div>
                    
                    <div className="lang-selector">
                        <span>Hướng dẫn mở tài khoản</span>
                        <select>
                            <option>VI</option>
                            <option>EN</option>
                        </select>
                    </div>
                </div>
                
                <div className="form-container">
                    <div className="form-header">
                        <h2>{props.title}</h2>
                        {props.subtitle && <p className="subtitle">{props.subtitle}</p>}
                    </div>
                    {props.children}
                </div>
            </div>
        </div>
    );
};

export default OnboardingLayout;
