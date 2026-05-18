import React, { useState, useContext } from "react";
import "./Nav.scss";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../../context/UserContext";
import { SearchContext } from "../../context/SearchContext";

const Nav = (props) => {
  const { user, logoutContext, setShowLoginModal, balance, refreshBalance, notifications, markAllAsRead, toggleReadStatus } = useContext(UserContext);
  const { handleSearch, clearSearch } = useContext(SearchContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = notifications ? notifications.filter(n => !n.is_read).length : 0;

  const isUserArea = location.pathname === "/profile" || location.pathname === "/account";

  const handleLogout = () => {
    clearSearch();
    logoutContext();
    setShowLoginModal(false);
    sessionStorage.removeItem("account");
    toast.success("Đăng xuất thành công!");
    navigate("/");
  };

  // Kiểm tra trạng thái Onboarding & Trạng thái Khóa
  React.useEffect(() => {
    if (user?.isAuthenticated && user?.account?.role !== 'ADMIN') {
      const status = user?.account?.status?.toUpperCase();
      const currentPath = window.location.pathname;

      // 1. Nếu tài khoản bị khóa
      if (status === 'LOCKED') {
        toast.error("Tài khoản của bạn đã bị khóa. Bạn sẽ bị đăng xuất ngay lập tức.", {
          toastId: 'locked-notice'
        });
        const timer = setTimeout(() => {
          handleLogout();
        }, 3000);
        return () => clearTimeout(timer);
      }

      // 2. Nếu chưa hoàn tất định danh (Onboarding)
      if (status === 'UNVERIFIED' || status === 'KYC_COMPLETED') {
        if (currentPath !== '/onboarding' && currentPath !== '/register' && currentPath !== '/profile' && currentPath !== '/account') {
          toast.info("Vui lòng hoàn thiện hồ sơ để bắt đầu giao dịch", {
            toastId: 'onboarding-notice'
          });
          const timer = setTimeout(() => {
            navigate('/onboarding');
          }, 3000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [user, navigate]);

  React.useEffect(() => {
    const handleOutsideClick = () => {
      setShowNotifDropdown(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case "ORDER_PLACE":
        return { icon: "fa-solid fa-paper-plane", cls: "place" };
      case "ORDER_MATCH":
        return { icon: "fa-solid fa-circle-check", cls: "match" };
      case "ORDER_PARTIAL_MATCH":
        return { icon: "fa-solid fa-circle-notch fa-spin", cls: "partial" };
      case "ORDER_CANCEL":
        return { icon: "fa-solid fa-circle-xmark", cls: "cancel" };
      case "ORDER_EXPIRED_CANCEL":
        return { icon: "fa-solid fa-clock", cls: "expired" };
      case "SYSTEM_ADJUST_BALANCE":
        return { icon: "fa-solid fa-wallet", cls: "balance-adjust" };
      case "SYSTEM_UPDATE_STATUS":
        return { icon: "fa-solid fa-user-shield", cls: "status-adjust" };
      case "SYSTEM_RESET_PASSWORD":
        return { icon: "fa-solid fa-key", cls: "security-adjust" };
      case "SYSTEM_RESET_PIN":
        return { icon: "fa-solid fa-shield-halved", cls: "security-adjust" };
      default:
        return { icon: "fa-solid fa-bell", cls: "default" };
    }
  };

  const handleUnderDevelopment = (e) => {
    e.preventDefault();
    toast.info("Tính năng đang được phát triển", {
      position: "top-center",
      autoClose: 3000,
    });
  };

  return (
    <div className="nav-container">
      <div className="left-container">
        <div className="logo-name">
          <div className="logo">
            <span>
              <i className="fa-solid fa-arrow-trend-up"></i>
            </span>
          </div>
          <div className="name">
            <span className="chu-i">i</span>
            <span className="chu-board">Board</span>
          </div>
        </div>

        <div className="nav-link">
          <NavLink to="/market" className="child-nav-link">
            Thị trường
          </NavLink>
          <NavLink to="/analysis" className="child-nav-link" onClick={handleUnderDevelopment}>
            Phân tích
          </NavLink>
          <div className="asset-dropdown-wrapper">
            <div className="child-nav-link asset-nav-trigger">
              Quản lý tài sản <i className="fa-solid fa-chevron-down asset-caret"></i>
            </div>
            <div className="asset-dropdown-menu">
              <NavLink to="/orders" className="asset-dropdown-item">
                <i className="fa-solid fa-list-check"></i>
                <span>Sổ lệnh</span>
              </NavLink>
              <NavLink to="/portfolio" className="asset-dropdown-item">
                <i className="fa-solid fa-briefcase"></i>
                <span>Danh mục</span>
              </NavLink>
            </div>
          </div>
          <NavLink to="/news" className="child-nav-link" onClick={handleUnderDevelopment}>
            Tin tức
          </NavLink>
        </div>

        {!isUserArea && (
          <div className="search">
            <div className="icon-search">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <div className="input-search">
              <input 
                placeholder="Search Ticker..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(searchTerm);
                    setSearchTerm("");
                    // Đảm bảo chuyển về trang market nếu đang ở trang khác
                    if (location.pathname !== "/market") {
                      navigate("/market");
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        <div className={`status-market status--${props.marketStatus?.toLowerCase()}`}>
          <span className="dot"></span> 
          <span className="text">
            {props.marketStatus === "OPEN" && "MARKET OPEN"}
            {props.marketStatus === "BREAK" && "LUNCH BREAK"}
            {props.marketStatus === "CLOSED" && "MARKET CLOSED"}
          </span>
        </div>
      </div>

      <div className="right-container">
        {/* <div className="screener">
          <div className="icon-screener">
            <i className="fa-solid fa-bolt-lightning"></i>
          </div>
          <div className="text-screener">
            <span>Screener</span>
          </div>
        </div> */}
        <div className="nav-actions">
          <div className="action-icons">
            <div 
              className={`notification-wrapper ${showNotifDropdown ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (user?.isAuthenticated) {
                  setShowNotifDropdown(!showNotifDropdown);
                } else {
                  setShowLoginModal(true);
                }
              }}
            >
              <div className={`notification-icon-btn ${unreadCount > 0 ? "has-badge" : ""}`}>
                <i className="fa-solid fa-bell"></i>
                {user?.isAuthenticated && unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </div>

              {showNotifDropdown && user?.isAuthenticated && (
                <div className="notif-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="notif-dropdown-header">
                    <h4>Thông báo ({unreadCount})</h4>
                    <div className="header-actions">
                      {unreadCount > 0 && (
                        <span className="mark-all-read-btn" onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}>
                          <i className="fa-solid fa-check-double"></i> Đọc tất cả
                        </span>
                      )}
                      <span className="clear-all-btn" onClick={() => setShowNotifDropdown(false)}>Đóng</span>
                    </div>
                  </div>
                  <div className="notif-dropdown-body">
                    {!notifications || notifications.length === 0 ? (
                      <div className="notif-empty">
                        <i className="fa-regular fa-bell-slash"></i>
                        <p>Không có thông báo mới nào</p>
                      </div>
                    ) : (
                      notifications.map((item, idx) => {
                        const notifDetails = getNotifIcon(item.change_type);
                        const isRead = !!item.is_read;
                        return (
                          <div key={`notif-${item.id || idx}`} className={`notif-item ${notifDetails.cls} ${isRead ? "read" : "unread"}`}>
                            <div className="notif-item-icon">
                              <i className={notifDetails.icon}></i>
                            </div>
                            <div className="notif-item-content">
                              <div className="notif-item-text">{item.new_value}</div>
                              <div className="notif-item-time-row">
                                <span className="notif-item-time">{formatTimeAgo(item.createdAt)}</span>
                                <span 
                                  className="notif-mark-btn" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    toggleReadStatus(item.id); 
                                  }}
                                  title={isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                                >
                                  {isRead ? (
                                    <i className="fa-regular fa-envelope"></i>
                                  ) : (
                                    <i className="fa-solid fa-envelope-open"></i>
                                  )}
                                  <span className="mark-btn-text">{isRead ? " Chưa đọc" : " Đã đọc"}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="notif-dropdown-footer">
                    <NavLink to="/orders" onClick={() => setShowNotifDropdown(false)}>
                      Xem tất cả trong Sổ lệnh <i className="fa-solid fa-arrow-right"></i>
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
            <div className="theme-toggle">
              <i className="fa-solid fa-moon"></i>
            </div>
            <div className="language">
              <svg width="20" height="20" viewBox="0 0 512 512" style={{borderRadius: '50%'}}>
                <rect width="512" height="512" fill="#da251d"/>
                <polygon 
                  fill="#ff0" 
                  points="256,92 298,223 436,223 325,303 367,435 256,355 145,435 187,303 76,223 214,223"
                />
              </svg>
            </div>
          </div>
          
          {user?.isAuthenticated ? (
            <>
              <div className="virtual-balance-chip" onClick={refreshBalance} title="Bấm để cập nhật số dư">
                <span className="balance-label">VỐN ẢO</span>
                <span className="balance-val">{balance.toLocaleString('vi-VN')} ₫</span>
                <span className="balance-refresh"><i className="fa-solid fa-rotate"></i></span>
              </div>
              <div className="user-profile-dropdown">
                <div className="user-info">
                  <div className="avatar">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <span className="username">{user?.account?.username}</span>
                  <i className="fa-solid fa-chevron-down dropdown-icon"></i>
                </div>
                <div className="dropdown-menu-custom">
                  {user?.account?.role === 'ADMIN' && (
                    <NavLink to="/admin" className="dropdown-item">
                      <i className="fa-solid fa-gauge"></i> Dashboard Admin
                    </NavLink>
                  )}
                  <NavLink to="/profile" className="dropdown-item">
                    <i className="fa-solid fa-id-card"></i> Thông tin cá nhân
                  </NavLink>
                  <NavLink 
                    to="/account" 
                    className="dropdown-item"
                    onClick={() => console.log("Navigating to Account Settings...")}
                  >
                    <i className="fa-solid fa-user-gear"></i> Thông tin tài khoản
                  </NavLink>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item logout" onClick={handleLogout}>
                    <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <NavLink to="/register" className="btn-open-account">Mở tài khoản</NavLink>
              <button className="btn-login" onClick={() => setShowLoginModal(true)}>
                Đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Nav;
