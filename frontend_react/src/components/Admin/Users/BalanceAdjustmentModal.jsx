import React, { useState } from "react";
import "./BalanceAdjustmentModal.scss";
import { updateUserBalance } from "../../../services/adminService";
import { toast } from "react-toastify";

const BalanceAdjustmentModal = ({ show, handleClose, user, onSuccess }) => {
  const [operation, setOperation] = useState("add"); // "add" or "deduct"
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!show || !user) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
        toast.warning("Vui lòng nhập số tiền hợp lệ");
        return;
    }

    setLoading(true);
    try {
        const response = await updateUserBalance({
            userId: user.id,
            amount: amount,
            type: operation === "add" ? "ADD" : "DEDUCT",
            reason: note || `Manual adjustment by admin: ${operation}`
        });

        if (response && response.EC === 0) {
            toast.success(response.EM || "Cập nhật số dư thành công");
            setAmount("");
            setNote("");
            if (onSuccess) onSuccess();
            handleClose();
        } else {
            toast.error(response.EM || "Lỗi khi cập nhật số dư");
        }
    } catch (error) {
        console.error("Update balance error:", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="balance-modal-overlay" onClick={handleClose}>
      <div className="balance-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-info">
            <h2 className="title">Manual Balance Adjustment</h2>
            <p className="subtitle">Adjust virtual balance for <span>{user.full_name}</span></p>
          </div>
          <button className="btn-close" onClick={handleClose} disabled={loading}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="current-balance-box">
            <span className="label">Current Virtual Balance</span>
            <div className="value">{formatCurrency(user.virtual_balance)}</div>
          </div>

          <div className="form-group">
            <label>Operation Type</label>
            <div className="operation-buttons">
              <button
                type="button"
                className={`btn-op ${operation === "add" ? "active add" : ""}`}
                onClick={() => setOperation("add")}
                disabled={loading}
              >
                Add Funds
              </button>
              <button
                type="button"
                className={`btn-op ${operation === "deduct" ? "active deduct" : ""}`}
                onClick={() => setOperation("deduct")}
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
            ></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn-confirm ${operation === "add" ? "add" : "deduct"} ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? "Processing..." : `Confirm ${operation === "add" ? "Addition" : "Deduction"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BalanceAdjustmentModal;
