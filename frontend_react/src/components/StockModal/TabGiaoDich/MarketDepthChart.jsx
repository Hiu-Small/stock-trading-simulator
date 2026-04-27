import React from "react";
import "./MarketDepthChart.scss";

const MarketDepthChart = (props) => {
  return (
    <div className="market-depth-container">
      <div className="section-title">Biểu đồ độ sâu thị trường</div>
      
      <div className="depth-chart-area">
        {/* Y-axis labels */}
        <div className="y-axis">
          <span>3M-</span>
          <span>2.25M-</span>
          <span>1.5M-</span>
          <span>750K-</span>
          <span>0-</span>
        </div>
        
        {/* Chart content (Mocking the depth shape with CSS) */}
        <div className="chart-bars">
          {/* Mua (Xanh) */}
          <div className="bid-area">
            <div className="depth-step bid-step" style={{ height: '75%', width: '30%' }}></div>
            <div className="depth-step bid-step" style={{ height: '30%', width: '40%' }}></div>
            <div className="depth-step bid-step" style={{ height: '10%', width: '30%' }}></div>
          </div>
          
          {/* Bán (Đỏ) */}
          <div className="ask-area">
            <div className="depth-step ask-step" style={{ height: '5%', width: '20%' }}></div>
            <div className="depth-step ask-step" style={{ height: '15%', width: '30%' }}></div>
            <div className="depth-step ask-step" style={{ height: '40%', width: '50%' }}></div>
          </div>
        </div>
      </div>
      
      {/* X-axis labels (Prices) */}
      <div className="x-axis">
        <span>23.30</span>
        <span>23.35</span>
        <span>23.40</span>
        <span>23.45</span>
        <span>23.50</span>
        <span>23.55</span>
      </div>
    </div>
  );
};

export default MarketDepthChart;
