import React, { useState, useEffect } from "react";
import "./TradeMonitoring.scss";
import { fetchAllOrders, forceCancelOrder, forceMatchOrder } from "../../../services/adminService";
import { toast } from "react-toastify";

const TradeMonitoring = () => {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                   today.getDate().toString().padStart(2, '0');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [lastUpdate, setLastUpdate] = useState("--:--:--");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const fetchOrdersData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetchAllOrders(startDate, endDate);
      if (res && res.EC === 0) {
        setOrders(res.DT || []);
        
        const now = new Date();
        setLastUpdate(
          now.getHours().toString().padStart(2, '0') + ":" + 
          now.getMinutes().toString().padStart(2, '0') + ":" + 
          now.getSeconds().toString().padStart(2, '0')
        );
      } else {
        toast.error(res?.EM || "Không thể tải danh sách lệnh");
      }
    } catch (err) {
      console.error("Error fetching system orders:", err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();

    // Tự động cập nhật mỗi 5 giây
    const interval = setInterval(() => {
      fetchOrdersData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const handleForceCancel = async (orderId) => {
    if (window.confirm(`Bạn có chắc muốn hủy cưỡng bức lệnh #${orderId} không?`)) {
      try {
        const res = await forceCancelOrder(orderId);
        if (res && res.EC === 0) {
          toast.success(res.EM || "Đã hủy lệnh thành công!");
          fetchOrdersData(true);
        } else {
          toast.error(res?.EM || "Không thể hủy lệnh");
        }
      } catch (err) {
        toast.error("Lỗi khi kết nối hệ thống");
      }
    }
  };

  const handleForceMatch = async (orderId) => {
    if (window.confirm(`Bạn có chắc muốn khớp cưỡng bức lệnh #${orderId} không?`)) {
      try {
        const res = await forceMatchOrder(orderId);
        if (res && res.EC === 0) {
          toast.success(res.EM || "Đã khớp lệnh thành công!");
          fetchOrdersData(true);
        } else {
          toast.error(res?.EM || "Không thể khớp lệnh");
        }
      } catch (err) {
        toast.error("Lỗi khi kết nối hệ thống");
      }
    }
  };

  // Helper formats
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  };

  const formatPrice = (p) => {
    const num = Number(p);
    if (num >= 1000) {
      return (num / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('vi-VN');
  };

  const mapStatus = (dbStatus) => {
    switch (dbStatus) {
      case "PENDING":
        return "Pending";
      case "PARTIAL_MATCHED":
        return "Pending";
      case "MATCHED":
        return "Matched";
      case "CANCELLED":
        return "Canceled";
      case "FAILED_STUCK":
        return "Stuck";
      default:
        return dbStatus || "Pending";
    }
  };

  const mappedOrders = orders.map(o => ({
    id: o.id,
    timestamp: formatDate(o.createdAt),
    userId: o.user?.account_number || o.user_id,
    symbol: o.symbol,
    side: o.side,
    type: o.order_type || "LO",
    volume: Number(o.quantity).toLocaleString('vi-VN'),
    price: formatPrice(o.price),
    status: mapStatus(o.status),
    rawStatus: o.status
  }));

  const getStatusCount = (status) => {
    if (status === "All") return mappedOrders.length;
    if (status === "Failed/Stuck") return mappedOrders.filter(o => o.status === "Stuck" || o.status === "Failed").length;
    return mappedOrders.filter(o => o.status === status).length;
  };

  const filteredOrders = mappedOrders.filter(o => {
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

  const isFiltered = startDate !== todayStr || endDate !== todayStr;

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

      <div className="ob-filters">
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

        <div className="date-filters">
          <div className="date-input-group">
            <span>Từ:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <span className="date-sep">|</span>
          <div className="date-input-group">
            <span>Đến:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          {isFiltered && (
            <button 
              className="btn-clear-date" 
              onClick={() => { 
                setStartDate(todayStr); 
                setEndDate(todayStr); 
              }}
              title="Đặt lại về hôm nay"
            >
              <i className="fa-solid fa-xmark"></i> Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="table-container dashboard-section">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "10px" }}></i>
            Đang tải dữ liệu lệnh...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: "24px", display: "block", marginBottom: "10px" }}></i>
            Không tìm thấy lệnh nào phù hợp
          </div>
        ) : (
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
                          <button 
                            className="btn-action cancel" 
                            title="Force Cancel"
                            onClick={() => handleForceCancel(order.id)}
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                          <button 
                            className="btn-action match" 
                            title="Force Match"
                            onClick={() => handleForceMatch(order.id)}
                          >
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
        )}
      </div>

      <div className="trades-summary-grid">
        <div className="summary-card">
          <span className="label">Total Orders</span>
          <span className="value">{mappedOrders.length}</span>
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
