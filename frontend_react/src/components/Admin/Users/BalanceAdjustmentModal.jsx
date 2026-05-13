import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import "./BalanceAdjustmentModal.scss";
import { updateUserBalance } from "../../../services/adminService";
import { toast } from "react-toastify";

const BalanceAdjustmentModal = ({ show, handleClose, user, onSuccess }) => {
  const [operation, setOperation] = useState("add"); // "add" or "deduct"
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

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
    <Modal 
      show={show} 
      onHide={handleClose} 
      centered 
      className="balance-modal-custom"
    >
      <Modal.Header>
        <div className="header-info">
          <Modal.Title className="title">Điều chỉnh số dư thủ công</Modal.Title>
          <p className="subtitle">Điều chỉnh số dư cho: <span>{user.profile?.full_name || user.email}</span></p>
        </div>
        <button className="btn-close-custom" onClick={handleClose} disabled={loading}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="current-balance-box">
            <span className="label">Số dư hiện tại</span>
            <div className="value">{formatCurrency(user.virtual_balance)}</div>
          </div>

          <div className="form-group-custom">
            <label>Loại giao dịch</label>
            <div className="operation-buttons">
              <button
                type="button"
                className={`btn-op ${operation === "add" ? "active add" : ""}`}
                onClick={() => setOperation("add")}
                disabled={loading}
              >
                Cộng tiền
              </button>
              <button
                type="button"
                className={`btn-op ${operation === "deduct" ? "active deduct" : ""}`}
                onClick={() => setOperation("deduct")}
                disabled={loading}
              >
                Trừ tiền
              </button>
            </div>
          </div>

          <div className="form-group-custom">
            <label>Số tiền ($)</label>
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

          <div className="form-group-custom">
            <label>Lý do / Ghi chú</label>
            <textarea
              placeholder="Nhập lý do điều chỉnh..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="4"
              disabled={loading}
            ></textarea>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <button type="button" className="btn-cancel" onClick={handleClose} disabled={loading}>
            Hủy
          </button>
          <button 
            type="submit" 
            className={`btn-confirm ${operation === "add" ? "add" : "deduct"} ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : `Xác nhận ${operation === "add" ? "Cộng tiền" : "Trừ tiền"}`}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default BalanceAdjustmentModal;
