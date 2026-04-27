import React, { useState } from "react";
import "./StockRow.scss";

/**
 * StockRow - Một dòng cổ phiếu trong bảng giá
 */
const StockRow = (props) => {
  if (!props.stock) return null;

  const { stock } = props;

  // 1. TÍNH TOÁN SẴN THAY ĐỔI GIÁ (Change & Change Percent)
  const change = stock.matchPrice - stock.refPrice;
  const changePercent = stock.refPrice ? (change / stock.refPrice) * 100 : 0;

  // 2. HÀM CHỌN MÀU THEO GIÁ
  const getPriceColor = (price) => {
    if (!price) return ""; // Trống nếu không có giá
    if (price >= stock.ceiling) return "price--ceiling";
    if (price <= stock.floor) return "price--ceiling";
    if (price > stock.refPrice) return "price--up";
    if (price < stock.refPrice) return "price--down";
    return "price--ref";
  };

  // 3. HÀM FORMAT GIÁ CHUNG (vd: 25.40)
  const formatPrice = (price) => {
    if (price === undefined || price === null || price === 0) return "";
    return (price / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 4. HÀM FORMAT RIÊNG CHO BIẾN ĐỘNG GIÁ +/- (Luôn ép có 2 số đuôi vd: -1.00, 0.00)
  const formatChange = (val) => {
    if (val === undefined || val === null) return "";
    return (val / 1000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 5. HÀM FORMAT KHỐI LƯỢNG (vd: 1.171.300)
  const formatVolume = (vol) => {
    if (vol === undefined || vol === null || vol === 0) return "";
    return Number(vol).toLocaleString("vi-VN");
  };

  return (
    <tr
      className={`stock-row ${props.isSelected ? "stock-row--selected" : ""}`}
      onClick={() => props.onRowClick && props.onRowClick(stock.symbol)}
      id={`row-${stock.symbol}`}
    >
      {/* ===== Ticker & Tên công ty ===== */}
      <td className="col-ticker">
        <span className={`ticker-symbol ${getPriceColor(stock.matchPrice)}`}>
          {stock.symbol}
        </span>
      </td>

      {/* ===== Giá Tham Chiếu / Trần / Sàn ===== */}
      <td className="col-price price--ref">{formatPrice(stock.refPrice)}</td>
      <td className="col-price price--ceiling">{formatPrice(stock.ceiling)}</td>
      <td className="col-price price--floor">{formatPrice(stock.floor)}</td>

      {/* ===== BID: G3 → G1 ===== */}
      <td className={`col-bid ${getPriceColor(stock.bid3Price)}`}>
        <div className="cell-price ">{formatPrice(stock.bid3Price)}</div>
        <div className="cell-vol">{formatVolume(stock.bid3Vol)}</div>
      </td>
      <td className={`col-bid ${getPriceColor(stock.bid2Price)}`}>
        <div className="cell-price">{formatPrice(stock.bid2Price)}</div>
        <div className="cell-vol">{formatVolume(stock.bid2Vol)}</div>
      </td>
      <td className={`col-bid ${getPriceColor(stock.bid1Price)}`}>
        <div className="cell-price">{formatPrice(stock.bid1Price)}</div>
        <div className="cell-vol">{formatVolume(stock.bid1Vol)}</div>
      </td>

      {/* ===== MATCH: Giá khớp, thay đổi ===== */}
      <td className={`col-match ${getPriceColor(stock.matchPrice)}`}>
        <div className="cell-price cell-price--bold">
          {formatPrice(stock.matchPrice)}
        </div>
        <div className="cell-vol">{formatVolume(stock.matchVolume)}</div>
      </td>

      {/* Cột Biến động giá tuyệt đối (+/-) */}
      <td
        className={`col-change ${
          change > 0 ? "price--up" : change < 0 ? "price--down" : "price--ref"
        }`}
      >
        {change > 0 ? "+" : ""}
        {formatChange(change)}
      </td>

      {/* Cột Biến động giá phần trăm (%) */}
      <td
        className={`col-change-pct ${
          change > 0 ? "price--up" : change < 0 ? "price--down" : "price--ref"
        }`}
      >
        {change > 0 ? "+" : ""}
        {changePercent.toFixed(2)}%
      </td>

      {/* ===== ASK: G1 → G3 ===== */}
      <td className={`col-ask ${getPriceColor(stock.ask1Price)}`}>
        <div className="cell-price">{formatPrice(stock.ask1Price)}</div>
        <div className="cell-vol">{formatVolume(stock.ask1Vol)}</div>
      </td>
      <td className={`col-ask ${getPriceColor(stock.ask2Price)}`}>
        <div className="cell-price">{formatPrice(stock.ask2Price)}</div>
        <div className="cell-vol">{formatVolume(stock.ask2Vol)}</div>
      </td>
      <td className={`col-ask ${getPriceColor(stock.ask3Price)}`}>
        <div className="cell-price">{formatPrice(stock.ask3Price)}</div>
        <div className="cell-vol">{formatVolume(stock.ask3Vol)}</div>
      </td>

      {/* ===== Tổng KL ===== */}
      <td className="col-total-vol">{formatVolume(stock.totalVolume)}</td>

      {/* ===== CAO / THẤP===== */}
      <td className={`col-price ${getPriceColor(stock.high)}`}>
        {formatPrice(stock.high)}
      </td>
      <td className={`col-price ${getPriceColor(stock.low)}`}>
        {formatPrice(stock.low)}
      </td>

      {/* ===== Khối ngoại ===== */}
      <td className="col-foreign">{formatVolume(stock.foreignBuy)}</td>
      <td className="col-foreign">{formatVolume(stock.foreignSell)}</td>
      <td className="col-foreign">{formatVolume(stock.currentRoom)}</td>
    </tr>
  );
};

export default StockRow;
