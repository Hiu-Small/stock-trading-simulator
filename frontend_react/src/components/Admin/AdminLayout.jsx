import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { selectTheme, setTheme } from "../../store/themeSlice";
import { useTranslation } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import { fetchAllUsers, fetchAllOrders, fetchSystemLogs } from "../../services/adminService";
import Sidebar from "./Sidebar";
import AdminDashboard from "./Dashboard/AdminDashboard";
import UsersPage from "./Users/UsersPage";
import MarketData from "./Market/MarketData";
import TradeMonitoring from "./Trades/TradeMonitoring";
import CorporateActions from "./CorporateActions/CorporateActions";
import SettingsPage from "./Settings/SettingsPage";
import LeaderboardPage from "./Leaderboard/LeaderboardPage";
import SystemLogs from "./Logs/SystemLogs";
import "./AdminLayout.scss";

const UnderDevelopment = () => {
  const { t } = useTranslation();
  return (
    <div className="under-development-container" style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "400px",
      height: "70vh",
      background: "var(--bg-elevated)",
      borderRadius: "16px",
      border: "1px solid var(--border-primary)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
      backdropFilter: "blur(8px)",
      margin: "24px",
      textAlign: "center",
      padding: "32px",
      transition: "all 0.3s ease"
    }}>
      <div style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "rgba(38, 166, 154, 0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "24px"
      }}>
        <i className="fa-solid fa-screwdriver-wrench" style={{ fontSize: "36px", color: "#26a69a" }}></i>
      </div>
      <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "12px", color: "var(--text-heading)" }}>
        {t("nav.devNotice")}
      </h2>
      <p style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "450px", lineHeight: "1.6" }}>
        {t("nav.devNoticeDesc")}
      </p>
    </div>
  );
};

