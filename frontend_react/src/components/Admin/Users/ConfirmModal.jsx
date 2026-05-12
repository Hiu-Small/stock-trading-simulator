import React from "react";
import "./ConfirmModal.scss";

const ConfirmModal = ({ show, handleClose, handleConfirm, title, message, confirmText, cancelText, type }) => {
  if (!show) return null;

  return (
    <div className="confirm-modal-overlay" onClick={handleClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-info">
            <h2 className={`title ${type}`}>{title}</h2>
          </div>
          <button className="btn-close" onClick={handleClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          <p className="message">{message}</p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={handleClose}>
            {cancelText || "Hủy"}
          </button>
          <button 
            type="button" 
            className={`btn-confirm ${type}`} 
            onClick={handleConfirm}
          >
            {confirmText || "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
