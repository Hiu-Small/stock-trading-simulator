import React, { useContext, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./Sidebar.scss";
import { UserContext } from "../../context/UserContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useWatchlists } from "../../context/WatchlistsContext";
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
  const { watchlists, customNames, createWatchlist, getWatchlistCount, renameWatchlist, deleteWatchlist } = useWatchlists();
  const { t } = useTranslation();
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Watchlist Context Menu and Rename States
  const [watchlistMenu, setWatchlistMenu] = useState(null); // { x, y, groupKey }
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameGroupKey, setRenameGroupKey] = useState(null);
  const [renameGroupName, setRenameGroupName] = useState("");

  // Effect to close watchlist context menu on window click/right-click elsewhere
  useEffect(() => {
    const handleClose = () => setWatchlistMenu(null);
    const handleNativeContextMenu = (e) => {
      // Only close if we right-click outside a watchlist item
      if (!e.target.closest(".sidebar__watchlist-item")) {
        setWatchlistMenu(null);
      }
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("contextmenu", handleNativeContextMenu);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("contextmenu", handleNativeContextMenu);
    };
  }, []);

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
              toast.warning(t("sidebar.placeOrderLoginWarning"));
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
          className={`sidebar__filter-item ${(!props.isSearchMode && !props.isPortfolioMode && !props.isFavoritesMode && !props.isWatchlistMode) ? "sidebar__filter-item--active" : ""}`}
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
          title={t("sidebar.favoritesListTitle")}
        >
          {/* Click star icon -> load board */}
          <i
            className="fa-solid fa-star"
            style={{ color: favorites.length > 0 ? "#f5c518" : "", cursor: "pointer" }}
            onClick={() => {
              if (!user?.isAuthenticated) {
                setShowLoginModal(true);
                toast.warning(t("sidebar.favoritesLoginWarning"));
                return;
              }
              props.onFavoritesClick && props.onFavoritesClick();
            }}
            title={t("sidebar.favoritesShowBoardTitle")}
          />
          {/* Click text/arrow -> toggle danh sách hoặc toast khi trống */}
          <span
            style={{ flex: 1, cursor: "pointer" }}
            onClick={() => {
              if (!user?.isAuthenticated) {
                setShowLoginModal(true);
                toast.warning(t("sidebar.favoritesLoginWarning"));
                return;
              }
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
          <button
            className="sidebar__add-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (!user?.isAuthenticated) {
                setShowLoginModal(true);
                toast.warning(t("sidebar.createWatchlistLoginWarning"));
                return;
              }
              setShowAddModal(true);
            }}
          >
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
          {user?.isAuthenticated && (
            <span className="watchlist-item__count">{props.portfolioCount ?? 0}</span>
          )}
        </div>

        {/* Danh sách các nhóm mặc định */}
        <div
          className={`sidebar__watchlist-item ${props.isWatchlistMode === "banking" ? "sidebar__watchlist-item--active" : ""}`}
          onClick={() => props.onWatchlistClick && props.onWatchlistClick("banking")}
          style={{ cursor: "pointer" }}
        >
          <div className="watchlist-item__info">
            {props.watchlistLoading === "banking" ? (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '10px', color: '#26a69a' }}></i>
            ) : (
              <i className="fa-solid fa-building-columns"></i>
            )}
            <span className="watchlist-item__name">{t("sidebar.banking")}</span>
          </div>
          <span className="watchlist-item__count">{getWatchlistCount("banking")}</span>
        </div>

        <div
          className={`sidebar__watchlist-item ${props.isWatchlistMode === "technology" ? "sidebar__watchlist-item--active" : ""}`}
          onClick={() => props.onWatchlistClick && props.onWatchlistClick("technology")}
          style={{ cursor: "pointer" }}
        >
          <div className="watchlist-item__info">
            {props.watchlistLoading === "technology" ? (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '10px', color: '#26a69a' }}></i>
            ) : (
              <i className="fa-solid fa-microchip"></i>
            )}
            <span className="watchlist-item__name">{t("sidebar.technology")}</span>
          </div>
          <span className="watchlist-item__count">{getWatchlistCount("technology")}</span>
        </div>

        <div
          className={`sidebar__watchlist-item ${props.isWatchlistMode === "realEstate" ? "sidebar__watchlist-item--active" : ""}`}
          onClick={() => props.onWatchlistClick && props.onWatchlistClick("realEstate")}
          style={{ cursor: "pointer" }}
        >
          <div className="watchlist-item__info">
            {props.watchlistLoading === "realEstate" ? (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '10px', color: '#26a69a' }}></i>
            ) : (
              <i className="fa-solid fa-house"></i>
            )}
            <span className="watchlist-item__name">{t("sidebar.realEstate")}</span>
          </div>
          <span className="watchlist-item__count">{getWatchlistCount("realEstate")}</span>
        </div>

        <div
          className={`sidebar__watchlist-item ${props.isWatchlistMode === "energy" ? "sidebar__watchlist-item--active" : ""}`}
          onClick={() => props.onWatchlistClick && props.onWatchlistClick("energy")}
          style={{ cursor: "pointer" }}
        >
          <div className="watchlist-item__info">
            {props.watchlistLoading === "energy" ? (
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '10px', color: '#26a69a' }}></i>
            ) : (
              <i className="fa-solid fa-bolt"></i>
            )}
            <span className="watchlist-item__name">{t("sidebar.energy")}</span>
          </div>
          <span className="watchlist-item__count">{getWatchlistCount("energy")}</span>
        </div>

        {/* Danh sách các nhóm tùy chỉnh (Custom Watchlists) */}
        {Object.keys(watchlists)
          .filter((key) => key.startsWith("custom_"))
          .map((groupKey) => {
            const groupName = customNames[groupKey] || groupKey;
            const isActive = props.isWatchlistMode === groupKey;
            const isLoading = props.watchlistLoading === groupKey;
            return (
              <div
                key={groupKey}
                className={`sidebar__watchlist-item ${isActive ? "sidebar__watchlist-item--active" : ""}`}
                onClick={() => props.onWatchlistClick && props.onWatchlistClick(groupKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const menuW = 130;
                  const menuH = 80;
                  const vw = window.innerWidth;
                  const vh = window.innerHeight;
                  const x = e.clientX + menuW > vw ? e.clientX - menuW : e.clientX;
                  const y = e.clientY + menuH > vh ? e.clientY - menuH : e.clientY;
                  setWatchlistMenu({ x, y, groupKey });
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="watchlist-item__info">
                  {isLoading ? (
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '10px', color: '#26a69a' }}></i>
                  ) : (
                    <i className="fa-solid fa-folder" style={{ color: '#4fc3f7' }}></i>
                  )}
                  <span className="watchlist-item__name">{groupName}</span>
                </div>
                <span className="watchlist-item__count">{getWatchlistCount(groupKey)}</span>
              </div>
            );
          })}
      </div>

      {/* ===================== CÔNG CỤ ===================== */}
      <div className="sidebar__section sidebar__tools">
        <div className="sidebar__section-title">{t("sidebar.tools")}</div>

        <div className="sidebar__tool-item" onClick={() => toast.info(t("nav.devNotice"))}>
          <i className="fa-solid fa-bolt-lightning"></i>
          <span>{t("sidebar.screener")}</span>
          <span className="tool-badge tool-badge--new">New</span>
        </div>

        <div className="sidebar__tool-item" onClick={() => toast.info(t("nav.devNotice"))}>
          <i className="fa-solid fa-sliders"></i>
          <span>{t("sidebar.preferences")}</span>
        </div>
      </div>

      {/* Premium Glassmorphism Create Watchlist Modal */}
      {showAddModal && (
        <div className="watchlist-modal-overlay" onClick={() => { setShowAddModal(false); setNewGroupName(""); }}>
          <div className="watchlist-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="watchlist-modal__title">
              {t("sidebar.createWatchlistTitle")}
            </h3>
            <input
              type="text"
              className="watchlist-modal__input"
              placeholder={t("sidebar.createWatchlistPlaceholder")}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const trimmed = newGroupName.trim();
                  if (!trimmed) {
                    toast.warning(t("sidebar.createWatchlistEmptyWarning"));
                    return;
                  }
                  const createdKey = createWatchlist(trimmed);
                  if (createdKey) {
                    setShowAddModal(false);
                    setNewGroupName("");
                    if (props.onWatchlistClick) {
                      props.onWatchlistClick(createdKey);
                    }
                  }
                } else if (e.key === "Escape") {
                  setShowAddModal(false);
                  setNewGroupName("");
                }
              }}
              autoFocus
            />
            <div className="watchlist-modal__actions">
              <button 
                className="watchlist-modal__btn watchlist-modal__btn--cancel"
                onClick={() => { setShowAddModal(false); setNewGroupName(""); }}
              >
                {t("sidebar.createWatchlistCancel")}
              </button>
              <button 
                className="watchlist-modal__btn watchlist-modal__btn--submit"
                onClick={() => {
                  const trimmed = newGroupName.trim();
                  if (!trimmed) {
                    toast.warning(t("sidebar.createWatchlistEmptyWarning"));
                    return;
                  }
                  const createdKey = createWatchlist(trimmed);
                  if (createdKey) {
                    setShowAddModal(false);
                    setNewGroupName("");
                    if (props.onWatchlistClick) {
                      props.onWatchlistClick(createdKey);
                    }
                  }
                }}
              >
                {t("sidebar.createWatchlistSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Context Menu (Rendered via React Portal directly into body to avoid overflow clipping) */}
      {watchlistMenu && createPortal(
        <div 
          className="watchlist-context-menu"
          style={{ top: watchlistMenu.y, left: watchlistMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="watchlist-context-menu__item" 
            onClick={() => {
              setRenameGroupKey(watchlistMenu.groupKey);
              setRenameGroupName(customNames[watchlistMenu.groupKey] || "");
              setShowRenameModal(true);
              setWatchlistMenu(null);
            }}
          >
            <i className="fa-solid fa-pen" />
            <span>{t("sidebar.renameWatchlist")}</span>
          </div>
          <div 
            className="watchlist-context-menu__item watchlist-context-menu__item--danger" 
            onClick={() => {
              const groupKey = watchlistMenu.groupKey;
              setWatchlistMenu(null);
              const deleted = deleteWatchlist(groupKey);
              if (deleted) {
                if (props.isWatchlistMode === groupKey && props.onAllStocksClick) {
                  props.onAllStocksClick();
                }
              }
            }}
          >
            <i className="fa-solid fa-trash" />
            <span>{t("sidebar.deleteWatchlist")}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Rename Watchlist Modal (Rendered via React Portal for absolute overlay layering) */}
      {showRenameModal && createPortal(
        <div className="watchlist-modal-overlay" onClick={() => { setShowRenameModal(false); setRenameGroupKey(null); setRenameGroupName(""); }}>
          <div className="watchlist-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="watchlist-modal__title">
              {t("sidebar.renameWatchlistTitle")}
            </h3>
            <input
              type="text"
              className="watchlist-modal__input"
              placeholder={t("sidebar.createWatchlistPlaceholder")}
              value={renameGroupName}
              onChange={(e) => setRenameGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const trimmed = renameGroupName.trim();
                  if (!trimmed) {
                    toast.warning(t("sidebar.createWatchlistEmptyWarning"));
                    return;
                  }
                  const success = renameWatchlist(renameGroupKey, trimmed);
                  if (success) {
                    setShowRenameModal(false);
                    setRenameGroupKey(null);
                    setRenameGroupName("");
                  }
                } else if (e.key === "Escape") {
                  setShowRenameModal(false);
                  setRenameGroupKey(null);
                  setRenameGroupName("");
                }
              }}
              autoFocus
            />
            <div className="watchlist-modal__actions">
              <button 
                className="watchlist-modal__btn watchlist-modal__btn--cancel"
                onClick={() => { setShowRenameModal(false); setRenameGroupKey(null); setRenameGroupName(""); }}
              >
                {t("sidebar.createWatchlistCancel")}
              </button>
              <button 
                className="watchlist-modal__btn watchlist-modal__btn--submit"
                onClick={() => {
                  const trimmed = renameGroupName.trim();
                  if (!trimmed) {
                    toast.warning(t("sidebar.createWatchlistEmptyWarning"));
                    return;
                  }
                  const success = renameWatchlist(renameGroupKey, trimmed);
                  if (success) {
                    setShowRenameModal(false);
                    setRenameGroupKey(null);
                    setRenameGroupName("");
                  }
                }}
              >
                {t("sidebar.renameWatchlistSubmit")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
};

export default Sidebar;
