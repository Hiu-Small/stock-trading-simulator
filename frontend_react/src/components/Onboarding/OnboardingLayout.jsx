import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import './OnboardingLayout.scss';

const OnboardingLayout = (props) => {
    const { lang, setLang, t } = useTranslation();
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    useEffect(() => {
        const closeDropdown = () => setShowLangDropdown(false);
        window.addEventListener('click', closeDropdown);
        return () => window.removeEventListener('click', closeDropdown);
    }, []);

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
                            <h1>{t("onboarding.welcomeTitle")}</h1>
                            <ul className="features">
                                <li><i className="fa-solid fa-check"></i> {t("onboarding.online")}</li>
                                <li><i className="fa-solid fa-check"></i> {t("onboarding.verifyTime")}</li>
                                <li><i className="fa-solid fa-check"></i> {t("onboarding.tradeNow")}</li>
                            </ul>
                        </>
                    )}
                    {(props.step === 2 || props.step === 3) && (
                        <>
                            <div className="brand-name">{t("onboarding.bankName")}</div>
                            <p className="slogan">{t("onboarding.bankSlogan")}</p>
                            <ul className="benefits">
                                <li>
                                    <div className="icon-circle"><i className="fa-solid fa-check"></i></div>
                                    <div className="text">
                                        <strong>{t("onboarding.benefitTitle1")}</strong>
                                        <p>{t("onboarding.benefitDesc1")}</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="icon-circle"><i className="fa-solid fa-check"></i></div>
                                    <div className="text">
                                        <strong>{t("onboarding.benefitTitle2")}</strong>
                                        <p>{t("onboarding.benefitDesc2")}</p>
                                    </div>
                                </li>
                                <li>
                                    <div className="icon-circle"><i className="fa-solid fa-check"></i></div>
                                    <div className="text">
                                        <strong>{t("onboarding.benefitTitle3")}</strong>
                                        <p>{t("onboarding.benefitDesc3")}</p>
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
                            <div className="step-label">{t("onboarding.step", { step: 1 })}</div>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step-item ${props.step >= 2 ? 'active' : ''} ${props.step > 2 ? 'completed' : ''}`}>
                            <div className="step-number">{props.step > 2 ? <i className="fa-solid fa-check"></i> : '2'}</div>
                            <div className="step-label">{t("onboarding.step", { step: 2 })}</div>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step-item ${props.step >= 3 ? 'active' : ''} ${props.step > 3 ? 'completed' : ''}`}>
                            <div className="step-number">{props.step > 3 ? <i className="fa-solid fa-check"></i> : '3'}</div>
                            <div className="step-label">{t("onboarding.step", { step: 3 })}</div>
                        </div>
                    </div>
                    
                    <div className="lang-selector">
                        <span>{t("onboarding.guideLink")}</span>
                        
                        <div 
                          className={`language-wrapper ${showLangDropdown ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLangDropdown(!showLangDropdown);
                          }}
                          style={{ cursor: "pointer", display: "flex", alignItems: "center", position: "relative" }}
                        >
                          <div className="language-icon-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {lang === "vi" ? (
                              <>
                                <svg width="20" height="13" viewBox="0 0 512 341" style={{ borderRadius: '1.5px', display: 'block' }}>
                                  <rect width="512" height="341" fill="#da251d"/>
                                  <g transform="translate(256, 170.5) scale(0.55) translate(-256, -256)">
                                    <polygon 
                                      fill="#ff0" 
                                      points="256,92 298,223 436,223 325,303 367,435 256,355 145,435 187,303 76,223 214,223"
                                    />
                                  </g>
                                </svg>
                                <span className="lang-text">VI</span>
                              </>
                            ) : (
                              <>
                                <svg width="20" height="13" viewBox="0 0 60 30" style={{ borderRadius: '1.5px', display: 'block', objectFit: 'cover' }}>
                                  <rect width="60" height="30" fill="#012169"/>
                                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                                  <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
                                  <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
                                </svg>
                                <span className="lang-text">EN</span>
                              </>
                            )}
                            <i className="fa-solid fa-chevron-down" style={{ fontSize: '10px', opacity: 0.7 }}></i>
                          </div>

                          {showLangDropdown && (
                            <div className="language-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <div 
                                className={`language-dropdown-item ${lang === "vi" ? "active" : ""}`}
                                onClick={() => {
                                  if (lang !== "vi") {
                                    setLang("vi");
                                  }
                                  setShowLangDropdown(false);
                                }}
                              >
                                <svg width="18" height="12" viewBox="0 0 512 341" style={{ borderRadius: '1px', display: 'block' }}>
                                  <rect width="512" height="341" fill="#da251d"/>
                                  <g transform="translate(256, 170.5) scale(0.55) translate(-256, -256)">
                                    <polygon 
                                      fill="#ff0" 
                                      points="256,92 298,223 436,223 325,303 367,435 256,355 145,435 187,303 76,223 214,223"
                                    />
                                  </g>
                                </svg>
                                <span>Tiếng Việt</span>
                              </div>
                              <div 
                                className={`language-dropdown-item ${lang === "en" ? "active" : ""}`}
                                onClick={() => {
                                  if (lang !== "en") {
                                    setLang("en");
                                  }
                                  setShowLangDropdown(false);
                                }}
                              >
                                <svg width="18" height="12" viewBox="0 0 60 30" style={{ borderRadius: '1px', display: 'block', objectFit: 'cover' }}>
                                  <rect width="60" height="30" fill="#012169"/>
                                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                                  <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
                                  <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
                                </svg>
                                <span>English</span>
                              </div>
                            </div>
                          )}
                        </div>
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
