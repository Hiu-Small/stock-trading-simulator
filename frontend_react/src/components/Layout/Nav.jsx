import React, { useState, useContext } from "react";
import "./Nav.scss";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import LoginModal from "../Auth/LoginModal";
import { toast } from "react-toastify";
import { UserContext } from "../../context/UserContext";
import { SearchContext } from "../../context/SearchContext";

const Nav = (props) => {
  const { user, logoutContext } = useContext(UserContext);
  const { handleSearch, clearSearch } = useContext(SearchContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isUserArea = location.pathname === "/profile" || location.pathname === "/account";

  const handleLogout = () => {
    clearSearch();
    logoutContext();
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
          <NavLink to="/asset" className="child-nav-link" onClick={handleUnderDevelopment}>
            Quản lý tài sản
          </NavLink>
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
        <div className="screener">
          <div className="icon-screener">
            <i className="fa-solid fa-bolt-lightning"></i>
          </div>
          <div className="text-screener">
            <span>Screener</span>
          </div>
        </div>
        <div className="nav-actions">
          <div className="action-icons">
            <div className="notification">
              <i className="fa-solid fa-bell"></i>
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
          <div className="separator"></div>
          
          {user?.isAuthenticated ? (
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
          ) : (
            <div className="auth-buttons">
              <NavLink to="/register" className="btn-open-account">Mở tài khoản</NavLink>
              <button className="btn-login" onClick={() => setShowLogin(true)}>
                Đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>

      <LoginModal 
        show={showLogin} 
        handleClose={() => setShowLogin(false)} 
      />
    </div>
  );
};

export default Nav;
