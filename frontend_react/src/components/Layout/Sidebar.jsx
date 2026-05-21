import React, { useContext, useState } from "react";
import "./Sidebar.scss";
import { UserContext } from "../../context/UserContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useTranslation } from "../../context/LanguageContext";
import { toast } from "react-toastify";

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
  const { user, setShowLoginModal } = useContext(UserContext);
  const { favorites, removeFavorite } = useFavorites();
  const { t } = useTranslation();
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
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
          onClick={() => {
            if (!user?.isAuthenticated) {
              setShowLoginModal(true);
              toast.warning(t("lang") === "vi" ? "Vui lòng đăng nhập để đặt lệnh!" : "Please log in to place an order!");
              return;
            }
            window.dispatchEvent(new CustomEvent("open-order-modal", { detail: { symbol: "ACB" } }));
          }}
        >
          <i className="fa-solid fa-file-invoice-dollar"></i>
          <span>{t("sidebar.placeOrder")}</span>
        </button>
      </div>

      {/* ===================== BỘ LỌC CỔ PHIẾU ===================== */}
      <div className="sidebar__section sidebar__filter">
        <div
          className="sidebar__filter-item sidebar__filter-item--active"
          onClick={props.onAllStocksClick}
          title={
            props.isSearchMode || props.isPortfolioMode
              ? (t("lang") === "vi" ? `Quay về bảng ${GROUP_LABELS[props.selectedGroup] || props.selectedGroup}` : `Back to ${GROUP_LABELS[props.selectedGroup] || props.selectedGroup} board`)
              : (t("lang") === "vi" ? `Đang xem nhóm ${currentGroupLabel}` : `Viewing group ${currentGroupLabel}`)
          }
        >
          <i className="fa-solid fa-list"></i>
          <span>{t("sidebar.allStocks")}</span>
          <span className={`badge ${props.isSearchMode ? "badge--search" :
              props.isPortfolioMode ? "badge--portfolio" : ""
            }`}>{currentGroupLabel}</span>
        </div>
        <div
          className={`sidebar__filter-item ${props.isFavoritesMode ? "sidebar__filter-item--active" : ""}`}
          title={t("lang") === "vi" ? "Danh sách cổ phiếu yêu thích" : "Favorite stocks list"}
        >
          {/* Click star icon -> load board */}
          <i
            className="fa-solid fa-star"
            style={{ color: favorites.length > 0 ? "#f5c518" : "", cursor: "pointer" }}
            onClick={props.onFavoritesClick}
            title={t("lang") === "vi" ? "Hiện bảng giá Favorites" : "Show Favorites board"}
          />
          {/* Click text/arrow -> toggle danh sách hoặc toast khi trống */}
          <span
            style={{ flex: 1, cursor: "pointer" }}
            onClick={() => {
              if (favorites.length === 0) {
                props.onFavoritesClick && props.onFavoritesClick();
              } else {
                setFavoritesExpanded(e => !e);
              }
            }}
          >
            {t("sidebar.favorites")}
          </span>
          {favorites.length > 0 && (
            <>
              <span className="badge badge--favorites">{favorites.length}</span>
              <i
                className={`fa-solid fa-chevron-${favoritesExpanded ? "up" : "down"}`}
                style={{ fontSize: "9px", color: "#555577", cursor: "pointer", marginLeft: "2px" }}
                onClick={() => setFavoritesExpanded(e => !e)}
              />
            </>
          )}
        </div>

        {/* Danh sách Favorites - chỉ hiện khi expand */}
        {favoritesExpanded && favorites.length > 0 && (
          <div className="sidebar__favorites-list">
            {favorites.map((symbol) => (
              <div
                key={symbol}
                className="sidebar__favorite-item"
                onClick={() => props.onFavoriteTickerClick && props.onFavoriteTickerClick(symbol)}
                title={t("lang") === "vi" ? `Xem ${symbol}` : `View ${symbol}`}
              >
                <i className="fa-solid fa-star" />
                <span className="favorite-item__symbol">{symbol}</span>
                <button
                  className="favorite-item__remove"
                  title={t("lang") === "vi" ? `Xóa ${symbol} khỏi Yêu thích` : `Remove ${symbol} from Favorites`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(symbol);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================== WATCHLISTS ===================== */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <span className="sidebar__section-title">{t("sidebar.watchlists")}</span>
          <button className="sidebar__add-btn">
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {/* My Portfolio - kết nối với danh mục thực tế */}
        <div
          className={`sidebar__watchlist-item ${props.isPortfolioMode ? "sidebar__watchlist-item--active" : ""}`}
          onClick={props.onPortfolioClick}
          title={t("lang") === "vi" ? "Danh mục cổ phiếu của bạn" : "Your stock portfolio"}
          style={{ cursor: "pointer" }}
        >
          <div className="watchlist-item__info">
            {props.portfolioLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '10px', color: '#26a69a' }}></i>
            ) : (
              <i className="fa-solid fa-briefcase"></i>
            )}
            <span className="watchlist-item__name">{t("sidebar.myPortfolio")}</span>
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
        <div className="sidebar__section-title">{t("sidebar.tools")}</div>

        <div className="sidebar__tool-item">
          <i className="fa-solid fa-bolt-lightning"></i>
          <span>{t("sidebar.screener")}</span>
          <span className="tool-badge tool-badge--new">New</span>
        </div>

        <div className="sidebar__tool-item">
          <i className="fa-solid fa-sliders"></i>
          <span>{t("sidebar.preferences")}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

