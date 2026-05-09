import React, { useState, useEffect } from "react";
import "./TradeMonitoring.scss";

const mockOrders = [
  { id: "458219", timestamp: "14:23:45.123", userId: "10241", symbol: "VNM", side: "BUY", type: "LO", volume: "1.000", price: "85.50", status: "Stuck" },
  { id: "458218", timestamp: "14:23:42.891", userId: "10244", symbol: "VCB", side: "SELL", type: "ATC", volume: "500", price: "92.30", status: "Matched" },
  { id: "458217", timestamp: "14:23:38.456", userId: "10246", symbol: "HPG", side: "BUY", type: "LO", volume: "2.000", price: "28.75", status: "Pending" },
  { id: "458216", timestamp: "14:23:35.789", userId: "10242", symbol: "VHM", side: "BUY", type: "LO", volume: "800", price: "65.20", status: "Matched" },
  { id: "458215", timestamp: "14:23:28.234", userId: "10248", symbol: "VIC", side: "SELL", type: "ATO", volume: "300", price: "48.90", status: "Failed" },
  { id: "458214", timestamp: "14:23:24.567", userId: "10241", symbol: "MSN", side: "BUY", type: "LO", volume: "1.500", price: "72.40", status: "Matched" },
  { id: "458213", timestamp: "14:23:19.890", userId: "10245", symbol: "VNM", side: "SELL", type: "LO", volume: "600", price: "85.60", status: "Canceled" },
  { id: "458212", timestamp: "14:23:15.123", userId: "10247", symbol: "VCB", side: "BUY", type: "ATC", volume: "400", price: "92.25", status: "Pending" },
  { id: "458211", timestamp: "14:23:12.456", userId: "10243", symbol: "GAS", side: "SELL", type: "LO", volume: "700", price: "98.50", status: "Stuck" },
  { id: "458210", timestamp: "14:23:08.789", userId: "10246", symbol: "BID", side: "BUY", type: "LO", volume: "1.200", price: "42.30", status: "Matched" },
  { id: "458209", timestamp: "14:23:05.234", userId: "10242", symbol: "CTG", side: "SELL", type: "ATC", volume: "900", price: "35.80", status: "Pending" },
  { id: "458208", timestamp: "14:23:01.567", userId: "10244", symbol: "VRE", side: "BUY", type: "LO", volume: "2.500", price: "28.40", status: "Matched" },
];

const TradeMonitoring = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [lastUpdate, setLastUpdate] = useState("17:15:08");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      setTimeout(() => {
        const now = new Date();
        setLastUpdate(now.getHours().toString().padStart(2, '0') + ":" + 
                      now.getMinutes().toString().padStart(2, '0') + ":" + 
                      now.getSeconds().toString().padStart(2, '0'));
        setIsRefreshing(false);
      }, 800);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusCount = (status) => {
    if (status === "All") return mockOrders.length;
    if (status === "Failed/Stuck") return mockOrders.filter(o => o.status === "Stuck" || o.status === "Failed").length;
    return mockOrders.filter(o => o.status === status).length;
  };

  const filteredOrders = mockOrders.filter(o => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Failed/Stuck") return o.status === "Stuck" || o.status === "Failed";
    return o.status === activeFilter;
  });

  const tabs = [
    { label: "All", key: "All" },
    { label: "Pending", key: "Pending" },
    { label: "Matched", key: "Matched" },
    { label: "Canceled", key: "Canceled" },
    { label: "Failed/Stuck", key: "Failed/Stuck" },
  ];

  return (
    <div className="admin-trades-page">
      <div className="page-header">
        <div className="header-top">
          <h1>Live Order Book</h1>
          <div className="live-badge">
            <div className="pulse-dot"></div>
            <span>Live</span>
          </div>
        </div>
        <div className="refresh-info">
          <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? "spinning" : ""}`}></i>
          <span>Auto-refresh • Last update: {lastUpdate}</span>
        </div>
      </div>

      <div className="filter-tabs">
        {tabs.map(tab => {
          let tabClass = "tab-item";
          if (activeFilter === tab.key) {
            tabClass += " active";
            if (tab.key === "Failed/Stuck") tabClass += " danger";
          }
          
          return (
            <button 
              key={tab.key}
              className={tabClass}
              onClick={() => setActiveFilter(tab.key)}
            >
              <span className="label">{tab.label}</span>
              <span className="count">{getStatusCount(tab.key)}</span>
            </button>
          );
        })}
      </div>

      <div className="table-container dashboard-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>TIMESTAMP</th>
              <th>USER ID</th>
              <th>SYMBOL</th>
              <th>SIDE</th>
              <th>TYPE</th>
              <th>VOLUME</th>
              <th>PRICE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, index) => {
              const isProblematic = order.status === "Stuck" || order.status === "Failed";
              return (
                <tr key={index} className={isProblematic ? "row-problematic" : ""}>
                  <td className="col-id">{order.id}</td>
                  <td className="col-time">{order.timestamp}</td>
                  <td className="col-user">#{order.userId}</td>
                  <td className="col-symbol"><strong>{order.symbol}</strong></td>
                  <td>
                    <span className={`side-badge ${order.side.toLowerCase()}`}>{order.side}</span>
                  </td>
                  <td className="col-type">{order.type}</td>
                  <td className="col-vol">{order.volume}</td>
                  <td className="col-price">{order.price}</td>
                  <td>
                    <span className={`status-badge ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="col-actions">
                    {isProblematic ? (
                      <div className="action-btns">
                        <button className="btn-action cancel" title="Force Cancel">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                        <button className="btn-action match" title="Force Match">
                          <i className="fa-solid fa-check"></i>
                        </button>
                      </div>
                    ) : (
                      <span className="no-action">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="trades-summary-grid">
        <div className="summary-card">
          <span className="label">Total Orders</span>
          <span className="value">{mockOrders.length}</span>
        </div>
        <div className="summary-card">
          <span className="label">Matched</span>
          <span className="value matched">{getStatusCount("Matched")}</span>
        </div>
        <div className="summary-card">
          <span className="label">Pending</span>
          <span className="value pending">{getStatusCount("Pending")}</span>
        </div>
        <div className="summary-card">
          <span className="label">Failed/Stuck</span>
          <span className="value failed">{getStatusCount("Failed/Stuck")}</span>
        </div>
      </div>
    </div>
  );
};

export default TradeMonitoring;
