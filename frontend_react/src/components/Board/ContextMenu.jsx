import React, { useEffect, useRef, useContext } from "react";
import "./ContextMenu.scss";
import { useFavorites } from "../../context/FavoritesContext";
import { useWatchlists } from "../../context/WatchlistsContext";
import { toast } from "react-toastify";
import { UserContext } from "../../context/UserContext";
import { useTranslation } from "../../context/LanguageContext";

/**
 * ContextMenu – hiện khi chuột phải vào 1 dòng cổ phiếu
 * Props:
 *   x, y                 – tọa độ hiển thị (px)
 *   symbol               – mã cổ phiếu
 *   isWatchlistMode      – nhóm watchlist hiện tại đang xem (nếu có)
 *   onRemoveFromWatchlist– hàm callback xóa khỏi watchlist
 *   onClose              – callback đóng menu
 */
const ContextMenu = ({ x, y, symbol, isWatchlistMode, onRemoveFromWatchlist, onClose }) => {
  const menuRef = useRef(null);
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { watchlists, customNames, addStockToWatchlist } = useWatchlists();
  const { user, setShowLoginModal } = useContext(UserContext);
  const { t } = useTranslation();
  const alreadyFav = isFavorite(symbol);

  // Đóng khi click bên ngoài
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    // Scroll cũng đóng menu
    const handleScroll = () => onClose();

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  const handleAddFavorite = () => {
    if (!user?.isAuthenticated) {
      setShowLoginModal(true);
      toast.warning(t("sidebar.favoritesLoginWarning"));
      onClose();
      return;
    }
    if (alreadyFav) {
      removeFavorite(symbol);
      toast.info(t("contextMenu.removeFavoriteSuccess").replace("{symbol}", symbol));
    } else {
      addFavorite(symbol);
      toast.success(t("contextMenu.addFavoriteSuccess").replace("{symbol}", symbol));
    }
    onClose();
  };

  const handleViewDetail = () => {
    window.dispatchEvent(new CustomEvent("open-stock-detail", { detail: { symbol } }));
    onClose();
  };

  const handlePlaceOrder = () => {
    if (!user?.isAuthenticated) {
      setShowLoginModal(true);
      toast.warning(t("sidebar.placeOrderLoginWarning"));
    } else {
      window.dispatchEvent(new CustomEvent("open-order-modal", { detail: { symbol } }));
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: y, left: x }}
    >
      <div className="context-menu__header">{symbol}</div>

      <div className="context-menu__item" onClick={handleAddFavorite}>
        <i className={`fa-${alreadyFav ? "solid" : "regular"} fa-star`} style={{ color: alreadyFav ? "#f5c518" : "" }} />
        <span>{alreadyFav ? t("contextMenu.removeFavorite") : t("contextMenu.addFavorite")}</span>
      </div>

      <div className="context-menu__divider" />

      {/* Chỉ hiển thị nút "Xóa khỏi nhóm" khi đang xem nhóm đó và đã đăng nhập */}
      {user?.isAuthenticated && isWatchlistMode && onRemoveFromWatchlist && (
        <>
          <div 
            className="context-menu__item" 
            style={{ color: "#ef5350" }} 
            onClick={() => { 
              onRemoveFromWatchlist(isWatchlistMode, symbol); 
              onClose(); 
            }}
          >
            <i className="fa-solid fa-folder-minus" style={{ color: "#ef5350" }} />
            <span>
              {t("contextMenu.removeFromWatchlist").replace("{group}", t(`sidebar.${isWatchlistMode}`))}
            </span>
          </div>
          <div className="context-menu__divider" />
        </>
      )}

      {/* Chỉ hiển thị mục Thêm vào nhóm (Watchlists) khi người dùng đã đăng nhập */}
      {user?.isAuthenticated && (
        <>
          <div className="context-menu__item has-submenu">
            <i className="fa-solid fa-folder-plus" />
            <span>{t("contextMenu.addToWatchlist")}</span>
            <i className="fa-solid fa-chevron-right submenu-arrow" />
            
            <div className="context-menu__submenu">
              <div className="submenu-item" onClick={() => { addStockToWatchlist("banking", symbol); onClose(); }}>
                <i className="fa-solid fa-building-columns" />
                <span>{t("sidebar.banking")}</span>
              </div>
              <div className="submenu-item" onClick={() => { addStockToWatchlist("technology", symbol); onClose(); }}>
                <i className="fa-solid fa-microchip" />
                <span>{t("sidebar.technology")}</span>
              </div>
              <div className="submenu-item" onClick={() => { addStockToWatchlist("realEstate", symbol); onClose(); }}>
                <i className="fa-solid fa-house" />
                <span>{t("sidebar.realEstate")}</span>
              </div>
              <div className="submenu-item" onClick={() => { addStockToWatchlist("energy", symbol); onClose(); }}>
                <i className="fa-solid fa-bolt" />
                <span>{t("sidebar.energy")}</span>
              </div>

              {/* Render custom watchlists in the add to watchlist menu */}
              {Object.keys(watchlists)
                .filter((key) => key.startsWith("custom_"))
                .map((groupKey) => {
                  const groupName = customNames[groupKey] || groupKey;
                  return (
                    <div
                      key={groupKey}
                      className="submenu-item"
                      onClick={() => {
                        addStockToWatchlist(groupKey, symbol);
                        onClose();
                      }}
                    >
                      <i className="fa-solid fa-folder" style={{ color: '#4fc3f7' }} />
                      <span>{groupName}</span>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="context-menu__divider" />
        </>
      )}

      <div className="context-menu__item" onClick={handleViewDetail}>
        <i className="fa-solid fa-chart-line" />
        <span>{t("contextMenu.viewDetail")}</span>
      </div>

      <div className="context-menu__item" onClick={handlePlaceOrder}>
        <i className="fa-solid fa-file-invoice-dollar" />
        <span>{t("contextMenu.placeOrder")}</span>
      </div>
    </div>
  );
};

export default ContextMenu;
