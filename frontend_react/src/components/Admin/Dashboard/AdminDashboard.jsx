import React from "react";
import StatsCard from "./StatsCard";
import "./AdminDashboard.scss";

const AdminDashboard = () => {
  const stats = [
    { title: "Total Active Users", value: "12,458", change: "+12.5%", icon: "fa-solid fa-users", color: "0, 200, 5" },
    { title: "Total Virtual AUM", value: "$142.8M", change: "+8.3%", icon: "fa-solid fa-dollar-sign", color: "59, 130, 246" },
    { title: "Daily Trade Volume", value: "6,742", change: "-3.2%", icon: "fa-solid fa-chart-line", color: "239, 68, 68" },
    { title: "Pending Support Tickets", value: "28", change: "+4 new today", icon: "fa-solid fa-comment-dots", color: "16, 185, 129" },
  ];

  return (
    <div className="admin-dashboard">
      <div className="stats-grid">
        {stats.map((item, index) => (
          <StatsCard key={index} {...item} />
        ))}
      </div>

      <div className="dashboard-section main-chart">
        <div className="section-header">
          <h3>System Trading Activity</h3>
          <p>Last 7 days trading volume and trade count</p>
        </div>
        <div className="chart-container" style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
          {/* Sẽ tích hợp thư viện Chart vào đây */}
          <div className="chart-placeholder">
             [ Trading Activity Chart Placeholder ]
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section recent-activity" style={{ flex: 2 }}>
          <div className="section-header">
            <h3>Recent Virtual Deposits/Adjustments</h3>
            <p>Latest account activity</p>
          </div>
          <div className="activity-list">
             {/* List items tương ứng hình ảnh */}
             {[1, 2, 3, 4].map(i => (
               <div key={i} className="activity-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}></div>
                    <div>
                       <div style={{ fontWeight: 600 }}>User Name {i}</div>
                       <div style={{ fontSize: 12, color: '#8888aa' }}>Deposit</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#00c805', fontWeight: 700 }}>+$50,000</div>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>2 mins ago</div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="dashboard-section system-alerts" style={{ flex: 1, marginLeft: '24px' }}>
          <div className="section-header">
            <h3>System Alerts & Stuck Orders</h3>
            <p>Issues requiring attention</p>
          </div>
          <div className="alert-list">
             <div className="alert-item" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, marginBottom: 12 }}>
                <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>Stuck Order #45821</div>
                <div style={{ fontSize: 12, color: '#8888aa', marginTop: 4 }}>Pending for &gt; 2hrs</div>
             </div>
             <div className="alert-item" style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 12 }}>
                <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>High API Latency</div>
                <div style={{ fontSize: 12, color: '#8888aa', marginTop: 4 }}>Response time &gt; 500ms</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