const AdminLayout = () => {
  const { lang, setLang, t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentTheme = useSelector(selectTheme);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [rawUsers, setRawUsers] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSearchData = async () => {
    if (rawUsers.length > 0) return; // cache loaded
    setIsLoading(true);
    try {
      const [usersRes, ordersRes, logsRes] = await Promise.allSettled([
        fetchAllUsers(),
        fetchAllOrders(),
        fetchSystemLogs(1, 100)
      ]);
      
      if (usersRes.status === "fulfilled" && usersRes.value && usersRes.value.EC === 0) {
        setRawUsers(usersRes.value.DT || []);
      }
      if (ordersRes.status === "fulfilled" && ordersRes.value && ordersRes.value.EC === 0) {
        setRawOrders(ordersRes.value.DT || []);
      }
      if (logsRes.status === "fulfilled" && logsRes.value && logsRes.value.EC === 0) {
        setRawLogs(logsRes.value.DT?.list || logsRes.value.DT || []);
      }
    } catch (err) {
      console.error("Load search data error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleCloseDropdowns = () => {
      setShowThemeDropdown(false);
      setShowLangDropdown(false);
      setIsSearchFocused(false);
    };
    window.addEventListener("click", handleCloseDropdowns);
    return () => window.removeEventListener("click", handleCloseDropdowns);
  }, []);

  // Filter lists with defensive checks to prevent runtime crashes
  const query = searchQuery.trim().toLowerCase();
  
  const filteredUsers = query && Array.isArray(rawUsers)
    ? rawUsers.filter(u => 
        u && (
          u.id?.toString().toLowerCase().includes(query) ||
          u.profile?.full_name?.toLowerCase().includes(query) ||
          u.username?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.account_number?.toLowerCase().includes(query)
        )
      ).slice(0, 5)
    : [];

  const filteredOrders = query && Array.isArray(rawOrders)
    ? rawOrders.filter(o => 
        o && (
          o.id?.toString().toLowerCase().includes(query) ||
          o.symbol?.toLowerCase().includes(query) ||
          o.side?.toLowerCase().includes(query) ||
          o.status?.toLowerCase().includes(query) ||
          o.userId?.toString().toLowerCase().includes(query)
        )
      ).slice(0, 5)
    : [];

  const filteredLogs = query && Array.isArray(rawLogs)
    ? rawLogs.filter(l => 
        l && (
          l.message?.toLowerCase().includes(query) ||
          l.level?.toLowerCase().includes(query)
        )
      ).slice(0, 5)
    : [];

  // Navigation commands
  const navItems = [
    { label: t("admin.sidebar.users") || "Users & Accounts", path: "users", keywords: ["user", "taikhoan", "nguoidung", "accounts", "khachhang"] },
    { label: t("admin.sidebar.market") || "Market Data", path: "market", keywords: ["market", "thitruong", "co phieu", "stock", "hose", "hnx"] },
    { label: t("admin.sidebar.trades") || "Trade Monitoring", path: "trades", keywords: ["trade", "giao dich", "order", "lenh", "monitoring"] },
    { label: t("admin.sidebar.settings") || "Settings & Fees", path: "settings", keywords: ["setting", "cauhinh", "phi", "fees", "rules"] },
    { label: t("admin.sidebar.logs") || "System Logs", path: "logs", keywords: ["log", "nhatky", "hethong", "system", "audit"] },
  ];

  const filteredNavigation = query
    ? navItems.filter(item => 
        (item.label && typeof item.label === "string" && item.label.toLowerCase().includes(query)) || 
        (Array.isArray(item.keywords) && item.keywords.some(k => k && k.includes(query)))
      )
    : [];

  return (
    <div className="admin-layout">
      {/* Sidebar bên trái */}
      <Sidebar />

      {/* Nội dung chính bên phải */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <Routes>
              <Route path="dashboard" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.dashboard")}</span>
                </div>
              } />
              <Route path="users" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.users")}</span>
                </div>
              } />
              <Route path="market" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.market")}</span>
                </div>
              } />
              <Route path="trades" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.trades")}</span>
                </div>
              } />
              <Route path="corporate-actions" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.corporate")}</span>
                </div>
              } />
              <Route path="settings" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.settings")}</span>
                </div>
              } />
              <Route path="leaderboard" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.leaderboard")}</span>
                </div>
              } />
              <Route path="logs" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">{t("admin.sidebar.logs")}</span>
                </div>
              } />
              <Route path="*" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                </div>
              } />
            </Routes>
          </div>
          <div className="header-right">
            <div className="search-bar" onClick={(e) => e.stopPropagation()}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder={t("admin.search.placeholder")} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setIsSearchFocused(true);
                  loadSearchData();
                }}
              />
              {isSearchFocused && (searchQuery || isLoading) && (
                <div className="search-results-dropdown">
                  {isLoading ? (
                    <div className="search-loading">
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>{lang === "vi" ? "Đang tải dữ liệu..." : "Loading data..."}</span>
                    </div>
                  ) : (
                    <>
                      {/* Navigation group */}
                      {filteredNavigation.length > 0 && (
                        <div className="search-group">
                          <div className="search-group-title">
                            <i className="fa-solid fa-compass"></i>
                            <span>{t("admin.search.navigation")}</span>
                          </div>
                          <div className="search-items">
                            {filteredNavigation.map(item => (
                              <div 
                                key={item.path} 
                                className="search-item navigation-item"
                                onClick={() => {
                                  navigate(item.path);
                                  setIsSearchFocused(false);
                                  setSearchQuery("");
                                }}
                              >
                                <span className="item-title">{item.label}</span>
                                <span className="item-badge">{lang === "vi" ? "Đi tới" : "Go to"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Users group */}
                      {filteredUsers.length > 0 && (
                        <div className="search-group">
                          <div className="search-group-title">
                            <i className="fa-solid fa-user"></i>
                            <span>{t("admin.search.users")}</span>
                          </div>
                          <div className="search-items">
                            {filteredUsers.map(user => {
                              const accDisplay = user.account_number || user.username || user.id;
                              const accPrefix = accDisplay.toString().startsWith('#') ? accDisplay : `#${accDisplay}`;
                              return (
                                <div 
                                  key={user.id} 
                                  className="search-item user-item"
                                  onClick={() => {
                                    navigator.clipboard.writeText(user.id);
                                    toast.success(lang === "vi" ? `Đã sao chép ID của ${accPrefix}` : `Copied ID for ${accPrefix}`);
                                    navigate("users", { state: { expandUserId: user.id } });
                                    setIsSearchFocused(false);
                                    setSearchQuery("");
                                  }}
                                >
                                  <div className="item-main">
                                    <span className="item-title">
                                      {user.profile?.full_name || user.username || user.email}
                                      <span className="item-account-badge" style={{ marginLeft: "8px", fontSize: "11px", opacity: 0.7, background: "rgba(255, 255, 255, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                                        {accPrefix}
                                      </span>
                                    </span>
                                    <span className="item-sub">ID: {user.id} | {user.email}</span>
                                  </div>
                                  <span className={`status-badge ${user.status?.toLowerCase()}`}>
                                    {user.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Trades group */}
                      {filteredOrders.length > 0 && (
                        <div className="search-group">
                          <div className="search-group-title">
                            <i className="fa-solid fa-exchange-alt"></i>
                            <span>{t("admin.search.trades")}</span>
                          </div>
                          <div className="search-items">
                            {filteredOrders.map(order => (
                              <div 
                                key={order.id} 
                                className="search-item trade-item"
                                onClick={() => {
                                  navigate("trades");
                                  setIsSearchFocused(false);
                                  setSearchQuery("");
                                }}
                              >
                                <div className="item-main">
                                  <span className="item-title">
                                    <span className={`side-tag ${order.side?.toLowerCase()}`}>{order.side}</span> {order.quantity} CP {order.symbol} @ {order.price?.toLocaleString()} ₫
                                  </span>
                                  <span className="item-sub">ID: {order.id} | ACC: {order.user?.account_number || order.user_id}</span>
                                </div>
                                <span className={`status-badge ${order.status?.toLowerCase()}`}>
                                  {order.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Logs group */}
                      {filteredLogs.length > 0 && (
                        <div className="search-group">
                          <div className="search-group-title">
                            <i className="fa-solid fa-terminal"></i>
                            <span>{t("admin.search.logs")}</span>
                          </div>
                          <div className="search-items">
                            {filteredLogs.map((log, idx) => (
                              <div 
                                key={log.id || idx} 
                                className="search-item log-item"
                                onClick={() => {
                                  navigate("logs");
                                  setIsSearchFocused(false);
                                  setSearchQuery("");
                                }}
                              >
                                <div className="item-main">
                                  <span className="item-title log-message">{log.message}</span>
                                  <span className="item-sub">{log.createdAt || log.time}</span>
                                </div>
                                <span className={`log-level-badge ${log.level?.toLowerCase() || 'info'}`}>
                                  {log.level || 'INFO'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {filteredNavigation.length === 0 && filteredUsers.length === 0 && filteredOrders.length === 0 && filteredLogs.length === 0 && (
                        <div className="search-no-results">
                          <i className="fa-regular fa-face-frown"></i>
                          <span>{t("admin.search.noResults")}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="header-icons">
              <div className="notification">
                <i className="fa-solid fa-bell"></i>
                <span className="badge"></span>
              </div>

              {/* Theme Toggle */}
              <div 
                className={`theme-toggle-wrapper ${showThemeDropdown ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowThemeDropdown(!showThemeDropdown);
                }}
              >
                <div className="theme-icon-btn">
                  <i className={`fa-solid ${currentTheme === "light" ? "fa-sun" : "fa-moon"}`}></i>
                </div>

                {showThemeDropdown && (
                  <div className="theme-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <div 
                      className={`theme-dropdown-item ${currentTheme === "dark" ? "active" : ""}`}
                      onClick={() => {
                        dispatch(setTheme("dark"));
                        setShowThemeDropdown(false);
                      }}
                    >
                      <i className="fa-solid fa-moon"></i>
                      <span>{t("nav.themeDark") || "Tối"}</span>
                    </div>
                    <div 
                      className={`theme-dropdown-item ${currentTheme === "light" ? "active" : ""}`}
                      onClick={() => {
                        dispatch(setTheme("light"));
                        setShowThemeDropdown(false);
                      }}
                    >
                      <i className="fa-solid fa-sun"></i>
                      <span>{t("nav.themeLight") || "Sáng"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <div 
                className={`language-wrapper ${showLangDropdown ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLangDropdown(!showLangDropdown);
                }}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", position: "relative" }}
                data-tooltip={lang === "vi" ? "Ngôn ngữ" : "Language"}
              >
                <div className="language-icon-btn" style={{ display: 'flex', alignItems: 'center' }}>
                  {lang === "vi" ? (
                    <svg width="24" height="16" viewBox="0 0 512 341" style={{ borderRadius: '2px', display: 'block' }}>
                      <rect width="512" height="341" fill="#da251d"/>
                      <g transform="translate(256, 170.5) scale(0.55) translate(-256, -256)">
                        <polygon 
                          fill="#ff0" 
                          points="256,92 298,223 436,223 325,303 367,435 256,355 145,435 187,303 76,223 214,223"
                        />
                      </g>
                    </svg>
                  ) : (
                    <svg width="24" height="16" viewBox="0 0 60 30" style={{ borderRadius: '2px', display: 'block', objectFit: 'cover' }}>
                      <rect width="60" height="30" fill="#012169"/>
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                      <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
                      <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
                    </svg>
                  )}
                </div>

                {showLangDropdown && (
                  <div className="language-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <div 
                      className={`language-dropdown-item ${lang === "vi" ? "active" : ""}`}
                      onClick={() => {
                        if (lang !== "vi") {
                          setLang("vi");
                          toast.info("Đã chuyển sang Tiếng Việt");
                        }
                        setShowLangDropdown(false);
                      }}
                    >
                      <svg width="20" height="13" viewBox="0 0 512 341" style={{ borderRadius: '1.5px', display: 'block' }}>
                        <rect width="512" height="341" fill="#da251d"/>
                        <g transform="translate(256, 170.5) scale(0.55) translate(-256, -256)">
                          <polygon 
                            fill="#ff0" 
                            points="256,92 298,223 436,223 325,303 367,435 256,355 145,435 187,303 76,223 214,223"
                          />
                        </g>
                      </svg>
                      <span>Tiếng Việt</span>
                    </div>
                    <div 
                      className={`language-dropdown-item ${lang === "en" ? "active" : ""}`}
                      onClick={() => {
                        if (lang !== "en") {
                          setLang("en");
                          toast.info("Switched to English");
                        }
                        setShowLangDropdown(false);
                      }}
                    >
                      <svg width="20" height="13" viewBox="0 0 60 30" style={{ borderRadius: '1.5px', display: 'block', objectFit: 'cover' }}>
                        <rect width="60" height="30" fill="#012169"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                        <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
                        <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
                      </svg>
                      <span>English</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="dashboard" element={<UnderDevelopment />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="market" element={<MarketData />} />
            <Route path="trades" element={<TradeMonitoring />} />
            <Route path="corporate-actions" element={<UnderDevelopment />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="leaderboard" element={<UnderDevelopment />} />
            <Route path="logs" element={<SystemLogs />} />
            {/* Tạm thời redirect từ /admin về /admin/users */}
            <Route path="/" element={<Navigate to="users" replace />} />
            <Route path="*" element={<Navigate to="users" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
