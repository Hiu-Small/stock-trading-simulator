import React, { useState, useEffect, useRef } from "react";
import "./StockRow.scss";

/**
 * StockRow - Một dòng cổ phiếu trong bảng giá
 */
const StockRow = (props) => {
  if (!props.stock) return null;

  const { stock } = props;
  const [flashClass, setFlashClass] = useState({});
  const prevPrices = useRef({});

  useEffect(() => {
    const fields = ['matchPrice', 'bid1Price', 'bid2Price', 'bid3Price', 'ask1Price', 'ask2Price', 'ask3Price'];
    const newFlashes = {};
    let hasChanges = false;

    fields.forEach(field => {
      const prevVal = prevPrices.current[field];
      const newVal = stock[field];

      // Chỉ nhấp nháy nếu giá trị trước đó có tồn tại, khác giá trị mới, và cả hai đều lớn hơn 0
      if (prevVal !== undefined && prevVal !== newVal && newVal > 0 && prevVal > 0) {
        newFlashes[field] = newVal > prevVal ? 'flash-up' : 'flash-down';
        hasChanges = true;
      }
      prevPrices.current[field] = newVal;
    });

    if (hasChanges) {
      setFlashClass(prev => ({ ...prev, ...newFlashes }));
      const timer = setTimeout(() => {
        setFlashClass(prev => {
          const updated = { ...prev };
          Object.keys(newFlashes).forEach(k => delete updated[k]);
          return updated;
        });
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [stock.matchPrice, stock.bid1Price, stock.bid2Price, stock.bid3Price, stock.ask1Price, stock.ask2Price, stock.ask3Price]);
  const visibleColumns = props.visibleColumns || {
    basic: true,
    highLow: true,
    totalVol: true,
    foreign: true,
  };

  // 1. TÍNH TOÁN SẴN THAY ĐỔI GIÁ (Change & Change Percent)
  const change = stock.matchPrice ? stock.matchPrice - stock.refPrice : "";
  const changePercent = stock.refPrice ? (change / stock.refPrice) * 100 : 0;

  // 2. HÀM CHỌN MÀU THEO GIÁ
  const getPriceColor = (price) => {
    if (!price) return ""; // Trống nếu không có giá
    if (price >= stock.ceiling) return "price--ceiling";
    if (price <= stock.floor) return "price--floor";
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
      onContextMenu={(e) => {
        e.preventDefault();
        if (props.onContextMenu) props.onContextMenu(stock.symbol, e);
      }}
      id={`row-${stock.symbol}`}
    >
      {/* ===== Ticker & Tên công ty ===== */}
      <td className="col-ticker">
        <span className={`ticker-symbol ${getPriceColor(stock.matchPrice)}`}>
          {stock.symbol}
        </span>
      </td>

      {/* ===== Giá Tham Chiếu / Trần / Sàn ===== */}
      {visibleColumns.basic && (
        <>
          <td className="col-price price--ref">{formatPrice(stock.refPrice)}</td>
          <td className="col-price price--ceiling">{formatPrice(stock.ceiling)}</td>
          <td className="col-price price--floor">{formatPrice(stock.floor)}</td>
        </>
      )}

      {/* ===== BID: G3 → G1 ===== */}
      <td className={`col-bid ${getPriceColor(stock.bid3Price)} ${flashClass.bid3Price || ''}`}>
        <div className="cell-price ">{formatPrice(stock.bid3Price)}</div>
        <div className="cell-vol">{formatVolume(stock.bid3Vol)}</div>
      </td>
      <td className={`col-bid ${getPriceColor(stock.bid2Price)} ${flashClass.bid2Price || ''}`}>
        <div className="cell-price">{formatPrice(stock.bid2Price)}</div>
        <div className="cell-vol">{formatVolume(stock.bid2Vol)}</div>
      </td>
      <td className={`col-bid ${getPriceColor(stock.bid1Price)} ${flashClass.bid1Price || ''}`}>
        <div className="cell-price">{formatPrice(stock.bid1Price)}</div>
        <div className="cell-vol">{formatVolume(stock.bid1Vol)}</div>
      </td>

      {/* ===== MATCH: Giá khớp, thay đổi ===== */}
      <td className={`col-match ${getPriceColor(stock.matchPrice)} ${flashClass.matchPrice || ''}`}>
        <div className="cell-price cell-price--bold">
          {formatPrice(stock.matchPrice)}
        </div>
        {/* <div className="cell-vol">{formatVolume(stock.matchVolume)}</div> */}
      </td>

      {/* Cột Biến động giá tuyệt đối (+/-) */}
      <td className={`col-change ${getPriceColor(stock.matchPrice)} ${flashClass.matchPrice || ''}`}>
        {stock.matchPrice > 0 && <>{formatChange(change)}</>}
      </td>

      {/* Cột Biến động giá phần trăm (%) */}
      <td className={`col-change-pct ${getPriceColor(stock.matchPrice)} ${flashClass.matchPrice || ''}`}>
        {stock.matchPrice > 0 && <>{changePercent.toFixed(2)}%</>}
      </td>

      {/* ===== ASK: G1 → G3 ===== */}
      <td className={`col-ask ${getPriceColor(stock.ask1Price)} ${flashClass.ask1Price || ''}`}>
        <div className="cell-price">{formatPrice(stock.ask1Price)}</div>
        <div className="cell-vol">{formatVolume(stock.ask1Vol)}</div>
      </td>
      <td className={`col-ask ${getPriceColor(stock.ask2Price)} ${flashClass.ask2Price || ''}`}>
        <div className="cell-price">{formatPrice(stock.ask2Price)}</div>
        <div className="cell-vol">{formatVolume(stock.ask2Vol)}</div>
      </td>
      <td className={`col-ask ${getPriceColor(stock.ask3Price)} ${flashClass.ask3Price || ''}`}>
        <div className="cell-price">{formatPrice(stock.ask3Price)}</div>
        <div className="cell-vol">{formatVolume(stock.ask3Vol)}</div>
      </td>

      {/* ===== Tổng KL ===== */}
      {visibleColumns.totalVol && (
        <td className="col-total-vol">{formatVolume(stock.totalVolume)}</td>
      )}

      {/* ===== CAO / THẤP===== */}
      {visibleColumns.highLow && (
        <>
          <td className={`col-price ${getPriceColor(stock.high)}`}>
            {formatPrice(stock.high)}
          </td>
          <td className={`col-price ${getPriceColor(stock.low)}`}>
            {formatPrice(stock.low)}
          </td>
        </>
      )}

      {/* ===== Khối ngoại ===== */}
      {visibleColumns.foreign && (
        <>
          <td className="col-foreign">{formatVolume(stock.foreignBuy)}</td>
          <td className="col-foreign">{formatVolume(stock.foreignSell)}</td>
          <td className="col-foreign">{formatVolume(stock.currentRoom)}</td>
        </>
      )}
    </tr>
  );
};

export default StockRow;
