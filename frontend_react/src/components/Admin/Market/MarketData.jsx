import React, { useState, useEffect } from "react";
import "./MarketData.scss";
import { fetchMarketData, updateStockStatus, syncStocks, fetchMarketStatus, updateMarketStatus } from "../../../services/adminService";
import { toast } from "react-toastify";
import { useTranslation } from "../../../context/LanguageContext";

const MarketData = () => {
  const { t, lang } = useTranslation();
  const [symbols, setSymbols] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, halted: 0 });
  const [activeGroup, setActiveGroup] = useState("VN30");
  const [marketOpen, setMarketOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const groups = ["VN30", "HOSE", "HNX", "UPCOM"];

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await syncStocks();
      if (response && response.EC === 0) {
        toast.success(t("admin.market.toastSyncSuccess"));
        loadData();
      } else {
        toast.error(response.EM || t("admin.market.toastSyncError"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("admin.market.toastConnError"));
    } finally {
      setSyncing(false);
    }
  };

  const isTradingSession = () => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const time = hours * 60 + minutes;

    // Thứ 7 (6) và Chủ nhật (0) không giao dịch
    if (day === 0 || day === 6) return false;

    // Giờ giao dịch: 9:00 - 11:30 và 13:00 - 15:00
    const morningStart = 9 * 60;
    const morningEnd = 11 * 60 + 30;
    const afternoonStart = 13 * 60;
    const afternoonEnd = 15 * 60;

    return (time >= morningStart && time <= morningEnd) || (time >= afternoonStart && time <= afternoonEnd);
  };

  const loadData = async (groupName = activeGroup) => {
    try {
      const response = await fetchMarketData(groupName);
      if (response && response.EC === 0) {
        const { stocks, summary: stats } = response.DT;
        
        const now = new Date();
        const currentTime = now.toLocaleTimeString("vi-VN", { hour12: false });
        const inSession = isTradingSession();

        const mappedData = stocks.map(s => {
          const change = s.matchPrice - s.refPrice;
          const changePercent = s.refPrice > 0 ? ((change / s.refPrice) * 100).toFixed(2) : "0.00";
          const sign = change > 0 ? "+" : "";
          
          // Logic Last Updated: Chỉ update giờ hiện tại nếu đang trong phiên
          // Nếu ngoài phiên, ưu tiên hiển thị giờ khớp cuối của sàn, hoặc 15:00:00
          let displayTime = s.matchTime || "15:00:00";
          if (inSession) {
            displayTime = currentTime;
          }
          
          return {
            code: s.symbol,
            name: s.companyName || "---",
            price: s.matchPrice ? (s.matchPrice / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2 }) : "0.00",
            change: `${sign}${changePercent}%`,
            isUp: change >= 0,
            status: s.is_active ? "Active" : "Halted",
            time: displayTime
          };
        });
        
        setSymbols(mappedData);
        setSummary(stats);
      } else {
        toast.error(response.EM || t("admin.market.toastLoadError"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("admin.market.toastConnError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    getInitialMarketStatus();
    const interval = setInterval(() => loadData(activeGroup), 15000);
    return () => clearInterval(interval);
  }, [activeGroup]);

  const getInitialMarketStatus = async () => {
    try {
      const response = await fetchMarketStatus();
      if (response && response.EC === 0) {
        setMarketOpen(response.DT === "OPEN");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGroupChange = (group) => {
    setActiveGroup(group);
    setLoading(true);
    setSymbols([]);
  };

  const handleToggleMarket = async () => {
    const newStatus = marketOpen ? "CLOSED" : "OPEN";
    try {
      const response = await updateMarketStatus(newStatus);
      if (response && response.EC === 0) {
        setMarketOpen(newStatus === "OPEN");
        toast.info(t("admin.market.toastMarketStatusChanged", { status: newStatus }));
      } else {
        toast.error(response.EM || (lang === "vi" ? "Lỗi cập nhật trạng thái" : "Error updating status"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("admin.market.toastConnError"));
    }
  };

  const handleToggleSymbol = async (code, currentStatus) => {
    const newStatus = currentStatus === "Active" ? false : true;
    try {
      const response = await updateStockStatus({
        symbol: code,
        is_active: newStatus
      });

      if (response && response.EC === 0) {
        setSymbols(symbols.map(s => 
          s.code === code ? { ...s, status: newStatus ? "Active" : "Halted" } : s
        ));
        toast.success(t("admin.market.toastStockStatusChanged", { symbol: code, status: newStatus ? "ACTIVE" : "HALTED" }));
      } else {
        toast.error(response.EM || (lang === "vi" ? "Lỗi cập nhật trạng thái" : "Error updating status"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("admin.market.toastConnError"));
    }
  };

  const filteredSymbols = symbols.filter(s => 
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-market-page">
      <div className="page-header">
        <div className="header-left">
          <h1>{t("admin.market.title")}</h1>
          <p>{t("admin.market.subtitle")}</p>
        </div>
        <div className="header-right">
          <button className="sync-btn" onClick={handleSync} disabled={syncing}>
            <i className={`fa-solid fa-cloud-arrow-down ${syncing ? 'fa-bounce' : ''}`}></i> 
            {syncing ? ` ${t("admin.market.btnSyncing")}` : ` ${t("admin.market.btnSync")}`}
          </button>
          <button className="refresh-btn" onClick={() => { setLoading(true); loadData(); }}>
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> {t("admin.market.btnRefresh")}
          </button>
        </div>
      </div>

      <div className="market-summary-grid">
        <div className="summary-card dashboard-section">
          <div className="card-top">
            <div className="status-info">
              <span className="label">{t("admin.market.globalStatus")}</span>
              <div className={`market-badge ${marketOpen ? "open" : "closed"}`}>
                <div className="dot"></div>
                <span>{marketOpen ? "OPEN" : "CLOSED"}</span>
              </div>
            </div>
          </div>
          <div className="card-bottom">
            <div className="control-info">
              <span className="title">{t("admin.market.masterControl")}</span>
              <span className="desc">{marketOpen ? t("admin.market.clickToHalt") : t("admin.market.clickToResume")}</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={marketOpen} onChange={handleToggleMarket} />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="summary-card dashboard-section">
          <div className="card-top">
            <div className="status-info">
              <span className="label">{t("admin.market.totalSymbols")}</span>
              <div className="big-number">
                {summary.total} <i className="fa-solid fa-arrow-trend-up trend-icon"></i>
              </div>
            </div>
          </div>
          <div className="card-bottom stats">
            <div className="stat-item">
              <span className="label">{t("admin.market.activeTrading")}</span>
              <span className="value active">{summary.active}</span>
            </div>
            <div className="stat-item">
              <span className="label">{t("admin.market.haltedSymbols")}</span>
              <span className="value halted">{summary.halted}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="market-tabs">
        {groups.map(g => (
          <button 
            key={g} 
            className={`tab-item ${activeGroup === g ? 'active' : ''}`}
            onClick={() => handleGroupChange(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="list-header">
        <div className="header-left">
          <h2>{t("admin.market.tabListedSymbols")}</h2>
          <p>{t("admin.market.showingSymbols", { filtered: filteredSymbols.length, total: symbols.length })}</p>
        </div>
        <div className="header-right">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder={t("admin.market.searchPlaceholder")} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container dashboard-section">
        {loading && symbols.length === 0 ? (
          <div className="table-loading">{t("admin.market.loading", { group: activeGroup })}</div>
        ) : (
          <table className="admin-table market-table">
            <thead>
              <tr>
                <th className="col-symbol">{t("admin.market.colSymbol")}</th>
                <th className="col-company">{t("admin.market.colCompany")}</th>
                <th className="col-price">{t("admin.market.colPrice")}</th>
                <th className="col-change">{t("admin.market.colChange")}</th>
                <th className="col-status">{t("admin.market.colStatus")}</th>
                <th className="col-time">{t("admin.market.colUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSymbols.map((s, index) => (
                <tr key={index} className={s.status === "Halted" ? "row-halted" : ""}>
                  <td className="col-symbol"><strong>{s.code}</strong></td>
                  <td className="col-company">{s.name}</td>
                  <td className="col-price">{s.price}</td>
                  <td className="col-change">
                    <span className={`change-badge ${s.isUp ? "up" : "down"}`}>
                      <i className={`fa-solid ${s.isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i> {s.change}
                    </span>
                  </td>
                  <td className="col-status">
                    <div className="status-control">
                      <label className="toggle-switch small">
                        <input 
                          type="checkbox" 
                          checked={s.status === "Active"} 
                          onChange={() => handleToggleSymbol(s.code, s.status)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className={`status-text ${s.status.toLowerCase()}`}>{s.status}</span>
                    </div>
                  </td>
                  <td className="col-time">
                    <i className="fa-regular fa-clock"></i> {s.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MarketData;
