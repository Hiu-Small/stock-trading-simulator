import React from "react";
import "./ModalTabs.scss";

const TABS = [
  "Giao dịch",
  "Hồ sơ",
  "Cổ đông",
  "Vốn và cổ tức",
  "Tin tức",
  "Lịch sự kiện",
  "Thống kê",
  "Tài chính"
];

const ModalTabs = (props) => {
  return (
    <div className="modal-tabs">
      {TABS.map(tab => (
        <div 
          key={tab}
          className={`tab-item ${props.activeTab === tab ? "active" : ""}`}
          onClick={() => props.onChangeTab(tab)}
        >
          {tab}
        </div>
      ))}
    </div>
  );
};

export default ModalTabs;
