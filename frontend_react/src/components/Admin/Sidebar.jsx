import { NavLink, useNavigate, Link } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { toast } from "react-toastify";
import { useTranslation } from "../../context/LanguageContext";
import "./Sidebar.scss";

const Sidebar = () => {
  const { logoutContext } = useContext(UserContext);
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const handleLogout = () => {
    logoutContext();
    sessionStorage.removeItem("account");
    toast.success(lang === "vi" ? "Đăng xuất thành công!" : "Logged out successfully!");
    navigate("/");
  };

  const menuItems = [
    { icon: "fa-solid fa-house", label: t("admin.sidebar.backHome"), path: "/", isExternal: true },
    { icon: "fa-solid fa-table-columns", label: t("admin.sidebar.dashboard"), path: "/admin/dashboard" },
    { icon: "fa-solid fa-users", label: t("admin.sidebar.users"), path: "/admin/users" },
    { icon: "fa-solid fa-chart-line", label: t("admin.sidebar.market"), path: "/admin/market" },
    { icon: "fa-solid fa-wave-square", label: t("admin.sidebar.trades"), path: "/admin/trades" },
    { icon: "fa-solid fa-building-columns", label: t("admin.sidebar.corporate"), path: "/admin/corporate-actions" },
    { icon: "fa-solid fa-gear", label: t("admin.sidebar.settings"), path: "/admin/settings" },
    { icon: "fa-solid fa-trophy", label: t("admin.sidebar.leaderboard"), path: "/admin/leaderboard" },
    { icon: "fa-solid fa-file-lines", label: t("admin.sidebar.logs"), path: "/admin/logs" },
  ];

  return (
    <div className="admin-sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <i className="fa-solid fa-chart-line"></i>
        </div>
        <div className="logo-text">
          <h1>Trading Sim</h1>
          <span>{t("admin.sidebar.adminPortal")}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          item.isExternal ? (
            <Link key={item.path} to={item.path} className="nav-item home-link">
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </NavLink>
          )
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            <i className="fa-solid fa-user"></i>
          </div>
          <div className="user-info">
            <span className="user-name">Admin User</span>
            <span className="user-email">admin@tradingsim.io</span>
          </div>
        </div>
        
        <button className="btn-logout" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>{t("admin.sidebar.logout")}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
