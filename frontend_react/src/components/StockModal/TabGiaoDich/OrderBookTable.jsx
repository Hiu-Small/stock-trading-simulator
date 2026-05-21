import React from "react";
import "./OrderBookTable.scss";
import { useTranslation } from "../../../context/LanguageContext";

const OrderBookTable = (props) => {
  const { t, lang } = useTranslation();
  if (!props.data) return <div className="order-book-container">{t("board.loading")}</div>;

  const getPriceColor = (price) => {
    if (!price || !props.data.refPrice) return "price--ref"; // Vàng
    if (price >= props.data.ceiling) return "price--ceiling"; // Tím (Cao nhất)
    if (price <= props.data.floor) return "price--floor"; // Xanh lơ (Thấp nhất)
    if (price > props.data.refPrice) return "price--up"; // Xanh lá
    if (price < props.data.refPrice) return "price--down"; // Đỏ
    return "price--ref"; // Vàng
  };

  const formatPrice = (p) => p ? (p / 1000).toFixed(2) : "";
  const formatVol = (vol) => {
    if (vol === undefined || vol === null || vol === 0) return "";
    return Number(vol).toLocaleString("vi-VN");
  };

  // ==========================================
  // 1. TÍNH TỔNG DƯ MUA VÀ DƯ BÁN
  // ==========================================
  // Hàm an toàn: Ép kiểu về số, nếu rỗng/undefined thì mặc định là 0
  const safeNumber = (val) => Number(val) || 0; 
  
  const totalBidVol = 
    safeNumber(props.data.bid1Vol) + 
    safeNumber(props.data.bid2Vol) + 
    safeNumber(props.data.bid3Vol);

  const totalAskVol = 
    safeNumber(props.data.ask1Vol) + 
    safeNumber(props.data.ask2Vol) + 
    safeNumber(props.data.ask3Vol);

  // ==========================================
  // 2. TÍNH PHẦN TRĂM ĐỂ VẼ THANH DEPTH-BAR
  // ==========================================
  const totalVolSum = totalBidVol + totalAskVol;
  // Nếu chưa có giao dịch (tổng = 0) thì chia đôi 50-50, ngược lại tính theo %
  const bidPercent = totalVolSum > 0 ? (totalBidVol / totalVolSum) * 100 : 50;
  const askPercent = totalVolSum > 0 ? (totalAskVol / totalVolSum) * 100 : 50;

  return (
    <div className="order-book-container">
      <div className="section-title">{t("trading.orderBookTable.title")}</div>
      
      <div className="order-book-grid">
        <div className="grid-header">
          <div className="col-vol text-left">{t("trading.orderBookTable.vol")}</div>
          <div className="col-price text-right">{t("trading.orderBookTable.bid")}</div>
          <div className="col-price text-left spacer-left">{t("trading.orderBookTable.ask")}</div>
          <div className="col-vol text-right">{t("trading.orderBookTable.vol")}</div>
        </div>

        {/* Hiển thị 3 mức giá tốt nhất: Mua 1-2-3 và Bán 1-2-3 */}
        {[1, 2, 3].map(i => (
          <div className="grid-row" key={i}>
            <div className="col-vol text-left">{formatVol(props.data[`bid${i}Vol`])}</div>
            <div className={`col-price text-right ${getPriceColor(props.data[`bid${i}Price`])}`}>
              {formatPrice(props.data[`bid${i}Price`])}
            </div>
            <div className={`col-price text-left spacer-left ${getPriceColor(props.data[`ask${i}Price`])}`}>
              {formatPrice(props.data[`ask${i}Price`])}
            </div>
            <div className="col-vol text-right">{formatVol(props.data[`ask${i}Vol`])}</div>
          </div>
        ))}
      </div>

      <div className="depth-bar">
        {/* THANH TỶ LỆ DYNAMIC TỰ ĐỘNG CHẠY THEO % */}
        <div className="bar-bid" style={{ width: `${bidPercent}%` }}></div>
        <div className="bar-ask" style={{ width: `${askPercent}%` }}></div>
      </div>

      <div className="depth-summary">
        {/* IN RA TỔNG KHỐI LƯỢNG ĐÃ ĐƯỢC FORMAT */}
        <div>{t("trading.orderBookTable.bidVol")} <span className="value">{formatVol(totalBidVol) || "0"}</span></div>
        <div>{t("trading.orderBookTable.askVol")} <span className="value">{formatVol(totalAskVol) || "0"}</span></div>
      </div>
    </div>
  );
};

export default OrderBookTable;
