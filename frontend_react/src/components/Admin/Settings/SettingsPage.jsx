import React, { useState, useEffect } from "react";
import "./SettingsPage.scss";
import { fetchSettings, updateSettings } from "../../../services/adminService";
import { toast } from "react-toastify";
import { useTranslation } from "../../../context/LanguageContext";

const SettingsPage = () => {
  const { t, lang } = useTranslation();
  const defaultSettings = {
    baseFee: "0.15",
    incomeTax: "0.10",
    initialBalance: "100000000",
    enableT0Trading: true,
    cashAdvanceRate: "0.038"
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [dbSettings, setDbSettings] = useState(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lấy cấu hình từ database khi load trang
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchSettings();
      if (res && res.EC === 0) {
        setSettings(res.DT);
        setDbSettings(res.DT);
      } else {
        toast.error(res.EM || t("admin.settings.toastLoadError"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("admin.settings.toastConnError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // So sánh xem có thay đổi so với db không
  useEffect(() => {
    const isChanged = JSON.stringify(settings) !== JSON.stringify(dbSettings);
    setHasChanges(isChanged);
  }, [settings, dbSettings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDiscard = () => {
    setSettings(dbSettings);
    toast.info(t("admin.settings.toastDiscardSuccess"));
  };

  const handleSave = async () => {
    // Validate inputs
    if (isNaN(settings.baseFee) || parseFloat(settings.baseFee) < 0) {
      toast.error(t("admin.settings.toastFeePositive"));
      return;
    }
    if (isNaN(settings.incomeTax) || parseFloat(settings.incomeTax) < 0) {
      toast.error(t("admin.settings.toastTaxPositive"));
      return;
    }
    if (isNaN(settings.initialBalance) || parseFloat(settings.initialBalance) < 0) {
      toast.error(t("admin.settings.toastBalancePositive"));
      return;
    }
    if (isNaN(settings.cashAdvanceRate) || parseFloat(settings.cashAdvanceRate) < 0) {
      toast.error(t("admin.settings.toastAdvanceRatePositive"));
      return;
    }

    try {
      const res = await updateSettings(settings);
      if (res && res.EC === 0) {
        setDbSettings(settings);
        setHasChanges(false);
        toast.success(t("admin.settings.toastSaveSuccess"));
      } else {
        toast.error(res.EM || t("admin.settings.toastSaveError"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("admin.settings.toastConnError"));
    }
  };

  if (loading) {
    return (
      <div className="admin-settings-page text-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">{t("admin.settings.loadingText")}</span>
        </div>
        <p className="mt-3 text-muted">{t("admin.settings.loadingText")}</p>
      </div>
    );
  }

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h1>{t("admin.settings.title")}</h1>
        <p>{t("admin.settings.subtitle")}</p>
      </div>

      <div className="settings-container">
        <div className="settings-grid">
          {/* Trading Fees & Taxes */}
          <section className="settings-card dashboard-section">
            <div className="card-header">
              <div className="icon-box green">
                <i className="fa-solid fa-percent"></i>
              </div>
              <div className="header-info">
                <h3>{t("admin.settings.cardFeesTitle")}</h3>
                <p>{t("admin.settings.cardFeesDesc")}</p>
              </div>
            </div>

            <div className="form-group">
              <label>{t("admin.settings.feeBaseLabel")}</label>
              <div className="input-wrapper">
                <span className="prefix">%</span>
                <input 
                  type="text" 
                  value={settings.baseFee} 
                  onChange={(e) => handleChange("baseFee", e.target.value)}
                />
              </div>
              <span className="helper-text">{t("admin.settings.feeBaseHint")}</span>
            </div>

            <div className="form-group">
              <label>{t("admin.settings.taxSellLabel")}</label>
              <div className="input-wrapper">
                <span className="prefix">%</span>
                <input 
                  type="text" 
                  value={settings.incomeTax} 
                  onChange={(e) => handleChange("incomeTax", e.target.value)}
                />
              </div>
              <span className="helper-text">{t("admin.settings.taxSellHint")}</span>
            </div>

            <div className="form-group">
              <label>{t("admin.settings.advanceRateLabel")}</label>
              <div className="input-wrapper">
                <span className="prefix">%</span>
                <input 
                  type="text" 
                  value={settings.cashAdvanceRate} 
                  onChange={(e) => handleChange("cashAdvanceRate", e.target.value)}
                />
              </div>
              <span className="helper-text">{t("admin.settings.advanceRateHint")}</span>
            </div>
          </section>

          {/* New Account Defaults */}
          <section className="settings-card dashboard-section">
            <div className="card-header">
              <div className="icon-box blue">
                <i className="fa-solid fa-dollar-sign"></i>
              </div>
              <div className="header-info">
                <h3>{t("admin.settings.cardDefaultsTitle")}</h3>
                <p>{t("admin.settings.cardDefaultsDesc")}</p>
              </div>
            </div>

            <div className="form-group">
              <label>{t("admin.settings.balanceLabel")}</label>
              <div className="input-wrapper">
                <span className="prefix">₫</span>
                <input 
                  type="text" 
                  value={settings.initialBalance} 
                  onChange={(e) => handleChange("initialBalance", e.target.value)}
                />
              </div>
              <div className="info-box blue mt-3">
                <i className="fa-solid fa-circle-info"></i>
                <span>{t("admin.settings.balanceHint", { val: Number(settings.initialBalance).toLocaleString('vi-VN') })}</span>
              </div>
            </div>
          </section>
        </div>

        {/* System Configurations */}
        <section className="settings-card dashboard-section full-width">
          <div className="card-header">
            <div className="icon-box purple">
              <i className="fa-solid fa-gear"></i>
            </div>
            <div className="header-info">
              <h3>{t("admin.settings.cardSystemTitle")}</h3>
              <p>{t("admin.settings.cardSystemDesc")}</p>
            </div>
          </div>

          {/* Chỉ giữ lại cấu hình T+0 */}
          <div className="toggle-item">
            <div className="item-info">
              <span className="title">{t("admin.settings.toggleT0Title")}</span>
              <span className="desc">{t("admin.settings.toggleT0Desc")}</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.enableT0Trading}
                onChange={(e) => handleChange("enableT0Trading", e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </section>
      </div>

      {/* Bottom Action Bar */}
      {hasChanges && (
        <div className="bottom-action-bar">
          <div className="bar-left">
            <div className="unsaved-dot"></div>
            <span>{t("admin.settings.hasChangesLabel")}</span>
          </div>
          <div className="bar-right">
            <button className="btn-discard" onClick={handleDiscard}>
              <i className="fa-solid fa-xmark"></i> {t("admin.settings.btnDiscard")}
            </button>
            <button className="btn-save" onClick={handleSave}>
              <i className="fa-solid fa-floppy-disk"></i> {t("admin.settings.btnSave")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
