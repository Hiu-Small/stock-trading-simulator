import React, { useState } from "react";
import "./OrderEntry.scss";

const OrderEntry = ({ symbol, data }) => {
  const [account, setAccount] = useState("Q191741");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [isAutoPrice, setIsAutoPrice] = useState(false);
  const [saveAuth, setSaveAuth] = useState(true);

  return (
    <div className="order-entry-panel">
      <div className="order-entry-header">
        <div className="title">Đặt lệnh</div>
      </div>

      <div className="order-entry-body">
        {/* Symbol Info */}
        <div className="symbol-info">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <span className="symbol-name">{symbol}</span>
          <span className="exchange-name">(HOSE)</span>
        </div>

        {/* Account Selection */}
        <div className="form-row">
          <label>Tài khoản đặt lệnh</label>
          <div className="account-select-wrapper">
            <select value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="Q191741">Q191741</option>
              <option value="Q123456">Q123456</option>
            </select>
            <i className="fa-solid fa-gear settings-icon"></i>
          </div>
        </div>

        {/* Buying Power */}
        <div className="form-row buying-power">
          <label>Sức mua <i className="fa-regular fa-circle-question"></i></label>
          <div className="value-group">
            <span className="balance">4,065,444 VNĐ</span>
            <span className="limits-wrapper">
              (<span className="buy-limit">168</span>
              <span className="divider"> / </span>
              <span className="sell-limit">0</span>)
            </span>
          </div>
        </div>

        {/* Auto Price */}
        <div className="form-row auto-price">
          <label>Giá tự động <i className="fa-regular fa-circle-question"></i></label>
          <div className={`toggle-switch ${isAutoPrice ? 'active' : ''}`} onClick={() => setIsAutoPrice(!isAutoPrice)}>
            <span className="toggle-circle"></span>
          </div>
        </div>

        {/* Quantity */}
        <div className="form-row">
          <label>Khối lượng</label>
          <div className="number-input">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
            <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
        </div>

        {/* Price */}
        <div className="form-row">
          <label>Giá (x1000 VNĐ)</label>
          <div className="number-input">
            <button onClick={() => setPrice(Math.max(0, price - 0.1))}>-</button>
            <input type="number" step="0.1" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
            <button onClick={() => setPrice(price + 0.1)}>+</button>
          </div>
        </div>

        {/* Quick Price Buttons */}
        <div className="quick-price-buttons">
          <button className="outline-btn">MTL</button>
          <button className="outline-btn">ATO</button>
          <button className="outline-btn">ATC</button>
        </div>

        {/* Value Display */}
        <div className="form-row total-value">
          <label>Giá trị</label>
          <span className="value">0 VNĐ</span>
        </div>

        <div className="divider-light"></div>

        {/* Authentication */}
        <div className="form-row auth-section">
          <label>Kiểu xác thực</label>
          <div className="auth-controls">
            <span className="otp-label">Mã Smart OTP</span>
            <label className="checkbox-container">
              <input type="checkbox" checked={saveAuth} onChange={() => setSaveAuth(!saveAuth)} />
              <span className="checkmark"></span>
              Lưu xác thực
            </label>
            <select className="otp-select">
              <option>8...</option>
            </select>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="action-buttons">
          <button className="btn-buy">Mua</button>
          <button className="btn-sell">Bán</button>
        </div>
      </div>
    </div>
  );
};

export default OrderEntry;
