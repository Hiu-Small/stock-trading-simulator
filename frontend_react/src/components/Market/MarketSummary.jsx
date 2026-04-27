import React, { useState, useEffect, useCallback } from "react";
import "./MarketSummary.scss";
import IndexCard from "./IndexCard";
import { fetchAllIndices } from "../../services/marketApi";

/**
 * MarketSummary - Thanh chỉ số thị trường trên cùng
 * Tự động refresh mỗi 30 giây khi thị trường mở cửa
 */
import { checkIsMarketOpen } from "../../utils/marketUtils";

/**
 * MarketSummary - Thanh chỉ số thị trường trên cùng
 * Tự động refresh mỗi 30 giây khi thị trường mở cửa
 */
const MarketSummary = (props) => {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketOpenStatus, setMarketOpenStatus] = useState(checkIsMarketOpen());

  // Bảng ánh xạ ID của chỉ số sang tên Nhóm trong StockTable
  const indexToGroupMap = {
    vnindex: "HOSE",
    vn30: "VN30",
    hnxindex: "HNX",
    upindex: "UPCOM",
  };

  // ... (giữ nguyên logic fetch và thời gian)

  // Lấy thời gian hiện tại VN (UTC+7) cho đồng hồ
  const getVNTime = () => {
    return new Date().toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const [vnTime, setVNTime] = useState(getVNTime());

  // Fetch dữ liệu từ backend
  const loadIndices = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchAllIndices();
      if (result && result.success) {
        setIndices(result.data || []);
        // Tự xác định trạng thái thị trường
        setMarketOpenStatus(checkIsMarketOpen());
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError("Không thể tải dữ liệu thị trường");
      console.error("[MarketSummary]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Khởi động: load lần đầu
  useEffect(() => {
    loadIndices();
  }, [loadIndices]);

  // Đồng hồ VN cập nhật mỗi giây
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setVNTime(getVNTime());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Auto-refresh mỗi 30 giây CHỈ trong giờ giao dịch
  useEffect(() => {
    let refreshTimer;
    
    if (marketOpenStatus) {
      refreshTimer = setInterval(() => {
        loadIndices();
      }, 30000); // 30 giây
    }

    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [loadIndices, marketOpenStatus]);

  // Xác định phiên giao dịch (Đã cập nhật giờ nghỉ trưa)
  const getSessionBadge = () => {
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    );
    const hour = now.getHours();
    const minute = now.getMinutes();
    const total = hour * 60 + minute;
    const day = now.getDay();

    if (day === 0 || day === 6) return { label: "CLOSED", type: "closed" };
    
    if (total < 540) return { label: "PRE", type: "pre" };
    if (total < 545) return { label: "ATO", type: "ato" };
    if (total < 690) return { label: "OPEN", type: "open" }; // Sáng đến 11:30
    if (total < 780) return { label: "BREAK", type: "closed" }; // Nghỉ trưa 11:30 - 13:00
    if (total < 885) return { label: "OPEN", type: "open" }; // Chiều đến 14:45
    if (total < 900) return { label: "ATC", type: "atc" }; // ATC 14:45 - 15:00
    return { label: "CLOSED", type: "closed" };
  };

  const session = getSessionBadge();

  return (
    <div className="market-summary">
      {/* Dải các thẻ chỉ số thị trường */}
      <div className="market-summary-indices">
        {loading && indices.length === 0
          ? // Skeleton loading
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="index-card index-card--loading">
                <div className="skeleton skeleton--name" />
                <div className="skeleton skeleton--value" />
                <div className="skeleton skeleton--change" />
              </div>
            ))
          : indices.map((item) => {
              // Lấy thống kê từ bảng điện nếu có
              const groupName = indexToGroupMap[item.id];
              const tableStats = props.marketStatsMap ? props.marketStatsMap[groupName] : null;
              
              // Nếu có stats từ bảng điện, ghi đè lên dữ liệu từ API Index
              const displayData = tableStats ? {
                ...item,
                advances: tableStats.increase,
                declines: tableStats.decrease,
                noChange: tableStats.ref,
                ceilings: tableStats.ceiling,
                floors: tableStats.floor
              } : item;

              return <IndexCard key={item.id} data={displayData} />;
            })}
      </div>

      {/* Đồng hồ VN và phiên giao dịch */}
      <div className="market-summary-time">
        <div className="vn-time-label">VN TIME</div>
        <div className="vn-time-value">{vnTime}</div>
        <div className={`session-badge session-badge--${session.type}`}>
          {session.label}
        </div>
        {lastUpdated && (
          <div className="last-updated">
            Cập nhật: {lastUpdated.toLocaleTimeString("vi-VN")}
          </div>
        )}
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div className="market-error">
          ⚠ {error}
          <button onClick={loadIndices} className="retry-btn">
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
};

export default MarketSummary;
