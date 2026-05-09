import React, { useState } from "react";
import "./BalanceAdjustmentModal.scss";

const BalanceAdjustmentModal = ({ show, handleClose, user }) => {
  const [operation, setOperation] = useState("add"); // "add" or "deduct"
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  if (!show || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Adjusting balance for:", user.name, { operation, amount, note });
    handleClose();
  };

  return (
    <div className="balance-modal-overlay" onClick={handleClose}>
      <div className="balance-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-info">
            <h2 className="title">Manual Balance Adjustment</h2>
            <p className="subtitle">Adjust virtual balance for <span>{user.name}</span></p>
          </div>
          <button className="btn-close" onClick={handleClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="current-balance-box">
            <span className="label">Current Virtual Balance</span>
            <div className="value">{user.balance}</div>
          </div>

          <div className="form-group">
            <label>Operation Type</label>
            <div className="operation-buttons">
              <button
                type="button"
                className={`btn-op ${operation === "add" ? "active add" : ""}`}
                onClick={() => setOperation("add")}
              >
                Add Funds
              </button>
              <button
                type="button"
                className={`btn-op ${operation === "deduct" ? "active deduct" : ""}`}
                onClick={() => setOperation("deduct")}
              >
                Deduct Funds
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Amount ($)</label>
            <div className="input-wrapper">
              <span className="currency">$</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Reason / Note</label>
            <textarea
              placeholder="Enter reason for adjustment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="4"
            ></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className={`btn-confirm ${operation === "add" ? "add" : "deduct"}`}>
              Confirm {operation === "add" ? "Addition" : "Deduction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BalanceAdjustmentModal;
