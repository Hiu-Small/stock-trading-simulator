import React, { useState } from "react";
import "./MarketDepthChart.scss";
import { useTranslation } from "../../../context/LanguageContext";

const MarketDepthChart = (props) => {
  // Trạng thái lưu trữ dữ liệu Tooltip
  const [tooltip, setTooltip] = useState(null);
  const { t, lang } = useTranslation();

  if (!props.data)
    return <div className="market-depth-container">{t("board.loading")}</div>;

  const formatPrice = (price) => {
    if (!price) return "";
    return (price / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Hàm format Khối lượng (vd: 403800 -> 403,800)
  const formatVolume = (vol) => {
    if (vol === undefined || vol === null || vol === 0) return "0";
    return Number(vol).toLocaleString("vi-VN");
  };

  const safeNumber = (val) => Number(val) || 0;

  // 1. TÍNH KHỐI LƯỢNG CỘNG DỒN (CUMULATIVE)
  const cumBid1 = safeNumber(props.data.bid1Vol);
  const cumBid2 = cumBid1 + safeNumber(props.data.bid2Vol);
  const cumBid3 = cumBid2 + safeNumber(props.data.bid3Vol);

  const cumAsk1 = safeNumber(props.data.ask1Vol);
  const cumAsk2 = cumAsk1 + safeNumber(props.data.ask2Vol);
  const cumAsk3 = cumAsk2 + safeNumber(props.data.ask3Vol);

  // 2. TÌM ĐỈNH VÀ LÀM TRÒN "TRẦN" BIỂU ĐỒ
  const actualMaxVolume = Math.max(cumBid3, cumAsk3);

  const getChartMax = (maxVal) => {
    if (maxVal === 0) return 100;
    const bufferedMax = maxVal * 1.15;
    const order = Math.floor(Math.log10(bufferedMax));
    const magnitude = Math.pow(10, order - 1);
    return Math.ceil(bufferedMax / magnitude) * magnitude;
  };

  const chartMax = getChartMax(actualMaxVolume);

  const calcHeight = (vol) => {
    if (chartMax === 0) return 0;
    return (vol / chartMax) * 100;
  };

  const yLabels = [
    chartMax,
    chartMax * 0.75,
    chartMax * 0.5,
    chartMax * 0.25,
    0,
  ];

  const formatYAxis = (num) => {
    if (num === 0) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(0) + "K";
    return num.toString();
  };

  // ==========================================
  // HÀM XỬ LÝ SỰ KIỆN CHUỘT (TOOLTIP)
  // ==========================================
  const handleMouseMove = (e, type, price, vol) => {
    setTooltip({
      type: type,
      price: formatPrice(price),
      vol: formatVolume(vol),
      x: e.clientX, // Lấy toạ độ X của chuột trên màn hình
      y: e.clientY, // Lấy toạ độ Y của chuột trên màn hình
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null); // Giấu tooltip đi khi đưa chuột ra ngoài
  };

  return (
    <div className="market-depth-container">
      <div className="section-title">{t("trading.depthChart.title")}</div>

      <div className="depth-chart-area">
        <div className="y-axis">
          {yLabels.map((val, idx) => (
            <span key={idx}>{formatYAxis(val)}-</span>
          ))}
        </div>

        <div className="chart-bars">
          {/* MUA */}
          <div className="bid-area">
            <div
              className="depth-step bid-step"
              style={{ height: `${calcHeight(cumBid3)}%`, width: "33%" }}
              onMouseMove={(e) =>
                handleMouseMove(e, t("trading.depthChart.bidSide"), props.data.bid3Price, cumBid3)
              }
              onMouseLeave={handleMouseLeave}
            ></div>
            <div
              className="depth-step bid-step"
              style={{ height: `${calcHeight(cumBid2)}%`, width: "33%" }}
              onMouseMove={(e) =>
                handleMouseMove(e, t("trading.depthChart.bidSide"), props.data.bid2Price, cumBid2)
              }
              onMouseLeave={handleMouseLeave}
            ></div>
            <div
              className="depth-step bid-step"
              style={{ height: `${calcHeight(cumBid1)}%`, width: "33%" }}
              onMouseMove={(e) =>
                handleMouseMove(e, t("trading.depthChart.bidSide"), props.data.bid1Price, cumBid1)
              }
              onMouseLeave={handleMouseLeave}
            ></div>
          </div>

          {/* BÁN */}
          <div className="ask-area">
            <div
              className="depth-step ask-step"
              style={{ height: `${calcHeight(cumAsk1)}%`, width: "33%" }}
              onMouseMove={(e) =>
                handleMouseMove(e, t("trading.depthChart.askSide"), props.data.ask1Price, cumAsk1)
              }
              onMouseLeave={handleMouseLeave}
            ></div>
            <div
              className="depth-step ask-step"
              style={{ height: `${calcHeight(cumAsk2)}%`, width: "33%" }}
              onMouseMove={(e) =>
                handleMouseMove(e, t("trading.depthChart.askSide"), props.data.ask2Price, cumAsk2)
              }
              onMouseLeave={handleMouseLeave}
            ></div>
            <div
              className="depth-step ask-step"
              style={{ height: `${calcHeight(cumAsk3)}%`, width: "33%" }}
              onMouseMove={(e) =>
                handleMouseMove(e, t("trading.depthChart.askSide"), props.data.ask3Price, cumAsk3)
              }
              onMouseLeave={handleMouseLeave}
            ></div>
          </div>
        </div>
      </div>

      <div className="x-axis">
        <span>{formatPrice(props.data.bid3Price)}</span>
        <span>{formatPrice(props.data.bid2Price)}</span>
        <span>{formatPrice(props.data.bid1Price)}</span>
        <span>{formatPrice(props.data.ask1Price)}</span>
        <span>{formatPrice(props.data.ask2Price)}</span>
        <span>{formatPrice(props.data.ask3Price)}</span>
      </div>

      {/* COMPONENT HIỂN THỊ TOOLTIP (CHỈ RENDER KHI CÓ DỮ LIỆU TOOLTIP) */}
      {tooltip && (
        <div
          className="depth-tooltip"
          style={{ left: tooltip.x + 15, top: tooltip.y - 70 }}
        >
          <div className="tooltip-title">{tooltip.type}</div>
          <div className="tooltip-row">
            {t("trading.depthChart.price")} <span className="tooltip-val">{tooltip.price}</span>
          </div>
          <div className="tooltip-row">
            {t("trading.depthChart.cumulativeVol")} <span className="tooltip-val">{tooltip.vol}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketDepthChart;
