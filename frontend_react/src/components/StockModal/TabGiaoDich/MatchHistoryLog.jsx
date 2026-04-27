import React, { useState, useEffect } from "react";
import "./MatchHistoryLog.scss";

// Giả lập lịch sử khớp lệnh
const generateMockHistory = (count) => {
  const result = [];
  const basePrice = 23.40;
  let time = new Date("2024-05-15T14:45:00").getTime();
  
  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.5;
    const priceDiff = (Math.random() * 0.2 - 0.1);
    const price = basePrice + priceDiff;
    const vol = Math.floor(Math.random() * 50) * 100 + 100;
    
    result.push({
      id: i,
      time: new Date(time).toLocaleTimeString('vi-VN', { hour12: false }),
      vol: vol,
      price: price,
      change: priceDiff,
      changePercent: (priceDiff / basePrice) * 100,
      side: isBuy ? 'B' : 'S' // B = Buy, S = Sell
    });
    
    time -= Math.random() * 5000; // Lùi thời gian
  }
  return result;
};

const MatchHistoryLog = (props) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(generateMockHistory(30));
    
    // Giả lập nhảy số realtime
    const interval = setInterval(() => {
      setHistory(prev => {
        const newItem = generateMockHistory(1)[0];
        newItem.time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        newItem.id = Date.now();
        return [newItem, ...prev].slice(0, 50); // Giữ tối đa 50 dòng
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [props.symbol]);

  return (
    <div className="match-history-container">
      <div className="history-header">
        <div className="title">Khớp lệnh</div>
        <div className="summary">
          <span className="total">KL: 17,478.7K</span>
          <span className="buy">M: <span className="color-up">3,787.1K</span></span>
          <span className="sell">B: <span className="color-down">13,691.6K</span></span>
        </div>
      </div>

      <div className="history-table">
        <div className="table-head">
          <div className="col-time">Thời gian</div>
          <div className="col-vol text-right">KL</div>
          <div className="col-price text-right">Giá</div>
          <div className="col-change text-right">+/-</div>
          <div className="col-percent text-right">+/_ (%)</div>
          <div className="col-side text-center">M/B</div>
        </div>
        
        <div className="table-body">
          {history.map(row => (
            <div className="table-row" key={row.id}>
              <div className="col-time">{row.time}</div>
              <div className="col-vol text-right">{row.vol.toLocaleString()}</div>
              <div className={`col-price text-right ${row.change > 0 ? 'color-up' : row.change < 0 ? 'color-down' : 'color-ref'}`}>
                {row.price.toFixed(2)}
              </div>
              <div className={`col-change text-right ${row.change > 0 ? 'color-up' : row.change < 0 ? 'color-down' : 'color-ref'}`}>
                {row.change.toFixed(2)}
              </div>
              <div className={`col-percent text-right ${row.change > 0 ? 'color-up' : row.change < 0 ? 'color-down' : 'color-ref'}`}>
                {row.changePercent.toFixed(1)}
              </div>
              <div className={`col-side text-center ${row.side === 'B' ? 'color-up' : 'color-down'}`}>
                {row.side}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchHistoryLog;
