import React, { useState, useEffect } from "react";
import "./SettingsPage.scss";

const SettingsPage = () => {
  const initialSettings = {
    baseFee: "0.15",
    incomeTax: "0.10",
    initialBalance: "100000000",
    enableMargin: true,
    enableShortSelling: false
  };

  const [settings, setSettings] = useState(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const isChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    setHasChanges(isChanged);
  }, [settings]);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDiscard = () => {
    setSettings(initialSettings);
  };

  const handleSave = () => {
    console.log("Saving settings:", settings);
    // Logic lưu API ở đây
    setHasChanges(false);
  };

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h1>Settings & Fees</h1>
        <p>Configure trading parameters and system defaults</p>
      </div>

      <div className="settings-container">
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
            <span className="helper-text">Applied to both buy and sell transactions</span>
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
            <span className="helper-text">Tax on capital gains from sell orders</span>
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
            <div className="info-box blue">
              <i className="fa-solid fa-circle-info"></i>
              <span>Default money given to new simulator accounts. Current value: {Number(settings.initialBalance).toLocaleString('vi-VN')} VND</span>
            </div>
          </div>
        </section>

        {/* System Configurations */}
        <section className="settings-card dashboard-section">
          <div className="card-header">
            <div className="icon-box purple">
              <i className="fa-solid fa-gear"></i>
            </div>
            <div className="header-info">
              <h3>System Configurations</h3>
              <p>Enable or disable advanced trading features</p>
            </div>
          </div>

          <div className="toggle-item">
            <div className="item-info">
              <span className="title">Enable Margin Trading</span>
              <span className="desc">Allow users to borrow funds for leveraged positions</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.enableMargin}
                onChange={(e) => handleChange("enableMargin", e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="item-info">
              <span className="title">Enable Short Selling</span>
              <span className="desc">Allow users to sell borrowed securities for profit on price decline</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.enableShortSelling}
                onChange={(e) => handleChange("enableShortSelling", e.target.checked)}
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
