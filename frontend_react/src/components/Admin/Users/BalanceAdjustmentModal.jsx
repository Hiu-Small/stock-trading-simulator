import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import "./BalanceAdjustmentModal.scss";
import { updateUserBalance } from "../../../services/adminService";
import { toast } from "react-toastify";
import { useTranslation } from "../../../context/LanguageContext";

const BalanceAdjustmentModal = ({ show, handleClose, user, onSuccess }) => {
  const { t, lang } = useTranslation();
  const [operation, setOperation] = useState("add"); // "add" or "deduct"
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setOperation("add");
      setAmount("");
      setNote("");
      setLoading(false);
    }
  }, [show]);


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
          <Modal.Title className="title">{t("admin.users.modalBalanceTitle")}</Modal.Title>
          <p className="subtitle">{t("admin.users.modalBalanceDesc")} <span>{user.profile?.full_name || user.email}</span></p>
        </div>
        <button className="btn-close-custom" onClick={handleClose} disabled={loading}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="current-balance-box">
            <span className="label">{t("admin.users.modalBalanceCurrent")}</span>
            <div className="value">{formatCurrency(user.virtual_balance)}</div>
          </div>

          <div className="form-group-custom">
            <label>{t("admin.users.modalBalanceType")}</label>
            <div className="operation-buttons">
              <button
                type="button"
                className={`btn-op ${operation === "add" ? "active add" : ""}`}
                onClick={() => setOperation("add")}
                disabled={loading}
              >
                {t("admin.users.modalBalanceAdd")}
              </button>
              <button
                type="button"
                className={`btn-op ${operation === "deduct" ? "active deduct" : ""}`}
                onClick={() => setOperation("deduct")}
                disabled={loading}
              >
                {t("admin.users.modalBalanceDeduct")}
              </button>
            </div>
          </div>

          <div className="form-group-custom">
            <label>{t("admin.users.modalBalanceAmount")}</label>
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
            <label>{t("admin.users.modalBalanceNote")}</label>
            <textarea
              placeholder={t("admin.users.modalBalanceNotePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="4"
              disabled={loading}
            ></textarea>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <button type="button" className="btn-cancel" onClick={handleClose} disabled={loading}>
            {t("sidebar.createWatchlistCancel")}
          </button>
          <button 
            type="submit" 
            className={`btn-confirm ${operation === "add" ? "add" : "deduct"} ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? (lang === "vi" ? "Đang xử lý..." : "Processing...") : (operation === "add" ? t("admin.users.modalBalanceConfirmAdd") : t("admin.users.modalBalanceConfirmDeduct"))}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default BalanceAdjustmentModal;
