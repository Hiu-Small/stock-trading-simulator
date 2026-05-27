import React, { useState, useContext } from "react";
import "./Nav.scss";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { setTheme, selectTheme } from "../../store/themeSlice";
import { UserContext } from "../../context/UserContext";
import { SearchContext } from "../../context/SearchContext";
import { useTranslation } from "../../context/LanguageContext";
import useAllStocks from "../../hooks/useAllStocks";

export const translateNotificationText = (text, currentLang, t) => {
  if (!text || !t) return text;

  // 1. Đặt thành công lệnh MUA/BÁN
  // Ví dụ: "Đặt thành công lệnh MUA 2500 CP CAN với giá 29.000 đ"
  let match = text.match(/Đặt thành công lệnh (MUA|BÁN) (\d+) CP ([A-Z0-9]+) với giá ([0-9.,]+)/i);
  if (match) {
    const rawSide = match[1];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const qty = match[2];
    const symbol = match[3];
    const price = match[4];
    return t("nav.notifTemplates.successPlace")
      .replace("{side}", side)
      .replace("{qty}", qty)
      .replace("{symbol}", symbol)
      .replace("{price}", price);
  }

  // 2. Lệnh hết hạn cuối ngày: Đã tự động hủy lệnh MUA/BÁN
  // Ví dụ: "Lệnh hết hạn cuối ngày: Đã tự động hủy lệnh MUA 18000 CP DXP"
  match = text.match(/Lệnh hết hạn cuối ngày:\s*Đã tự động hủy lệnh (MUA|BÁN) (\d+) CP ([A-Z0-9]+)/i);
  if (match) {
    const rawSide = match[1];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const qty = match[2];
    const symbol = match[3];
    return t("nav.notifTemplates.expiredCancel")
      .replace("{side}", side)
      .replace("{qty}", qty)
      .replace("{symbol}", symbol);
  }

  // 3. Khớp một phần / Khớp hoàn toàn
  // Ví dụ: "Khớp một phần lệnh MUA: Đã khớp 12000 CP DXP với giá 13.200 đ vào lúc 14:45:03"
  // Ví dụ: "Khớp hoàn toàn lệnh MUA: Đã khớp 2500 CP CAN với giá 29.000 đ vào lúc 10:14:15"
  match = text.match(/(Khớp một phần|Khớp hoàn toàn) lệnh (MUA|BÁN):\s*Đã khớp (\d+) CP ([A-Z0-9]+) với giá ([0-9.,]+)(?:\s*đ)? vào lúc (.*)/i);
  if (match) {
    const rawMatchType = match[1];
    const matchType = rawMatchType === "Khớp một phần" 
      ? t("nav.notifTemplates.partiallyMatched") 
      : t("nav.notifTemplates.fullyMatched");
    const rawSide = match[2];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const qty = match[3];
    const symbol = match[4];
    const price = match[5];
    const time = match[6];
    return t("nav.notifTemplates.matchedStatus")
      .replace("{matchType}", matchType)
      .replace("{side}", side)
      .replace("{qty}", qty)
      .replace("{symbol}", symbol)
      .replace("{price}", price)
      .replace("{time}", time);
  }

  // 4. Tài khoản của bạn vừa được Admin cộng thêm/khấu trừ tiền ảo
  // Ví dụ: "Tài khoản của bạn vừa được Admin cộng thêm 500.000.000 ₫ vốn ảo. Lý do: Cấp vốn 500 củ"
  match = text.match(/Tài khoản của bạn vừa được Admin (cộng thêm|khấu trừ) ([0-9.,]+)\s*(?:₫|đ)?\s*vốn ảo\.\s*Lý do:\s*(.*)/i);
  if (match) {
    const rawType = match[1];
    const type = rawType === "cộng thêm" ? t("nav.notifTemplates.adminAdd") : t("nav.notifTemplates.adminDeduct");
    const amount = match[2];
    let reason = match[3];

    // Dịch động lý do chào mừng nếu ngôn ngữ không phải tiếng Việt
    if (currentLang !== "vi") {
      reason = reason.replace(
        /Chào mừng bạn tham gia iBoard! Vì đây là trang web giả lập giao dịch chứng khoán dành cho người mới đầu tư, hệ thống đã cấp sẵn cho bạn ([0-9.,]+) ₫ vốn ảo để bắt đầu luyện tập\./gi,
        "Welcome to iBoard! Since this is a stock trading simulator designed for beginners, the system has automatically credited your account with $1 ₫ in virtual capital to start practicing your investments."
      );
    }

    return t("nav.notifTemplates.adminAdjust")
      .replace("{type}", type)
      .replace("{amount}", amount)
      .replace("{reason}", reason);
  }

  // 5. Admin đã hủy lệnh MUA/BÁN
  // Ví dụ: "Admin đã hủy lệnh MUA 2500 CP CAN"
  match = text.match(/Admin đã hủy lệnh (MUA|BÁN) (\d+)\s*(?:CP|shares)?\s*([A-Z0-9]+)/i);
  if (match) {
    const rawSide = match[1];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const qty = match[2];
    const symbol = match[3];
    return t("nav.notifTemplates.adminOrderCancelled")
      .replace("{side}", side)
      .replace("{qty}", qty)
      .replace("{symbol}", symbol);
  }

  // 5a. Admin đã đặt lệnh MUA/BÁN hộ bạn
  // Ví dụ: "Admin đã đặt lệnh BÁN hộ bạn: 100 CP ACB với giá 22.900 ₫"
  match = text.match(/Admin đã đặt lệnh (MUA|BÁN) hộ bạn:\s*(\d+)\s*(?:CP|shares)?\s*([A-Z0-9]+)\s*với giá\s*(.*)/i);
  if (match) {
    const rawSide = match[1];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const qty = match[2];
    const symbol = match[3];
    const price = match[4];
    return t("nav.notifTemplates.adminOrderPlaced")
      .replace("{side}", side)
      .replace("{qty}", qty)
      .replace("{symbol}", symbol)
      .replace("{price}", price);
  }

  // 5b. Đã hủy thành công lệnh MUA/BÁN
  // Ví dụ: "Đã hủy thành công lệnh MUA 50 CP BID"
  match = text.match(/Đã hủy thành công lệnh (MUA|BÁN) (\d+)\s*(?:CP|shares)?\s*([A-Z0-9]+)/i);
  if (match) {
    const rawSide = match[1];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const qty = match[2];
    const symbol = match[3];
    return t("nav.notifTemplates.orderCancelled")
      .replace("{side}", side)
      .replace("{qty}", qty)
      .replace("{symbol}", symbol);
  }

  // 6. Admin đã sửa lệnh MUA/BÁN
  // Ví dụ: "Admin đã sửa lệnh MUA ACB: Thay đổi Giá từ 22.700 ₫ sang 22.650 ₫"
  match = text.match(/Admin đã sửa lệnh (MUA|BÁN) ([A-Z0-9]+):\s*(.*)/i);
  if (match) {
    const rawSide = match[1];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const symbol = match[2];
    let desc = match[3];
    if (currentLang !== "vi") {
      desc = desc
        .replace(/Thay đổi Giá từ/gi, "Changed Price from")
        .replace(/Thay đổi Khối lượng từ/gi, "Changed Volume from")
        .replace(/sang/gi, "to")
        .replace(/CP/g, "shares")
        .replace(/Còn lại/gi, "Remaining");
    }
    return t("nav.notifTemplates.adminOrderModified")
      .replace("{side}", side)
      .replace("{symbol}", symbol)
      .replace("{desc}", desc);
  }

  // 6a. Đã sửa lệnh MUA/BÁN
  // Ví dụ: "Đã sửa lệnh SELL ACB: Thay đổi Giá từ 22.700 đ sang 22.650 đ"
  match = text.match(/Đã sửa lệnh (MUA|BÁN) ([A-Z0-9]+):\s*(.*)/i);
  if (match) {
    const rawSide = match[1];
    const side = rawSide === "MUA" ? t("nav.notifTemplates.buy") : t("nav.notifTemplates.sell");
    const symbol = match[2];
    let desc = match[3];
    if (currentLang !== "vi") {
      desc = desc
        .replace(/Thay đổi Giá từ/gi, "Changed Price from")
        .replace(/Thay đổi Khối lượng từ/gi, "Changed Volume from")
        .replace(/sang/gi, "to")
        .replace(/CP/g, "shares")
        .replace(/Còn lại/gi, "Remaining");
    }
    return t("nav.notifTemplates.orderModified")
      .replace("{side}", side)
      .replace("{symbol}", symbol)
      .replace("{desc}", desc);
  }

  // Fallback: Nếu ngôn ngữ hiện tại là vi thì giữ nguyên, ngược lại dịch tĩnh đơn giản
  if (currentLang === "vi") return text;

  let translated = text;
  translated = translated.replace(/Đặt thành công lệnh/gi, "Successfully placed order");
  translated = translated.replace(/Lệnh hết hạn cuối ngày:/gi, "End of day expired order:");
  translated = translated.replace(/Đã tự động hủy lệnh/gi, "Automatically cancelled order");
  translated = translated.replace(/Khớp một phần lệnh/gi, "Partially matched order");
  translated = translated.replace(/Khớp hoàn toàn lệnh/gi, "Fully matched order");
  translated = translated.replace(/Đã khớp/gi, "Matched");
  translated = translated.replace(/với giá/gi, "at price");
  translated = translated.replace(/vào lúc/gi, "at");
  translated = translated.replace(/CP/g, "shares");
  translated = translated.replace(/MUA/g, "BUY");
  translated = translated.replace(/BÁN/g, "SELL");
  translated = translated.replace(/Admin đã hủy lệnh/gi, "Admin cancelled order");
  translated = translated.replace(/Admin đã đặt lệnh/gi, "Admin placed order");
  translated = translated.replace(/hộ bạn:/gi, "on your behalf:");
  translated = translated.replace(/Admin đã sửa lệnh/gi, "Admin modified order");

  return translated;
};

