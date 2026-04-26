import React from "react";
import "./StockDetailPanel.scss";

/**
 * StockDetailPanel - Bảng chi tiết bên phải khi click vào một mã cổ phiếu
 *
 * Props:
 *   ticker: string (mã cổ phiếu đang xem)
 *   onClose: function() (đóng panel)
 */
const StockDetailPanel = ({ ticker, onClose }) => {
  if (!ticker) return null;

  return (
    <aside className="stock-detail-panel">
      {/* ===== Header panel ===== */}
      <div className="detail-panel__header">
        <div className="detail-panel__ticker-info">
          <span className="detail-panel__ticker">{ticker}</span>
          <span className="detail-panel__company">Ngân hàng TMCP Á Châu</span>
        </div>
        <button className="detail-panel__close-btn" onClick={onClose} id="btn-close-detail">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* ===== Giá hiện tại ===== */}
      <div className="detail-panel__current-price">
        <span className="current-price__value price--down">24.2</span>
        <span className="current-price__change price--down">-0.30 (-1.22%)</span>
      </div>

      {/* ===== Các chỉ số nhanh (OHLC, KL) ===== */}
      <div className="detail-panel__quick-stats">
        <div className="quick-stat-row">
          <span className="qs-label">Mở cửa</span>
          <span className="qs-value">24.5</span>
        </div>
        <div className="quick-stat-row">
          <span className="qs-label">Cao nhất</span>
          <span className="qs-value price--up">24.8</span>
        </div>
        <div className="quick-stat-row">
          <span className="qs-label">Thấp nhất</span>
          <span className="qs-value price--down">23.9</span>
        </div>
        <div className="quick-stat-row">
          <span className="qs-label">Tham chiếu</span>
          <span className="qs-value price--ref">24.5</span>
        </div>
        <div className="quick-stat-row">
          <span className="qs-label">Trần</span>
          <span className="qs-value price--ceiling">26.2</span>
        </div>
        <div className="quick-stat-row">
          <span className="qs-label">Sàn</span>
          <span className="qs-value price--floor">22.8</span>
        </div>
        <div className="quick-stat-row">
          <span className="qs-label">KL Khớp</span>
          <span className="qs-value">12.35M</span>
        </div>
        <div className="quick-stat-row">
          <span className="qs-label">GT Khớp</span>
          <span className="qs-value">298.5 tỷ</span>
        </div>
      </div>

      {/* ===== Bảng giá Bid/Ask chi tiết ===== */}
      <div className="detail-panel__order-book">
        <div className="order-book__title">Sổ lệnh</div>

        <div className="order-book__table">
          {/* Header */}
          <div className="ob-row ob-row--header">
            <span>KL Mua</span>
            <span>Giá Mua</span>
            <span>Giá Bán</span>
            <span>KL Bán</span>
          </div>

          {/* Bid/Ask rows */}
          {[1, 2, 3].map((level) => (
            <div className="ob-row" key={level}>
              <span className="ob-vol ob-vol--bid">1.23K</span>
              <span className="ob-price price--up">24.{level}</span>
              <span className="ob-price price--down">24.{level + 3}</span>
              <span className="ob-vol ob-vol--ask">456.0K</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Khối ngoại ===== */}
      <div className="detail-panel__foreign">
        <div className="detail-panel__section-title">Khối ngoại</div>
        <div className="foreign-row">
          <span className="foreign-label">Mua ròng</span>
          <span className="foreign-value price--up">+234.5K cp</span>
        </div>
        <div className="foreign-row">
          <span className="foreign-label">NN Mua</span>
          <span className="foreign-value price--up">898.8K</span>
        </div>
        <div className="foreign-row">
          <span className="foreign-label">NN Bán</span>
          <span className="foreign-value price--down">664.3K</span>
        </div>
      </div>

      {/* ===== Các nút hành động ===== */}
      <div className="detail-panel__actions">
        <button className="action-btn action-btn--buy" id="btn-buy-stock">
          Mua
        </button>
        <button className="action-btn action-btn--sell" id="btn-sell-stock">
          Bán
        </button>
        <button className="action-btn action-btn--chart" id="btn-view-chart">
          <i className="fa-solid fa-chart-line"></i> Biểu đồ
        </button>
      </div>
    </aside>
  );
};

export default StockDetailPanel;
