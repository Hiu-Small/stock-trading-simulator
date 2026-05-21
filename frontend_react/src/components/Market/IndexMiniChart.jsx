import React, { useMemo } from "react";
import "./IndexMiniChart.scss";

const IndexMiniChart = (props) => {
  const { data, refPrice } = props;

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Xác định thời điểm bắt đầu khớp lệnh của sàn
    // VNINDEX/VN30 (HOSE) bắt đầu từ 9:15 sau ATO
    // HNX/UPCOM bắt đầu từ 9:00
    const startPointTime = (props.id === "vnindex" || props.id === "vn30") ? "09:15" : "09:00";

    // 1. Loại bỏ trùng lặp thời gian
    const uniqueMap = new Map();
    data.forEach(item => {
      uniqueMap.set(item.time, item);
    });
    
    let sortedData = Array.from(uniqueMap.values()).sort((a, b) => a.time.localeCompare(b.time));

    // 1.5 Lọc bỏ các điểm trước giờ bắt đầu (nếu API trả về dữ liệu cũ hoặc dữ liệu ATO chưa chuẩn)
    sortedData = sortedData.filter(item => item.time >= startPointTime);

    // 2. Ép điểm bắt đầu từ đường tham chiếu nếu chưa có điểm đúng giờ bắt đầu
    if (sortedData.length > 0 && sortedData[0].time > startPointTime) {
      sortedData.unshift({
        time: startPointTime,
        value: refPrice,
        volume: 0
      });
    } else if (sortedData.length > 0 && sortedData[0].time === startPointTime) {
      sortedData[0].value = refPrice;
    } else if (sortedData.length === 0) {
      // Nếu không có dữ liệu nào, vẫn tạo 1 điểm bắt đầu để hiện đường tham chiếu (nếu không phải PRE)
      sortedData = [{
        time: startPointTime,
        value: refPrice,
        volume: 0
      }];
    }

    return sortedData;
  }, [data, refPrice, props.id, props.session?.type]);

  const isPreOrClosed = props.session?.type === "pre";
  const isEffectivelyEmpty = chartData.length <= 1;

  const width = 100;
  const height = 60; 
  const chartTop = 10; // Khoảng cách từ đỉnh SVG xuống vùng vẽ chart
  const chartHeight = 30; // Chiều cao thực tế của vùng vẽ đường giá
  const volumeHeight = 12; // Chiều cao tối đa của cột khối lượng

  // Tính toán Scale giá
  const prices = chartData.map((d) => d.value);
  let minPrice = Math.min(...prices, refPrice);
  let maxPrice = Math.max(...prices, refPrice);
  
  // Padding tương đối để dải giá cân đối
  const priceDiff = maxPrice - minPrice || refPrice * 0.001;
  minPrice -= priceDiff * 0.15;
  maxPrice += priceDiff * 0.15;

  // Hàm getY mới: maxPrice sẽ có Y = chartTop (10), minPrice có Y = chartTop + chartHeight (40)
  const getY = (price) => chartTop + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  
  // Nếu thực sự rỗng thì mới ép đường tham chiếu ra giữa vùng chart
  const refY = isEffectivelyEmpty ? chartTop + chartHeight / 2 : getY(refPrice);

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

  // Vẽ các đoạn đường giá (có xử lý cắt tại đường tham chiếu để đổi màu chính xác)
  const segments = [];
  for (let i = 0; i < chartData.length - 1; i++) {
    const p1 = chartData[i];
    const p2 = chartData[i + 1];
    
    const x1 = getXByTime(p1.time);
    const y1 = getY(p1.value);
    const x2 = getXByTime(p2.time);
    const y2 = getY(p2.value);

    const v1 = p1.value;
    const v2 = p2.value;

    // Kiểm tra cắt đường tham chiếu
    const crossesRef = (v1 > refPrice && v2 < refPrice) || (v1 < refPrice && v2 > refPrice);

    if (crossesRef) {
      const ratio = Math.abs(refPrice - v1) / Math.abs(v2 - v1);
      const xMid = x1 + (x2 - x1) * ratio;
      const yMid = getY(refPrice);

      const color1 = v1 >= refPrice ? "#00c805" : "#ff3b30";
      segments.push(
        <line 
          key={`${i}-a`} 
          x1={x1} y1={y1} x2={xMid} y2={yMid} 
          stroke={color1} 
          strokeWidth="1.2" 
          vectorEffect="non-scaling-stroke"
        />
      );

      const color2 = v2 >= refPrice ? "#00c805" : "#ff3b30";
      segments.push(
        <line 
          key={`${i}-b`} 
          x1={xMid} y1={yMid} x2={x2} y2={y2} 
          stroke={color2} 
          strokeWidth="1.2" 
          vectorEffect="non-scaling-stroke"
        />
      );
    } else {
      const color = v2 >= refPrice ? "#00c805" : "#ff3b30";
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
        <line x1="0" y1={chartTop + chartHeight * 0.5} x2={width} y2={chartTop + chartHeight * 0.5} stroke="var(--border-primary)" strokeWidth="0.5" />
        
        {/* Đường lưới dọc và mốc giờ */}
        {timeLabels.map((tm) => {
          const x = getXByTime(tm.time);
          return (
            <React.Fragment key={tm.label}>
              <line x1={x} y1={chartTop} x2={x} y2={chartTop + chartHeight} stroke="var(--border-primary)" strokeWidth="0.5" />
            </React.Fragment>
          );
        })}

        {/* Đường tham chiếu */}
        <line
          x1="0"
          y1={refY}
          x2={width}
          y2={refY}
          stroke="var(--text-muted)"
          strokeWidth="0.8"
          strokeDasharray="2,2"
          vectorEffect="non-scaling-stroke"
        />


        {!isPreOrClosed && volumeBars}
        {!isPreOrClosed && segments}
      </svg>
      
      {/* Nhãn giá tham chiếu (Dùng HTML để không bị méo chữ khi SVG stretch) */}
      <div 
        className="chart-ref-label" 
        style={{ 
          top: `${(refY / height) * 100}%`, 
          left: '50%',
          transform: 'translate(-50%, -100%)',
          marginTop: '-2px'
        }}
      >
        {refPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
      </div>

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