const Nav = (props) => {
  const { user, logoutContext, setShowLoginModal, balance, refreshBalance, notifications, markAllAsRead, toggleReadStatus } = useContext(UserContext);
  const { handleSearch, clearSearch } = useContext(SearchContext);
  const { lang, setLang, t } = useTranslation();
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectTheme);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const { allStocks, loading: stocksLoading } = useAllStocks();
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const handleInputChange = (val) => {
    const cleanVal = val.toUpperCase();
    setSearchTerm(cleanVal);

    if (!cleanVal) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const filtered = allStocks.filter(stock => 
      stock.symbol.toUpperCase().includes(cleanVal) || 
      (stock.companyName && stock.companyName.toUpperCase().includes(cleanVal))
    ).slice(0, 7);

    setSuggestions(filtered);
    setActiveIndex(-1);
  };

  const handleSelectStock = (symbol) => {
    handleSearch(symbol.toUpperCase());
    setSearchTerm("");
    setSuggestions([]);
    setActiveIndex(-1);
    if (location.pathname !== "/market") {
      navigate("/market");
    }
  };
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
      setShowThemeDropdown(false);
      setShowLangDropdown(false);
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
    toast.info(t("nav.devNotice"), {
      position: "top-right",
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
            {t("nav.market")}
          </NavLink>
          <NavLink to="/analysis" className="child-nav-link" onClick={handleUnderDevelopment}>
            {t("nav.analysis")}
          </NavLink>
          <div className="asset-dropdown-wrapper">
            <div className="child-nav-link asset-nav-trigger">
              {t("nav.assetManage")} <i className="fa-solid fa-chevron-down asset-caret"></i>
            </div>
            <div className="asset-dropdown-menu">
              <NavLink to="/orders" className="asset-dropdown-item">
                <i className="fa-solid fa-list-check"></i>
                <span>{t("nav.orderBook")}</span>
              </NavLink>
              <NavLink to="/portfolio" className="asset-dropdown-item">
                <i className="fa-solid fa-briefcase"></i>
                <span>{t("nav.portfolio")}</span>
              </NavLink>
            </div>
          </div>
          <NavLink to="/news" className="child-nav-link" onClick={handleUnderDevelopment}>
            {t("nav.news")}
          </NavLink>
        </div>

        {!isUserArea && (
          <div className="search">
            <div className="icon-search">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <div className="input-search">
              <input 
                placeholder={t("nav.searchPlaceholder")} 
                value={searchTerm}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={() => {
                  setTimeout(() => {
                    setSuggestions([]);
                    setActiveIndex(-1);
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (activeIndex >= 0 && activeIndex < suggestions.length) {
                      handleSelectStock(suggestions[activeIndex].symbol);
                    } else if (searchTerm.trim()) {
                      handleSelectStock(searchTerm.trim());
                    }
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setSearchTerm("");
                    setSuggestions([]);
                    setActiveIndex(-1);
                  }
                }}
              />

              {/* Thả xuống gợi ý tìm kiếm cổ phiếu */}
              {suggestions.length > 0 && (
                <div className="nav-suggestions-dropdown">
                  {suggestions.map((stock, index) => (
                    <div
                      key={stock.symbol || index}
                      className={`suggestion-item ${index === activeIndex ? "suggestion-item--active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectStock(stock.symbol);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="symbol-badge">{stock.symbol}</span>
                      <span className="company-name">{stock.companyName}</span>
                      <span className="exchange-badge">({stock.exchange || "HOSE"})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`status-market status--${props.marketStatus?.toLowerCase()}`}>
          <span className="dot"></span> 
          <span className="text">
            {props.marketStatus === "OPEN" && t("nav.marketOpen")}
            {props.marketStatus === "BREAK" && t("nav.marketBreak")}
            {props.marketStatus === "CLOSED" && t("nav.marketClosed")}
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
              data-tooltip={lang === "vi" ? "Thông báo" : "Notifications"}
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
                    <h4>{t("nav.notifications")} ({unreadCount})</h4>
                    <div className="header-actions">
                      {unreadCount > 0 && (
                        <span className="mark-all-read-btn" onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}>
                          <i className="fa-solid fa-check-double"></i> {t("nav.markAllAsRead")}
                        </span>
                      )}
                      <span className="clear-all-btn" onClick={() => setShowNotifDropdown(false)}>{t("nav.close")}</span>
                    </div>
                  </div>
                  <div className="notif-dropdown-body">
                    {!notifications || notifications.length === 0 ? (
                      <div className="notif-empty">
                        <i className="fa-regular fa-bell-slash"></i>
                        <p>{t("nav.emptyNotif")}</p>
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
                               <div className="notif-item-text">{translateNotificationText(item.new_value, lang, t)}</div>
                               <div className="notif-item-time-row">
                                 <span className="notif-item-time">{formatTimeAgo(item.createdAt)}</span>
                                 <span 
                                   className="notif-mark-btn" 
                                   onClick={(e) => { 
                                     e.stopPropagation(); 
                                     toggleReadStatus(item.id); 
                                   }}
                                   title={isRead ? (lang === "vi" ? "Đánh dấu chưa đọc" : "Mark as unread") : (lang === "vi" ? "Đánh dấu đã đọc" : "Mark as read")}
                                 >
                                   {isRead ? (
                                     <i className="fa-regular fa-envelope"></i>
                                   ) : (
                                     <i className="fa-solid fa-envelope-open"></i>
                                   )}
                                   <span className="mark-btn-text">{isRead ? (lang === "vi" ? " Chưa đọc" : " Unread") : (lang === "vi" ? " Đã đọc" : " Read")}</span>
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
                      {t("nav.viewAllOrders")} <i className="fa-solid fa-arrow-right"></i>
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
            <div 
              className={`theme-toggle-wrapper ${showThemeDropdown ? "active" : ""}`}
              data-tooltip={lang === "vi" ? "Màu nền" : "Theme"}
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
                    <span>{t("nav.themeDark")}</span>
                  </div>
                  <div 
                    className={`theme-dropdown-item ${currentTheme === "light" ? "active" : ""}`}
                    onClick={() => {
                      dispatch(setTheme("light"));
                      setShowThemeDropdown(false);
                    }}
                  >
                    <i className="fa-solid fa-sun"></i>
                    <span>{t("nav.themeLight")}</span>
                  </div>
                </div>
              )}
            </div>
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
          
          {user?.isAuthenticated ? (
            <>
              <div className="virtual-balance-chip" onClick={refreshBalance} title={lang === "vi" ? "Bấm để cập nhật số dư" : "Click to refresh balance"}>
                <span className="balance-label">{t("nav.virtualBalance")}</span>
                <span className="balance-val">{balance.toLocaleString(lang === "vi" ? 'vi-VN' : 'en-US')} ₫</span>
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
                      <i className="fa-solid fa-gauge"></i> {t("nav.adminDashboard")}
                    </NavLink>
                  )}
                  <NavLink to="/profile" className="dropdown-item">
                    <i className="fa-solid fa-id-card"></i> {t("nav.personalProfile")}
                  </NavLink>
                  <NavLink 
                    to="/account" 
                    className="dropdown-item"
                    onClick={() => console.log("Navigating to Account Settings...")}
                  >
                    <i className="fa-solid fa-user-gear"></i> {t("nav.accountSettings")}
                  </NavLink>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item logout" onClick={handleLogout}>
                    <i className="fa-solid fa-right-from-bracket"></i> {t("nav.logout")}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <NavLink to="/register" className="btn-open-account">{t("nav.openAccount")}</NavLink>
              <button className="btn-login" onClick={() => setShowLoginModal(true)}>
                {t("nav.login")}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Nav;
