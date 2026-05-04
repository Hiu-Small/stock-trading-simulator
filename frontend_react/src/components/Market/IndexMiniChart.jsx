import React, { useMemo } from "react";
import "./IndexMiniChart.scss";

const IndexMiniChart = (props) => {
  const { data, refPrice } = props;

  // Cấu hình thời gian phiên giao dịch (phút)
  const sessionMins = [
    { start: 9 * 60, end: 11 * 60 + 30 }, // 09:00 - 11:30
    { start: 13 * 60, end: 15 * 0 }      // 13:00 - 15:00 (Sẽ fix sau)
  ];

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // 1. Loại bỏ trùng lặp thời gian
    const uniqueMap = new Map();
    data.forEach(item => {
      uniqueMap.set(item.time, item);
    });
    
    return Array.from(uniqueMap.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [data]);

  if (chartData.length === 0) {
    return <div className="index-mini-chart-empty">No data</div>;
  }

  const width = 100;
  const height = 60; 
  const chartHeight = 40; 
  const volumeHeight = 20; 

  // Tính toán Scale giá
  const prices = chartData.map((d) => d.value);
  let minPrice = Math.min(...prices, refPrice);
  let maxPrice = Math.max(...prices, refPrice);
  const priceDiff = maxPrice - minPrice || 1;
  minPrice -= priceDiff * 0.05;
  maxPrice += priceDiff * 0.05;

  const getY = (price) => chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  const refY = getY(refPrice);

  // Tính toán vị trí X dựa trên thời gian thực tế để trục X là tuyến tính
  // Hàm chuyển HH:MM thành số phút từ đầu ngày
  const timeToMins = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const startMin = 9 * 60; // 09:00
  const endMin = 15 * 60;   // 15:00
  const totalDuration = endMin - startMin; // 360 phút (bao gồm cả giờ nghỉ trưa cho đơn giản)

  const getXByTime = (timeStr) => {
    const mins = timeToMins(timeStr);
    return ((mins - startMin) / totalDuration) * width;
  };

  // Tạo các mốc giờ hiển thị
  const timeLabels = [
    { label: "09h", time: "09:00" },
    { label: "10h", time: "10:00" },
    { label: "11h", time: "11:00" },
    { label: "12h", time: "12:00" },
    { label: "13h", time: "13:00" },
    { label: "14h", time: "14:00" },
    { label: "15h", time: "15:00" }
  ];

  // Vẽ các đoạn đường giá
  const segments = [];
  for (let i = 0; i < chartData.length - 1; i++) {
    const p1 = chartData[i];
    const p2 = chartData[i + 1];
    
    // Nếu khoảng cách thời gian giữa 2 điểm quá lớn (> 30p), coi như nghỉ trưa, không nối dây
    const x1 = getXByTime(p1.time);
    const x2 = getXByTime(p2.time);
    const y1 = getY(p1.value);
    const y2 = getY(p2.value);
    const color = p2.value >= refPrice ? "#00c805" : "#ff3b30";
    
    segments.push(
      <line 
        key={i} 
        x1={x1} y1={y1} x2={x2} y2={y2} 
        stroke={color} 
        strokeWidth="1.2" 
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // Vẽ Volume
  const maxVol = Math.max(...chartData.map((d) => d.volume), 1);
  const volumeBars = chartData.map((d, i) => {
    const x = getXByTime(d.time);
    const barHeight = (d.volume / maxVol) * volumeHeight;
    const y = height - barHeight;
    const barColor = "rgba(100, 180, 255, 0.7)";
    return (
      <rect
        key={`vol-${i}`}
        x={x - 0.3}
        y={y}
        width="0.6"
        height={barHeight}
        fill={barColor}
      />
    );
  });

  return (
    <div className="index-mini-chart">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Đường lưới ngang */}
        <line x1="0" y1={chartHeight * 0.5} x2={width} y2={chartHeight * 0.5} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        
        {/* Đường lưới dọc và mốc giờ */}
        {timeLabels.map((tm) => {
          const x = getXByTime(tm.time);
          return (
            <React.Fragment key={tm.label}>
              <line x1={x} y1="0" x2={x} y2={chartHeight} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            </React.Fragment>
          );
        })}

        {/* Đường tham chiếu */}
        <line
          x1="0"
          y1={refY}
          x2={width}
          y2={refY}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="0.8"
          strokeDasharray="2,2"
        />

        {volumeBars}
        {segments}
      </svg>
      
      {/* Hiển thị mốc giờ phía dưới */}
      <div className="chart-time-labels">
        {timeLabels.map((tm, idx) => {
          const x = getXByTime(tm.time);
          let style = { left: `${x}%`, transform: 'translateX(-50%)' };
          
          // Căn lề đặc biệt cho mốc đầu và cuối để không bị tràn
          if (idx === 0) style = { left: '2px', transform: 'none' };
          if (idx === timeLabels.length - 1) style = { right: '2px', transform: 'none' };

          return (
            <span key={tm.label} style={style}>
              {tm.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default IndexMiniChart;
