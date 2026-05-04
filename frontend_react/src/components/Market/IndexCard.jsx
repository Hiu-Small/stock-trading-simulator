import React, { useState, useEffect } from "react";
import "./IndexCard.scss";
import "../../assets/styles/global.scss";
import IndexMiniChart from "./IndexMiniChart";
import { fetchIndexIntraday } from "../../services/marketApi";

const IndexCard = (props) => {
  const [intradayData, setIntradayData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadIntraday = async () => {
      const symbolName = props.data?.name;
      if (!symbolName) return;
      
      setLoading(true);
      try {
        console.log(`[IndexCard] Fetching intraday for ${symbolName}...`);
        const res = await fetchIndexIntraday(symbolName);
        console.log(`[IndexCard] Result for ${symbolName}:`, res);
        
        if (res && res.success && Array.isArray(res.data)) {
          setIntradayData(res.data);
        } else if (Array.isArray(res)) {
          // Trường hợp API trả về mảng trực tiếp
          setIntradayData(res);
        } else {
          console.warn(`[IndexCard] API returned unexpected format for ${symbolName}:`, res);
        }
      } catch (err) {
        console.error(`[IndexCard] Failed to load intraday for ${symbolName}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadIntraday();
    const interval = setInterval(loadIntraday, 60000);
    return () => clearInterval(interval);
  }, [props.data?.name]);

  if (!props.data) return null;

  const isUp = props.data.change > 0;
  const isDown = props.data.change < 0;
  const colorClass = isUp ? "price--up" : isDown ? "price--down" : "price--ref";

  const formatValue = (val) => {
    return Number(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatVolume = (vol) => {
    if (!vol) return "0";
    return Number(vol).toLocaleString("vi-VN");
  };

  return (
    <div className="index-card">
      {/* PHẦN 1: BIỂU ĐỒ (CHIẾM PHẦN LỚN) */}
      <div className="index-card__chart-section">
        <IndexMiniChart 
          data={intradayData} 
          refPrice={props.data.refPrice || props.data.value - props.data.change} 
        />
      </div>

      {/* PHẦN 2: THÔNG TIN CHI TIẾT (BOTTOM) */}
      <div className="index-card__details">
        {/* Hàng 1: Tên và Giá */}
        <div className="detail-row main-row">
          <div className={`index-symbol ${colorClass}`}>
            {props.data.name}
          </div>
          <div className={`index-price-info ${colorClass}`}>
            <span className="current-value">
              {isUp ? "↑" : isDown ? "↓" : ""} {formatValue(props.data.value)}
            </span>
            <span className="change-info">
              ({props.data.change > 0 ? "+" : ""}{props.data.change.toFixed(2)} {props.data.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Hàng 2: Thống kê và Khối lượng */}
        <div className="detail-row stats-row">
          <div className="stats-group">
            <span className="stats-item up">
              <i className="fa-solid fa-arrow-up"></i> {props.data.advances || 0} 
              <span className="sub color-ceiling"> ({props.data.ceilings || 0})</span>
            </span>
            <span className="stats-item ref">
              <span className="ref-dot"></span> {props.data.noChange || 0}
            </span>
            <span className="stats-item down">
              <i className="fa-solid fa-arrow-down"></i> {props.data.declines || 0}
              <span className="sub color-floor"> ({props.data.floors || 0})</span>
            </span>
          </div>
          <div className="vol-info">
           KL: {formatVolume(props.data.volume)} CP
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexCard;
