import React, { useState, useEffect } from "react";
import "./MarketData.scss";
import { fetchMarketData, updateStockStatus, syncStocks, fetchMarketStatus, updateMarketStatus } from "../../../services/adminService";
import { toast } from "react-toastify";

const MarketData = () => {
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
        toast.success(response.EM);
        loadData();
      } else {
        toast.error(response.EM || "Lỗi đồng bộ");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server");
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
        toast.error(response.EM || "Lỗi tải dữ liệu thị trường");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server");
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
        toast.info(`Trạng thái thị trường đã chuyển sang: ${newStatus}`);
      } else {
        toast.error(response.EM || "Lỗi cập nhật trạng thái");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server");
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
        toast.success(`Mã ${code} đã chuyển sang: ${newStatus ? "ACTIVE" : "HALTED"}`);
      } else {
        toast.error(response.EM || "Lỗi cập nhật trạng thái");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server");
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
          <h1>Market Data & Symbols</h1>
          <p>Monitor and control market status and symbol trading</p>
        </div>
        <div className="header-right">
          <button className="sync-btn" onClick={handleSync} disabled={syncing}>
            <i className={`fa-solid fa-cloud-arrow-down ${syncing ? 'fa-bounce' : ''}`}></i> 
            {syncing ? ' Đang đồng bộ...' : ' Đồng bộ Database'}
          </button>
          <button className="refresh-btn" onClick={() => { setLoading(true); loadData(); }}>
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> Làm mới
          </button>
        </div>
      </div>

      <div className="market-summary-grid">
        <div className="summary-card dashboard-section">
          <div className="card-top">
            <div className="status-info">
              <span className="label">Global Market Status</span>
              <div className={`market-badge ${marketOpen ? "open" : "closed"}`}>
                <div className="dot"></div>
                <span>{marketOpen ? "OPEN" : "CLOSED"}</span>
              </div>
            </div>
          </div>
          <div className="card-bottom">
            <div className="control-info">
              <span className="title">Master Trading Control</span>
              <span className="desc">{marketOpen ? "Click to halt entire market" : "Click to resume trading"}</span>
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
              <span className="label">Total Listed Symbols</span>
              <div className="big-number">
                {summary.total} <i className="fa-solid fa-arrow-trend-up trend-icon"></i>
              </div>
            </div>
          </div>
          <div className="card-bottom stats">
            <div className="stat-item">
              <span className="label">Active Trading</span>
              <span className="value active">{summary.active}</span>
            </div>
            <div className="stat-item">
              <span className="label">Halted</span>
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
          <h2>Listed Symbols</h2>
          <p>Showing <span>{filteredSymbols.length} of {symbols.length}</span> symbols</p>
        </div>
        <div className="header-right">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder="Search by symbol or company name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container dashboard-section">
        {loading && symbols.length === 0 ? (
          <div className="table-loading">Đang tải dữ liệu {activeGroup}...</div>
        ) : (
          <table className="admin-table market-table">
            <thead>
              <tr>
                <th className="col-symbol">SYMBOL</th>
                <th className="col-company">COMPANY NAME</th>
                <th className="col-price">CURRENT PRICE</th>
                <th className="col-change">DAILY CHANGE</th>
                <th className="col-status">TRADING STATUS</th>
                <th className="col-time">LAST UPDATED</th>
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
