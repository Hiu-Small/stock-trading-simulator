import React from "react";
import "./StatsCard.scss";

const StatsCard = ({ title, value, change, icon, color }) => {
  const isPositive = change.startsWith("+");
  
  return (
    <div className="stats-card">
      <div className="card-top">
        <div className="card-info">
          <span className="card-title">{title}</span>
          <h2 className="card-value">{value}</h2>
          <span className={`card-change ${isPositive ? "positive" : "negative"}`}>
            {change} <span className="period">from last month</span>
          </span>
        </div>
        <div className="card-icon" style={{ backgroundColor: `rgba(${color}, 0.1)`, color: `rgb(${color})` }}>
          <i className={icon}></i>
        </div>
      </div>
      <div className="card-chart">
        {/* Placeholder cho Sparkline Chart */}
        <svg viewBox="0 0 200 40" preserveAspectRatio="none">
          <path
            d={`M0 20 Q 50 ${isPositive ? 10 : 30}, 100 20 T 200 ${isPositive ? 15 : 25}`}
            fill="none"
            stroke={`rgb(${color})`}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
};

export default StatsCard;
