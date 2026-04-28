import React, { useState, useEffect } from "react";
import "./MatchHistoryLog.scss";
import { fetchMatchingDetail } from "../../../services/marketApi"; // Kiểm tra lại đường dẫn import cho đúng nhé
import "../../../assets/styles/global.scss";

const MatchHistoryLog = (props) => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalBuy: 0, totalSell: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Lấy giá tham chiếu truyền từ ngoài vào.
  // (Ví dụ props.refPrice = 23400 -> chia 1000 để đồng bộ với price 23.5 của API)
  const refPrice = props.data.refPrice ? props.data.refPrice / 1000 : 0;
  const floor = props.data.floor ? props.data.floor/ 1000 : 0;
  const ceiling = props.data.ceiling ? props.data.ceiling / 1000 : 0;

  useEffect(() => {
    if (!props.symbol) return;

    // Hàm gọi API lấy dữ liệu
    const loadMatchingData = async () => {
      const result = await fetchMatchingDetail(props.symbol);

      if (result && result.success) {
        // Cập nhật thống kê Tổng (Header)
        if (result.stats) setStats(result.stats);

        // Cập nhật danh sách lệnh khớp (Table)
        if (result.match) setHistory(result.match);
      }
      setLoading(false);
    };

    // Gọi lần đầu tiên ngay khi mở Modal
    loadMatchingData();

    // Thiết lập Polling: Tự động gọi lại API mỗi 15 giây để cập nhật lệnh mới
    const interval = setInterval(() => {
      loadMatchingData();
    }, 15000);

    // Dọn dẹp interval khi đóng Modal
    return () => clearInterval(interval);
  }, [props.symbol]);

  // ==========================================
  // HÀM FORMAT HIỂN THỊ
  // ==========================================
  // Rút gọn Khối lượng (vd: 3079300 -> 3,079.3K) cho Header
  const formatVolToK = (vol) => {
    if (!vol) return "0";
    return (
      (vol / 1000).toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "K"
    );
  };

  // Tính màu sắc dựa vào giá Khớp so với giá Tham chiếu
  const getPriceColor = (price) => {
    if (!refPrice) return "price--ref";
    if (price === ceiling) return "price--ceiling";
    if (price === floor) return "price--floor";
    if (price > refPrice) return "price--up";
    if (price < refPrice) return "price--down";
    return "price--ref";
  };

  return (
    <div className="match-history-container">
      {/* HEADER THỐNG KÊ */}
      <div className="history-header">
        <div className="title">Khớp lệnh</div>
        <div className="summary">
          <span className="total">KL: {formatVolToK(stats.total)}</span>
          <span className="buy">
            M: <span className="price--up">{formatVolToK(stats.totalBuy)}</span>
          </span>
          <span className="sell">
            B:{" "}
            <span className="price--down">{formatVolToK(stats.totalSell)}</span>
          </span>
        </div>
      </div>

      {/* BẢNG LỊCH SỬ KHỚP */}
      <div className="history-table">
        <div className="table-head">
          <div className="col-time">Thời gian</div>
          <div className="col-vol text-right">KL</div>
          <div className="col-price text-right">Giá</div>
          <div className="col-change text-right">+/-</div>
          <div className="col-percent text-right">+/- (%)</div>
          <div className="col-side text-center">M/B</div>
        </div>

        <div className="table-body">
          {loading ? (
            <div className="loading-text">Đang tải dữ liệu...</div>
          ) : (
            history.map((row, index) => {
              // Tính toán biến động (Change) ngay lúc render
              const change = row.price - refPrice;
              const changePercent = refPrice ? (change / refPrice) * 100 : 0;
              const colorClass = getPriceColor(row.price);

              return (
                <div className="table-row" key={index}>
                  <div className="col-time">{row.time}</div>

                  {/* KL để nguyên số (chia dấu phẩy) */}
                  <div className="col-vol text-right">
                    {Number(row.volume).toLocaleString("vi-VN")}
                  </div>

                  {/* Giá khớp */}
                  <div className={`col-price text-right ${colorClass}`}>
                    {row.price.toFixed(2)}
                  </div>

                  {/* Thay đổi (+/-) */}
                  <div className={`col-change text-right ${colorClass}`}>
                    {Math.abs(change).toFixed(2)}
                  </div>

                  {/* Thay đổi % */}
                  <div className={`col-percent text-right ${colorClass}`}>
                    {Math.abs(changePercent).toFixed(1)}
                  </div>

                  {/* Phe Mua (B) / Bán (S) */}
                  <div
                    className={`col-side text-right ${row.side === "B" ? "price--down" : "price--up"}`}
                  >
                    {row.side}
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
