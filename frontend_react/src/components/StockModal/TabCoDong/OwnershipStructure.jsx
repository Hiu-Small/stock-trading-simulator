import React, { useRef, useState, useEffect } from "react";
import "./OwnershipStructure.scss";

const OwnershipStructure = ({ data }) => {
  const cumulativePercentRef = useRef(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Kích hoạt animation sau khi component mount
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const chartData = [
    { name: "Cổ đông nhà nước", value: data["Cổ đông nhà nước"] || 0, color: "#3b82f6" },
    { name: "Cổ đông nước ngoài", value: data["Cổ đông nước ngoài"] || 0, color: "#94a3b8" },
    { name: "Cổ đông khác", value: data["Cổ đông khác"] || 0, color: "#ffffff" }
  ];

  const total = chartData.reduce((acc, cur) => acc + cur.value, 0);
  
  const renderDonutChart = () => {
    if (total === 0) return <div className="no-chart-data">Không có dữ liệu biểu đồ</div>;

    cumulativePercentRef.current = 0;
    const radius = 80;
    const strokeWidth = 40;
    const center = 100;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="donut-chart-container">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {chartData.map((item, idx) => {
            const percent = item.value / 100;
            if (percent <= 0) return null;
            
            // Vẽ từ đầu (isMounted = false -> 0, isMounted = true -> target)
            const currentDashArray = isMounted 
              ? `${percent * circumference} ${circumference}` 
              : `0 ${circumference}`;

            const strokeDashoffset = -cumulativePercentRef.current * circumference;
            
            // Tính toán delay và duration để tạo hiệu ứng vẽ liên tục 1 vòng
            // Tổng thời gian chạy 1 vòng là 1s (1000ms)
            const totalAnimationTime = 1000; 
            const duration = percent * totalAnimationTime;
            const delay = cumulativePercentRef.current * totalAnimationTime;

            cumulativePercentRef.current += percent;

            return (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={currentDashArray}
                strokeDashoffset={strokeDashoffset}
                style={{ 
                  transition: `stroke-dasharray ${duration}ms linear`,
                  transitionDelay: `${delay}ms`
                }}
                transform={`rotate(-90 ${center} ${center})`}
              />
            );
          })}
          <circle cx={center} cy={center} r={radius - strokeWidth / 2 - 1} fill="#1a1a1e" />
        </svg>
        
        <div className="chart-legend">
          {chartData.map((item, idx) => (
            <div key={idx} className="legend-item">
              <span className="dot" style={{ backgroundColor: item.color }}></span>
              <span className="label">{item.name} ({item.value}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="right-panel">
      <div className="panel-title">Cơ cấu cổ đông</div>
      <div className="chart-wrapper">
        {renderDonutChart()}
      </div>
    </div>
  );
};

export default OwnershipStructure;
