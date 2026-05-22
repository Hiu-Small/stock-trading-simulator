import React from "react";
import "./MatchHistoryLog.scss";
import "../../../assets/styles/global.scss";
import { useTranslation } from "../../../context/LanguageContext";

const MatchHistoryLog = (props) => {
  const { lang, t } = useTranslation();
  // Lấy dữ liệu từ props.data (do StockDetailModal đã gọi API và truyền xuống)
  const history = props.data?.matchHistory || [];
  const stats = props.data?.matchStats || {
    totalBuy: 0,
    totalSell: 0,
    total: 0,
  };

  // Lấy các mốc giá để tính màu sắc
  const refPrice = props.data?.refPrice ? props.data.refPrice / 1000 : 0;
  const floor = props.data?.floor ? props.data.floor / 1000 : 0;
  const ceiling = props.data?.ceiling ? props.data.ceiling / 1000 : 0;

  // ==========================================
  // HÀM FORMAT HIỂN THỊ
  // ==========================================
  const formatVolToK = (vol) => {
    if (!vol) return "0";
    return (
      (vol / 1000).toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "K"
    );
  };

  const getPriceColor = (price) => {
    if (!refPrice) return "price--ref";
    if (price >= ceiling) return "price--ceiling";
    if (price <= floor) return "price--floor";
    if (price > refPrice) return "price--up";
    if (price < refPrice) return "price--down";
    return "price--ref";
  };

  const getSideLabel = (side) => {
    if (lang === "vi") return side;
    return side === "M" ? "B" : "S";
  };

  return (
    <div className="match-history-container">
      {/* HEADER THỐNG KÊ */}
      <div className="history-header">
        <div className="title">{lang === "vi" ? "Khớp lệnh" : "Match History"}</div>
        <div className="summary">
          <span className="total">KL: {formatVolToK(stats.total)}</span>
          <span className="buy">
            {lang === "vi" ? "M:" : "B:"} <span className="price--up">{formatVolToK(stats.totalBuy)}</span>
          </span>
          <span className="sell">
            {lang === "vi" ? "B:" : "S:"}{" "}
            <span className="price--down">{formatVolToK(stats.totalSell)}</span>
          </span>
        </div>
      </div>

      {/* BẢNG LỊCH SỬ KHỚP */}
      <div className="history-table">
        <div className="table-head">
          <div className="col-time">{lang === "vi" ? "Thời gian" : "Time"}</div>
          <div className="col-vol text-right">{lang === "vi" ? "KL" : "Vol"}</div>
          <div className="col-price text-right">{lang === "vi" ? "Giá" : "Price"}</div>
          <div className="col-change text-right">+/-</div>
          <div className="col-percent text-right">+/- (%)</div>
          <div className="col-side text-right">{lang === "vi" ? "M/B" : "B/S"}</div>
        </div>

        <div className="table-body">
          {history.length === 0 ? (
            <div className="loading-text">
              <i className="fa-solid fa-chart-line"></i>
              <div>{t("stockModal.noMatchHistory")}</div>
            </div>
          ) : (
            history.map((row, index) => {
              const change = row.price - refPrice;
              const changePercent = refPrice ? (change / refPrice) * 100 : 0;
              const colorClass = getPriceColor(row.price);

              return (
                <div className="table-row" key={index}>
                  <div className="col-time">{row.time}</div>
                  <div className="col-vol text-right">
                    {Number(row.volume).toLocaleString("vi-VN")}
                  </div>
                  <div className={`col-price text-right ${colorClass}`}>
                    {row.price.toFixed(2)}
                  </div>
                  <div className={`col-change text-right ${colorClass}`}>
                    {change.toFixed(2)}
                  </div>
                  <div className={`col-percent text-right ${colorClass}`}>
                    {changePercent.toFixed(1)}
                  </div>
                  <div
                    className={`col-side text-right ${
                      row.side === "B" ? "price--down" : "price--up"
                    }`}
                  >
                    {getSideLabel(row.side)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchHistoryLog;
