import React from "react";
import "./Sidebar.scss";

// Ánh xạ group ID → label ngắn gọn hiển thị trên badge
const GROUP_LABELS = {
  VN30: "VN30",
  HNX30: "HNX30",
  HOSE: "HOSE",
  HNX: "HNX",
  UPCOM: "UPCOM",
  VN100: "VN100",
  SEARCH: "SEARCH",
};

/**
 * Sidebar - Cột bên trái: Watchlist, Danh mục, Công cụ
 * Props:
 *   selectedGroup   - Nhóm đang được chọn trên bảng board (VN30, HOSE, ...)
 *   onAllStocksClick - Callback khi click "All Stocks" để clear search và về board chính
 */
const Sidebar = (props) => {
  const currentGroupLabel = props.isSearchMode
    ? "SEARCH"
    : props.isPortfolioMode
      ? "PORT"
      : GROUP_LABELS[props.selectedGroup] || props.selectedGroup || "VN30";

  return (
    <aside className="sidebar">
      {/* ===================== ĐẶT LỆNH NHANH ===================== */}
      <div className="sidebar__section sidebar__place-order">
        <button
          className="sidebar__place-order-btn"
          onClick={() => window.dispatchEvent(new CustomEvent("open-order-modal", { detail: { symbol: "ACB" } }))}
        >
          <i className="fa-solid fa-file-invoice-dollar"></i>
          <span>Đặt lệnh</span>
        </button>
      </div>

      {/* ===================== BỘ LỌC CỔ PHIẾU ===================== */}
      <div className="sidebar__section sidebar__filter">
        <div
          className="sidebar__filter-item sidebar__filter-item--active"
          onClick={props.onAllStocksClick}
          title={
            props.isSearchMode || props.isPortfolioMode
              ? `Quay về bảng ${GROUP_LABELS[props.selectedGroup] || props.selectedGroup}`
              : `Đang xem nhóm ${currentGroupLabel}`
          }
        >
          <i className="fa-solid fa-list"></i>
          <span>All Stocks</span>
          <span className={`badge ${props.isSearchMode ? "badge--search" :
              props.isPortfolioMode ? "badge--portfolio" : ""
            }`}>{currentGroupLabel}</span>
        </div>
        <div className="sidebar__filter-item">
          <i className="fa-solid fa-star"></i>
          <span>Favorites</span>
        </div>
      </div>

      {/* ===================== WATCHLISTS ===================== */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <span className="sidebar__section-title">WATCHLISTS</span>
          <button className="sidebar__add-btn">
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {/* My Portfolio - kết nối với danh mục thực tế */}
        <div
          className={`sidebar__watchlist-item ${props.isPortfolioMode ? "sidebar__watchlist-item--active" : ""}`}
          onClick={props.onPortfolioClick}
          title="Danh mục cổ phiếu của bạn"
          style={{ cursor: "pointer" }}
        >
          <div className="watchlist-item__info">
            {props.portfolioLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '10px', color: '#26a69a' }}></i>
            ) : (
              <i className="fa-solid fa-briefcase"></i>
            )}
            <span className="watchlist-item__name">My Portfolio</span>
          </div>
          {props.isPortfolioMode && (
            <span className="watchlist-item__count" style={{ color: '#64dd17', background: 'rgba(100,221,23,0.12)', border: '1px solid rgba(100,221,23,0.3)' }}>✓</span>
          )}
        </div>

        {/* Danh sách các nhóm */}
        <div className="sidebar__watchlist-item">
          <div className="watchlist-item__info">
            <i className="fa-solid fa-building-columns"></i>
            <span className="watchlist-item__name">Banking</span>
          </div>
          <span className="watchlist-item__count">8</span>
        </div>

        <div className="sidebar__watchlist-item">
          <div className="watchlist-item__info">
            <i className="fa-solid fa-microchip"></i>
            <span className="watchlist-item__name">Technology</span>
          </div>
          <span className="watchlist-item__count">5</span>
        </div>

        <div className="sidebar__watchlist-item">
          <div className="watchlist-item__info">
            <i className="fa-solid fa-house"></i>
            <span className="watchlist-item__name">Real Estate</span>
          </div>
          <span className="watchlist-item__count">8</span>
        </div>

        <div className="sidebar__watchlist-item">
          <div className="watchlist-item__info">
            <i className="fa-solid fa-bolt"></i>
            <span className="watchlist-item__name">Energy</span>
          </div>
          <span className="watchlist-item__count">6</span>
        </div>
      </div>

      {/* ===================== CÔNG CỤ ===================== */}
      <div className="sidebar__section sidebar__tools">
        <div className="sidebar__section-title">TOOLS</div>

        <div className="sidebar__tool-item">
          <i className="fa-solid fa-bolt-lightning"></i>
          <span>Screener</span>
          <span className="tool-badge tool-badge--new">New</span>
        </div>

        <div className="sidebar__tool-item">
          <i className="fa-solid fa-sliders"></i>
          <span>Preferences</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

