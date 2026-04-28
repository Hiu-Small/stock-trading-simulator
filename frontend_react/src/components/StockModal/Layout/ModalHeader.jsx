import React from "react";
import "./ModalHeader.scss";
import "../../../assets/styles/global.scss";

const ModalHeader = (props) => {
  if (!props.data)
    return <div className="modal-header">Đang tải dữ liệu...</div>;

  // Tính toán các giá trị hiển thị
  const matchPrice = props.data.matchPrice || 0;
  const refPrice = props.data.refPrice || 0;
  const change =
    props.data.matchChange !== undefined
      ? props.data.matchChange
      : matchPrice - refPrice;
  const changePercent =
    props.data.matchChangePercent !== undefined
      ? props.data.matchChangePercent
      : refPrice
        ? (change / refPrice) * 100
        : 0;

  const isDown = change < 0;
  const isUp = change > 0;

  const formatPrice = (p) => (p / 1000).toFixed(2);
  const formatVol = (v) => (v ? v.toLocaleString("vi-VN") : "0");

  // Hàm lấy class màu sắc dựa trên giá
  const getPriceClass = (price) => {
    if (!price || !props.data.refPrice) return "price--ref";
    if (price >= props.data.ceiling) return "price--ceiling";
    if (price <= props.data.floor) return "price--floor";
    if (price > props.data.refPrice) return "price--up";
    if (price < props.data.refPrice) return "price--down";
    return "price--ref";
  };

  const avgPrice = (props.data.high + props.data.low) / 2;

  return (
    <div className="modal-header">
      <div className="header-top">
        <div className="stock-title">
          <div className="search-icon">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <h1 className="symbol">{props.symbol}</h1>
          <span className="exchange">({props.data.exchange})</span>
          <span className="company-name">{props.data.companyName}</span>
        </div>
        <div className="header-actions">
          <button className="btn-analysis">Phân tích cơ bản</button>
          <button className="btn-order">Đặt lệnh</button>
          <button className="btn-close" onClick={props.onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div className="header-info">
        <div className="price-section">
          <div
            className={`current-price ${getPriceClass(props.data.matchPrice)}`}
          >
            {formatPrice(matchPrice)}
          </div>
          <div
            className={`price-change ${getPriceClass(props.data.matchPrice)}`}
          >
            <div>
              {change > 0 ? "+" : ""}
              {formatPrice(change)}
            </div>
            <div>
              {changePercent > 0 ? "+" : ""}
              {changePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-row">
            <span className="label">CAO/THẤP:</span>
            <span className="value">
              <span className={getPriceClass(props.data.high)}>
                {formatPrice(props.data.high || 0)}
              </span>{" "}
              /{" "}
              <span className={getPriceClass(props.data.low)}>
                {formatPrice(props.data.low || 0)}
              </span>
            </span>
          </div>
          <div className="stat-row">
            <span className="label">MỞ CỬA/TRUNG BÌNH:</span>
            <span className="value">
              <span className={getPriceClass(props.data.openPrice)}>
                {formatPrice(props.data.openPrice)}
              </span>{" "}
              /{" "}
              <span className={getPriceClass(avgPrice)}>
                {formatPrice(avgPrice)}
              </span>
            </span>
          </div>
        </div>

        <div className="ref-section">
          <div className="ref-item">
            <span className="label">Trần</span>
            <span className="value color-ceiling">
              {formatPrice(props.data.ceiling || 0)}
            </span>
          </div>
          <div className="ref-item">
            <span className="label">Sàn</span>
            <span className="value color-floor">
              {formatPrice(props.data.floor || 0)}
            </span>
          </div>
          <div className="ref-item">
            <span className="label">Tham chiếu</span>
            <span className="value color-ref">{formatPrice(refPrice)}</span>
          </div>
          <div className="ref-item total-vol">
            <span className="label">TỔNG KL:</span>
            <span className="value">{formatVol(props.data.totalVolume)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalHeader;
