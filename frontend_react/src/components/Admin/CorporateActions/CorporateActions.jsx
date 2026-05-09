import React, { useState } from "react";
import "./CorporateActions.scss";

const mockActions = [
  { id: "#CA2024051", symbol: "VNM", type: "Cash Dividend", amount: "1,000 VND/share", date: "May 15, 2026", status: "Pending Execution" },
  { id: "#CA2024050", symbol: "VCB", type: "Stock Bonus", amount: "10%", date: "May 20, 2026", status: "Pending Execution" },
  { id: "#CA2024049", symbol: "HPG", type: "Cash Dividend", amount: "800 VND/share", date: "May 10, 2026", status: "Pending Execution" },
  { id: "#CA2024048", symbol: "VHM", type: "Cash Dividend", amount: "1,200 VND/share", date: "Apr 28, 2026", status: "Completed" },
  { id: "#CA2024047", symbol: "MSN", type: "Stock Bonus", amount: "15%", date: "Apr 20, 2026", status: "Completed" },
  { id: "#CA2024046", symbol: "GAS", type: "Cash Dividend", amount: "2,000 VND/share", date: "Apr 15, 2026", status: "Completed" },
];

const CorporateActions = () => {
  const [showForm, setShowForm] = useState(false);
  const [actionType, setActionType] = useState("Cash Dividend");

  const renderList = () => (
    <>
      <div className="page-header">
        <div className="header-left">
          <h1>Corporate Actions (Virtual Dividends)</h1>
          <p>Manage dividend distributions and stock bonuses</p>
        </div>
        <button className="btn-create" onClick={() => setShowForm(true)}>
          <i className="fa-solid fa-plus"></i> Create New Action
        </button>
      </div>

      <div className="summary-grid">
        <div className="summary-card dashboard-section">
          <span className="label">Total Actions (All Time)</span>
          <span className="value">6</span>
        </div>
        <div className="summary-card dashboard-section">
          <span className="label">Pending Execution</span>
          <span className="value warning">3</span>
        </div>
        <div className="summary-card dashboard-section">
          <span className="label">Completed This Month</span>
          <span className="value success">3</span>
        </div>
      </div>

      <div className="section-title">
        <h2>Active & Upcoming Actions</h2>
      </div>

      <div className="table-container dashboard-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ACTION ID</th>
              <th>SYMBOL</th>
              <th>TYPE</th>
              <th>RATIO/AMOUNT</th>
              <th>EX-DIVIDEND DATE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {mockActions.map((action, index) => (
              <tr key={index}>
                <td className="col-id">{action.id}</td>
                <td className="col-symbol"><strong>{action.symbol}</strong></td>
                <td>
                  <span className={`type-badge ${action.type.toLowerCase().replace(" ", "-")}`}>
                    <i className={action.type === "Cash Dividend" ? "fa-solid fa-dollar-sign" : "fa-solid fa-chart-line"}></i>
                    {action.type}
                  </span>
                </td>
                <td className="col-amount">{action.amount}</td>
                <td className="col-date">
                  <i className="fa-regular fa-calendar"></i> {action.date}
                </td>
                <td>
                  <span className={`status-badge ${action.status.toLowerCase().replace(" ", "-")}`}>
                    {action.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderForm = () => (
    <div className="create-form-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Corporate Actions (Virtual Dividends)</h1>
          <p>Manage dividend distributions and stock bonuses</p>
        </div>
        <button className="btn-cancel" onClick={() => setShowForm(false)}>
          <i className="fa-solid fa-xmark"></i> Cancel
        </button>
      </div>

      <div className="form-card dashboard-section">
        <div className="form-header">
          <h2>Create New Corporate Action</h2>
          <p>Configure virtual dividend or stock bonus distribution</p>
        </div>

        <div className="form-group">
          <label>Select Symbol</label>
          <div className="select-wrapper">
            <select>
              <option value="">Choose a stock symbol...</option>
              <option value="VNM">VNM - Vietnam Dairy Products JSC</option>
              <option value="VCB">VCB - Vietcombank</option>
              <option value="HPG">HPG - Hoa Phat Group</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label>Action Type</label>
            <div className="type-selector">
              <div 
                className={`type-option ${actionType === "Cash Dividend" ? "active" : ""}`}
                onClick={() => setActionType("Cash Dividend")}
              >
                <div className="icon-box green">
                  <i className="fa-solid fa-dollar-sign"></i>
                </div>
                <div className="option-info">
                  <span className="title">Cash Dividend</span>
                  <span className="desc">VND per share</span>
                </div>
              </div>
              <div 
                className={`type-option ${actionType === "Stock Bonus" ? "active" : ""}`}
                onClick={() => setActionType("Stock Bonus")}
              >
                <div className="icon-box blue">
                  <i className="fa-solid fa-chart-line"></i>
                </div>
                <div className="option-info">
                  <span className="title">Stock Bonus</span>
                  <span className="desc">Percentage ratio</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Ex-Dividend Date</label>
            <div className="input-wrapper">
              <i className="fa-regular fa-calendar"></i>
              <input type="date" placeholder="dd/mm/yyyy" />
            </div>
          </div>
          <div className="form-group">
            <label>{actionType === "Cash Dividend" ? "Amount (VND per share)" : "Bonus Ratio (%)"}</label>
            <div className="input-wrapper">
              <span className="prefix">{actionType === "Cash Dividend" ? "$" : "%"}</span>
              <input type="text" placeholder={actionType === "Cash Dividend" ? "1000" : "10"} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowForm(false)}>Clear Form</button>
          <button className="btn-primary">Create Corporate Action</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-ca-page">
      {showForm ? renderForm() : renderList()}
    </div>
  );
};

export default CorporateActions;
