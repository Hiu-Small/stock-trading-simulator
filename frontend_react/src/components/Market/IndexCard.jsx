import React from "react";
import "./IndexCard.scss";
import "../../assets/styles/global.scss";

const IndexCard = (props) => {
  if (!props.data) return null;

  // Kiểm tra xem có phải trước phiên (trước 9h sáng) không
  const checkPreMarket = () => {
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    );
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    //const totalMinutes = 0; //test
    return totalMinutes < 540; // 540 = 9h * 60
  };

  const isPreMarket = checkPreMarket();

  // Logic màu sắc và icon
  let isUp = props.data.chartUp && !isPreMarket;
  let isDown = !props.data.chartUp && !isPreMarket && props.data.change !== 0;
  let isRef = isPreMarket || props.data.change === 0;

  const colorClass = isUp ? "price--up" : isDown ? "price--down" : "price--ref";
  const trendIcon = isPreMarket ? "—" : isUp ? "↗" : isDown ? "↘" : "—";

  const formatPositive = (value) => {
    if (value === undefined || value === null || isPreMarket) return "0.00";
    const strValue = Number(value).toFixed(2);
    if (isUp && !strValue.startsWith("+")) {
      return `+${strValue}`;
    }
    return strValue;
  };

  // Hàm format Khối lượng hiển thị cho đẹp (vd: 1,500,000)
  const formatVolume = (vol) => {
    if (!vol || isPreMarket) return "0";
    return Number(vol).toLocaleString("vi-VN");
  };

  const displayChange = formatPositive(props.data.change);
  const displayChangePercent = formatPositive(props.data.changePercent);

  const formatValue = (value) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="index-card">
      {/* CỘT 1: Thông tin giá */}
      <div className="index-card__info">
        <div className="index-name">
          {props.data.name}
          <span className={`trend ${colorClass}`}>{trendIcon}</span>
        </div>
        <div className={`index-value ${colorClass}`}>
          {formatValue(props.data.value)}
        </div>
        <div className={`index-change ${colorClass}`}>
          {displayChange} &nbsp;|&nbsp; {displayChangePercent}%
        </div>

        {/* THỐNG KÊ MÃ TĂNG/GIẢM/TC (Phong cách chuyên nghiệp) */}
        <div className="index-stats">
          <span className="stats-item stats-up">
            <i className="fa-solid fa-arrow-up"></i>
            {isPreMarket ? 0 : props.data.advances || 0}
            <span className="stats-sub">
              ({isPreMarket ? 0 : props.data.ceilings || 0})
            </span>
          </span>
          <span className="stats-item stats-ref">
            <span className="bar-ref"></span>
            {isPreMarket ? 0 : props.data.noChange || 0}
          </span>
          <span className="stats-item stats-down">
            <i className="fa-solid fa-arrow-down"></i>
            {isPreMarket ? 0 : props.data.declines || 0}
            <span className="stats-sub">
              ({isPreMarket ? 0 : props.data.floors || 0})
            </span>
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
              <linearGradient id="grad-ref" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFD300" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#FFD300" stopOpacity="0" />
              </linearGradient>
            </defs>

            {isPreMarket ? (
              <>
                <line
                  x1="0"
                  y1="17"
                  x2="100"
                  y2="17"
                  stroke="#FFD300"
                  strokeWidth="2"
                />
                <rect
                  x="0"
                  y="17"
                  width="100"
                  height="18"
                  fill="url(#grad-ref)"
                />
              </>
            ) : isUp ? (
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
