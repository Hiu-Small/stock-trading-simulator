import React, { useState } from "react";
import "./LeaderboardPage.scss";

const topThree = [
  { rank: 2, name: "Emily Rodriguez", id: "#10244", profit: "+198.450.000", roi: "+198.45%", color: "silver" },
  { rank: 1, name: "John Anderson", id: "#10241", profit: "+242.850.000", roi: "+242.85%", color: "gold" },
  { rank: 3, name: "Jessica Taylor", id: "#10246", profit: "+175.680.000", roi: "+175.68%", color: "bronze" }
];

const rankings = [
  { rank: 5, name: "Amanda Brown", id: "#10248", profit: "165.420.000", roi: "+65.42%", winRate: "71.5%" },
  { rank: 6, name: "Robert Wilson", id: "#10247", profit: "152.300.000", roi: "+52.30%", winRate: "68.9%" },
  { rank: 7, name: "David Kim", id: "#10245", profit: "138.900.000", roi: "+38.90%", winRate: "64.3%" },
  { rank: 8, name: "Michael Chen", id: "#10243", profit: "125.680.000", roi: "+25.68%", winRate: "60.7%" },
  { rank: 9, name: "Lisa Nguyen", id: "#10249", profit: "112.450.000", roi: "+12.45%", winRate: "58.2%" },
  { rank: 10, name: "James Park", id: "#10250", profit: "98.320.000", roi: "-1.68%", winRate: "52.4%" }
];

const LeaderboardPage = () => {
  const [timeFilter, setTimeFilter] = useState("All-time");

  return (
    <div className="admin-leaderboard-page">
      <div className="page-header">
        <div className="header-left">
          <div className="title-with-icon">
            <div className="icon-bg">
              <i className="fa-solid fa-trophy"></i>
            </div>
            <div>
              <h1>Top Performers</h1>
              <p>Leading traders by return on investment</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="time-filters">
            {["All-time", "This Month", "This Week"].map(filter => (
              <button 
                key={filter}
                className={timeFilter === filter ? "active" : ""}
                onClick={() => setTimeFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="podium-container">
        {/* Render in order 2, 1, 3 for podium look */}
        {[topThree[0], topThree[1], topThree[2]].map((user) => (
          <div key={user.rank} className={`podium-card ${user.color}`}>
            <div className="rank-badge">
              <i className="fa-solid fa-trophy"></i>
              <span>{user.rank}</span>
            </div>
            <div className="user-avatar">
              <i className="fa-solid fa-user"></i>
            </div>
            <h3 className="user-name">{user.name}</h3>
            <span className="user-id">ID: {user.id}</span>
            
            <div className="profit-section">
              <span className="label">Total Profit</span>
              <span className="value">{user.profit}</span>
              <span className="unit">VND</span>
            </div>
            
            <div className="roi-badge">
              <i className="fa-solid fa-arrow-trend-up"></i>
              <span>{user.roi} ROI</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ranking-table-container dashboard-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-rank">RANK</th>
              <th className="col-user">USER</th>
              <th className="col-profit">PROFIT (VND)</th>
              <th className="col-roi">ROI</th>
              <th className="col-win">WIN RATE</th>
              <th className="col-actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((user) => (
              <tr key={user.rank}>
                <td className="col-rank">
                  <div className="rank-circle">{user.rank}</div>
                </td>
                <td className="col-user">
                  <div className="user-info">
                    <div className="avatar-small">
                      <i className="fa-solid fa-user"></i>
                    </div>
                    <div>
                      <span className="name">{user.name}</span>
                      <span className="id">ID: {user.id}</span>
                    </div>
                  </div>
                </td>
                <td className="col-profit"><strong>{user.profit}</strong></td>
                <td className={`col-roi ${user.roi.startsWith("+") ? "up" : "down"}`}>
                  {user.roi}
                </td>
                <td className="col-win">{user.winRate}</td>
                <td className="col-actions">
                  <button className="btn-inspect">
                    <i className="fa-solid fa-eye"></i> Inspect Portfolio
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="leaderboard-footer">
        <div className="stat-card dashboard-section">
          <span className="label">Average ROI</span>
          <span className="value success">+92.38%</span>
        </div>
        <div className="stat-card dashboard-section">
          <span className="label">Highest Win Rate</span>
          <span className="value blue">87.5%</span>
        </div>
        <div className="stat-card dashboard-section">
          <span className="label">Total Participants</span>
          <span className="value">10</span>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
