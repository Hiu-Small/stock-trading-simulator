import React, { useEffect, useRef, useContext } from "react";
import "./ContextMenu.scss";
import { useFavorites } from "../../context/FavoritesContext";
import { toast } from "react-toastify";
import { UserContext } from "../../context/UserContext";

/**
 * ContextMenu – hiện khi chuột phải vào 1 dòng cổ phiếu
 * Props:
 *   x, y     – tọa độ hiển thị (px)
 *   symbol   – mã cổ phiếu
 *   onClose  – callback đóng menu
 */
const ContextMenu = ({ x, y, symbol, onClose }) => {
  const menuRef = useRef(null);
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { user, setShowLoginModal } = useContext(UserContext);
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
    if (alreadyFav) {
      removeFavorite(symbol);
      toast.info(`Đã xóa ${symbol} khỏi danh sách yêu thích`);
    } else {
      addFavorite(symbol);
      toast.success(`Đã thêm ${symbol} vào Favorites ⭐`);
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
      toast.warning("Vui lòng đăng nhập để đặt lệnh!");
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
        <span>{alreadyFav ? "Xóa khỏi Favorites" : "Thêm vào Favorites"}</span>
      </div>

      <div className="context-menu__divider" />

      <div className="context-menu__item" onClick={handleViewDetail}>
        <i className="fa-solid fa-chart-line" />
        <span>Xem chi tiết</span>
      </div>

      <div className="context-menu__item" onClick={handlePlaceOrder}>
        <i className="fa-solid fa-file-invoice-dollar" />
        <span>Đặt lệnh</span>
      </div>
    </div>
  );
};

export default ContextMenu;
