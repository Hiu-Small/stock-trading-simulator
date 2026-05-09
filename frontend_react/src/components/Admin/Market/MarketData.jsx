import React, { useState } from "react";
import "./MarketData.scss";

const initialSymbols = [
  { code: "VN30", name: "VN30 Index Fund", price: "1,245.50", change: "+1.25%", status: "Active", time: "14:30:00" },
  { code: "VNM", name: "Vietnam Dairy Products JSC", price: "85.50", change: "+2.10%", status: "Active", time: "14:29:58" },
  { code: "VCB", name: "Joint Stock Commercial Bank for Foreign Trade of Vietnam", price: "92.30", change: "-0.85%", status: "Active", time: "14:29:55" },
  { code: "HPG", name: "Hoa Phat Group JSC", price: "28.75", change: "+3.45%", status: "Active", time: "14:29:52" },
  { code: "VHM", name: "Vinhomes JSC", price: "65.20", change: "-1.20%", status: "Halted", time: "14:20:15" },
  { code: "VIC", name: "Vingroup JSC", price: "48.90", change: "+0.50%", status: "Active", time: "14:29:50" },
  { code: "MSN", name: "Masan Group Corporation", price: "72.40", change: "+1.80%", status: "Active", time: "14:29:48" },
  { code: "GAS", name: "PetroVietnam Gas JSC", price: "98.50", change: "-0.30%", status: "Active", time: "14:29:45" },
  { code: "BID", name: "Joint Stock Commercial Bank for Investment and Development of Vietnam", price: "42.30", change: "+0.95%", status: "Active", time: "14:29:42" },
  { code: "CTG", name: "Vietnam Joint Stock Commercial Bank for Industry and Trade", price: "35.80", change: "-0.65%", status: "Active", time: "14:29:40" },
  { code: "VRE", name: "Vincom Retail JSC", price: "28.40", change: "+2.30%", status: "Active", time: "14:29:38" },
  { code: "SSI", name: "Saigon Securities Inc.", price: "45.60", change: "+1.15%", status: "Active", time: "14:29:35" },
];

const MarketData = () => {
  const [symbols, setSymbols] = useState(initialSymbols);
  const [marketOpen, setMarketOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const handleToggleMarket = () => {
    const newStatus = !marketOpen;
    setMarketOpen(newStatus);
    setSymbols(symbols.map(s => ({ ...s, status: newStatus ? "Active" : "Halted" })));
  };

  const handleToggleSymbol = (code) => {
    setSymbols(symbols.map(s => 
      s.code === code ? { ...s, status: s.status === "Active" ? "Halted" : "Active" } : s
    ));
  };

  const filteredSymbols = symbols.filter(s => 
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = symbols.filter(s => s.status === "Active").length;

  return (
    <div className="admin-market-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Market Data & Symbols</h1>
          <p>Monitor and control market status and symbol trading</p>
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
            {!marketOpen && <i className="fa-solid fa-triangle-exclamation warning-icon"></i>}
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
                {symbols.length} <i className="fa-solid fa-arrow-trend-up trend-icon"></i>
              </div>
            </div>
          </div>
          <div className="card-bottom stats">
            <div className="stat-item">
              <span className="label">Active Trading</span>
              <span className="value active">{activeCount}</span>
            </div>
            <div className="stat-item">
              <span className="label">Halted</span>
              <span className="value halted">{symbols.length - activeCount}</span>
            </div>
          </div>
        </div>
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
                <td className="col-symbol">{s.code}</td>
                <td className="col-company">{s.name}</td>
                <td className="col-price">{s.price}</td>
                <td className="col-change">
                  <span className={`change-badge ${s.change.startsWith("+") ? "up" : "down"}`}>
                    <i className={`fa-solid fa-chart-line`}></i> {s.change}
                  </span>
                </td>
                <td className="col-status">
                  <div className="status-control">
                    <label className="toggle-switch small">
                      <input 
                        type="checkbox" 
                        checked={s.status === "Active"} 
                        onChange={() => handleToggleSymbol(s.code)}
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
      </div>
    </div>
  );
};

export default MarketData;
