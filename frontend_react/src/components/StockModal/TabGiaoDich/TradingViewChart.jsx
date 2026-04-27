import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import "./TradingViewChart.scss";

// Dữ liệu nến mẫu (Mock Data)
const generateMockData = () => {
  const data = [];
  let currentPrice = 22.0;
  let time = new Date("2024-01-01").getTime() / 1000;
  
  for (let i = 0; i < 100; i++) {
    const open = currentPrice;
    const high = open + Math.random() * 1.5;
    const low = open - Math.random() * 1.5;
    const close = low + Math.random() * (high - low);
    
    data.push({
      time: time + i * 86400, // Thêm 1 ngày
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
    
    currentPrice = close; // Giá mở cửa ngày hôm sau gần với giá đóng cửa hôm trước
  }
  return data;
};

const TradingViewChart = (props) => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Khởi tạo biểu đồ
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1b24' },
        textColor: '#8888aa',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth || 600,
      height: chartContainerRef.current.clientHeight || 400,
    });

    // Đoạn mã bảo vệ: Nếu hàm không tồn tại thì dừng lại để không làm sập Modal
    if (typeof chart.addCandlestickSeries !== 'function') {
      return;
    }

    // Tạo Series nến
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00c805',
      downColor: '#ff3b30',
      borderVisible: false,
      wickUpColor: '#00c805',
      wickDownColor: '#ff3b30',
    });

    // Nạp dữ liệu
    const data = generateMockData();
    candlestickSeries.setData(data);

    // Tự động fit biểu đồ
    chart.timeScale().fitContent();

    // Xử lý resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [props.symbol]);

  return (
    <div className="trading-view-container">
      <div className="chart-toolbar">
        <span className="symbol-label">{props.symbol} · 1D</span>
        <div className="toolbar-actions">
          <button><i className="fa-solid fa-plus"></i></button>
          <button>D</button>
          <button><i className="fa-solid fa-chart-line"></i> Các chỉ báo</button>
        </div>
      </div>
      <div className="chart-wrapper" ref={chartContainerRef}></div>
    </div>
  );
};

export default TradingViewChart;
