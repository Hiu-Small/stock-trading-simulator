import React from "react";
import { Modal } from "react-bootstrap";
import { useTranslation } from "../../../context/LanguageContext";
import "./ConfirmModal.scss";

const ConfirmModal = ({ show, handleClose, handleConfirm, title, message, confirmText, cancelText, type }) => {
  const { t } = useTranslation();

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      centered 
      className="confirm-modal-custom"
    >
      <Modal.Header>
        <Modal.Title className={`title ${type}`}>{title}</Modal.Title>
        <button className="btn-close-custom" onClick={handleClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </Modal.Header>

      <Modal.Body className="text-center">
        <p className="message">{message}</p>
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <button type="button" className="btn-cancel" onClick={handleClose}>
          {cancelText || t("sidebar.createWatchlistCancel")}
        </button>
        <button 
          type="button" 
          className={`btn-confirm ${type}`} 
          onClick={handleConfirm}
        >
          {confirmText || (t("lang") === "vi" ? "Xác nhận" : "Confirm")}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
