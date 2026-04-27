import React from "react";
import "./IndexCard.scss";

const IndexCard = (props) => {
  if (!props.data) return null;

  const isUp = props.data.chartUp;
  const colorClass = isUp ? "color-up" : "color-down";
  const trendIcon = isUp ? "↗" : "↘";

  const formatPositive = (value) => {
    const strValue = String(value);
    if (isUp && !strValue.startsWith("+")) {
      return `+${strValue}`;
    }
    return strValue;
  };

  // Hàm format Khối lượng hiển thị cho đẹp (vd: 1,500,000)
  const formatVolume = (vol) => {
    if (!vol) return "0";
    return Number(vol).toLocaleString("vi-VN");
  };

  const displayChange = formatPositive(props.data.change);
  const displayChangePercent = formatPositive(props.data.changePercent);

  return (
    <div className="index-card">
      {/* CỘT 1: Thông tin giá */}
      <div className="index-card__info">
        <div className="index-name">
          {props.data.name}
          <span className={`trend ${colorClass}`}>{trendIcon}</span>
        </div>
        <div className={`index-value ${colorClass}`}>{props.data.value}</div>
        <div className={`index-change ${colorClass}`}>
          {displayChange} &nbsp;|&nbsp; {displayChangePercent}
        </div>

        {/* THỐNG KÊ MÃ TĂNG/GIẢM/TC (Phong cách chuyên nghiệp) */}
        <div className="index-stats">
          <span className="stats-item stats-up">
            <i className="fa-solid fa-arrow-up"></i>
            {props.data.advances || 0}
            <span className="stats-sub">({props.data.ceilings || 0})</span>
          </span>
          <span className="stats-item stats-ref">
            <span className="bar-ref"></span>
            {props.data.noChange || 0}
          </span>
          <span className="stats-item stats-down">
            <i className="fa-solid fa-arrow-down"></i>
            {props.data.declines || 0}
            <span className="stats-sub">({props.data.floors || 0})</span>
          </span>
        </div>
      </div>

      {/* CỘT 2: Nhóm Biểu đồ và Khối lượng */}
      <div className="index-card__right-col">
        {/* Biểu đồ Mini */}
        <div className="chart-wrapper">
          <svg
            width="100%"
            height="35"
            viewBox="0 0 100 35"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="grad-up" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00C805" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00C805" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="grad-down" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF3B30" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FF3B30" stopOpacity="0" />
              </linearGradient>
            </defs>

            {isUp ? (
              <>
                <polygon
                  points="0,35 0,10 25,12 50,5 75,15 100,2 100,35"
                  fill="url(#grad-up)"
                />
                <polyline
                  points="0,10 25,12 50,5 75,15 100,2"
                  fill="none"
                  stroke="#00C805"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : (
              <>
                <polygon
                  points="0,35 0,5 25,15 50,10 75,25 100,18 100,35"
                  fill="url(#grad-down)"
                />
                <polyline
                  points="0,5 25,15 50,10 75,25 100,18"
                  fill="none"
                  stroke="#FF3B30"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>
        </div>

        {/* Khối lượng hiển thị dưới chart */}
        <div className="volume-text">
          KL: {formatVolume(props.data.volume)} CP
        </div>
      </div>
    </div>
  );
};

export default IndexCard;
