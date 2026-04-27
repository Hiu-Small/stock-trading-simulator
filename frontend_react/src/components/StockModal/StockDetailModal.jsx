import React, { useState } from "react";
import "./StockDetailModal.scss";
import ModalHeader from "./Layout/ModalHeader";
import ModalTabs from "./Layout/ModalTabs";
import TabContentGiaoDich from "./TabGiaoDich/TabContent";

const StockDetailModal = (props) => {
  const [activeTab, setActiveTab] = useState("Giao dịch");

  if (!props.symbol) return null;

  return (
    <div className="stock-modal-overlay" onClick={props.onClose}>
      <div 
        className="stock-modal-content" 
        onClick={(e) => e.stopPropagation()} 
      >
        <ModalHeader symbol={props.symbol} data={props.data} onClose={props.onClose} />
        
        <ModalTabs activeTab={activeTab} onChangeTab={setActiveTab} />
        
        <div className="stock-modal-body">
          {activeTab === "Giao dịch" && (
            <TabContentGiaoDich symbol={props.symbol} data={props.data} />
          )}
          {activeTab !== "Giao dịch" && (
            <div className="empty-tab">Tính năng đang được phát triển...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
