import React from "react";
import "./Sidebar.scss";

/**
 * Sidebar - Cột bên trái: Watchlist, Danh mục, Công cụ
 */
const Sidebar = () => {
  return (
    <aside className="sidebar">
      {/* ===================== MARKET OVERVIEW ===================== */}
      <div className="sidebar__section sidebar__market-overview">
        <div className="sidebar__section-title">
          <i className="fa-solid fa-chart-bar"></i>
          <span>MARKET OVERVIEW</span>
        </div>
        <div className="sidebar__overview-grid">
          <div className="overview-item overview-item--up">
            <span className="overview-item__label">HOSE</span>
            <span className="overview-item__value">+1.2%</span>
          </div>
          <div className="overview-item overview-item--down">
            <span className="overview-item__label">HNX</span>
            <span className="overview-item__value">-1.1%</span>
          </div>
          <div className="overview-item overview-item--up">
            <span className="overview-item__label">VN30</span>
            <span className="overview-item__value">+1.4%</span>
          </div>
        </div>
      </div>

      {/* ===================== BỘ LỌC CỔ PHIẾU ===================== */}
      <div className="sidebar__section sidebar__filter">
        <div className="sidebar__filter-item sidebar__filter-item--active">
          <i className="fa-solid fa-list"></i>
          <span>All Stocks</span>
          <span className="badge">VN30</span>
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

        {/* Watchlist hiện tại đang được chọn */}
        <div className="sidebar__watchlist-item sidebar__watchlist-item--active">
          <div className="watchlist-item__info">
            <i className="fa-solid fa-bookmark"></i>
            <span className="watchlist-item__name">My Portfolio</span>
          </div>
          <span className="watchlist-item__count">13</span>
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
