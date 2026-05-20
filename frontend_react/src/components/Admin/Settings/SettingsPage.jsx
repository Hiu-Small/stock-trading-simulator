import React, { useState, useEffect } from "react";
import "./SettingsPage.scss";
import { fetchSettings, updateSettings } from "../../../services/adminService";
import { toast } from "react-toastify";

const SettingsPage = () => {
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
        toast.error(res.EM || "Không thể tải cấu hình");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối tới máy chủ");
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
    toast.info("Đã hoàn tác các thay đổi chưa lưu");
  };

  const handleSave = async () => {
    // Validate inputs
    if (isNaN(settings.baseFee) || parseFloat(settings.baseFee) < 0) {
      toast.error("Phí giao dịch phải là số dương hợp lệ");
      return;
    }
    if (isNaN(settings.incomeTax) || parseFloat(settings.incomeTax) < 0) {
      toast.error("Thuế thu nhập phải là số dương hợp lệ");
      return;
    }
    if (isNaN(settings.initialBalance) || parseFloat(settings.initialBalance) < 0) {
      toast.error("Số dư ảo ban đầu phải là số dương hợp lệ");
      return;
    }
    if (isNaN(settings.cashAdvanceRate) || parseFloat(settings.cashAdvanceRate) < 0) {
      toast.error("Lãi suất ứng trước phải là số dương hợp lệ");
      return;
    }

    try {
      const res = await updateSettings(settings);
      if (res && res.EC === 0) {
        setDbSettings(settings);
        setHasChanges(false);
        toast.success("Lưu cấu hình hệ thống thành công!");
      } else {
        toast.error(res.EM || "Lỗi lưu cấu hình");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối tới máy chủ");
    }
  };

  if (loading) {
    return (
      <div className="admin-settings-page text-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Đang tải cấu hình...</span>
        </div>
        <p className="mt-3 text-muted">Đang tải cấu hình hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h1>Settings & Fees</h1>
        <p>Configure trading parameters, simulator fees, and default values</p>
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
                <h3>Trading Fees & Taxes</h3>
                <p>Set commission rates and tax percentages</p>
              </div>
            </div>

            <div className="form-group">
              <label>Base Trading Fee (%)</label>
              <div className="input-wrapper">
                <span className="prefix">%</span>
                <input 
                  type="text" 
                  value={settings.baseFee} 
                  onChange={(e) => handleChange("baseFee", e.target.value)}
                />
              </div>
              <span className="helper-text">Applied to both buy and sell transactions (e.g., 0.15%)</span>
            </div>

            <div className="form-group">
              <label>Income Tax on Sell (%)</label>
              <div className="input-wrapper">
                <span className="prefix">%</span>
                <input 
                  type="text" 
                  value={settings.incomeTax} 
                  onChange={(e) => handleChange("incomeTax", e.target.value)}
                />
              </div>
              <span className="helper-text">Tax applied on the value of sell transactions (e.g., 0.10%)</span>
            </div>

            <div className="form-group">
              <label>Cash Advance Daily Interest Rate (%)</label>
              <div className="input-wrapper">
                <span className="prefix">%</span>
                <input 
                  type="text" 
                  value={settings.cashAdvanceRate} 
                  onChange={(e) => handleChange("cashAdvanceRate", e.target.value)}
                />
              </div>
              <span className="helper-text">Daily interest rate applied on cash advance amounts (e.g., 0.038%)</span>
            </div>
          </section>

          {/* New Account Defaults */}
          <section className="settings-card dashboard-section">
            <div className="card-header">
              <div className="icon-box blue">
                <i className="fa-solid fa-dollar-sign"></i>
              </div>
              <div className="header-info">
                <h3>New Account Defaults</h3>
                <p>Configure initial settings for new users</p>
              </div>
            </div>

            <div className="form-group">
              <label>Initial Virtual Balance (VND)</label>
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
                <span>Default simulator money granted to new accounts. Current value: {Number(settings.initialBalance).toLocaleString('vi-VN')} VND</span>
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
              <h3>System Configurations</h3>
              <p>Enable or disable advanced trading features</p>
            </div>
          </div>

          {/* Chỉ giữ lại cấu hình T+0 */}
          <div className="toggle-item">
            <div className="item-info">
              <span className="title">Enable T+0 Trading</span>
              <span className="desc">Allow users to sell securities immediately after purchase (bypass real market T+2 settlement rule)</span>
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
            <span>You have unsaved changes</span>
          </div>
          <div className="bar-right">
            <button className="btn-discard" onClick={handleDiscard}>
              <i className="fa-solid fa-xmark"></i> Discard Changes
            </button>
            <button className="btn-save" onClick={handleSave}>
              <i className="fa-solid fa-floppy-disk"></i> Save Configurations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
