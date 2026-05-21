import React from "react";
import "./ModalTabs.scss";
import { useTranslation } from "../../../context/LanguageContext";

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
  const { lang } = useTranslation();

  const getTabLabel = (tab) => {
    if (lang === "vi") return tab;
    const enLabels = {
      "Giao dịch": "Trading",
      "Hồ sơ": "Profile",
      "Cổ đông": "Shareholders",
      "Vốn và cổ tức": "Capital & Dividends",
      "Tin tức": "News",
      "Lịch sự kiện": "Events",
      "Thống kê": "Statistics",
      "Tài chính": "Financials",
    };
    return enLabels[tab] || tab;
  };

  return (
    <div className="modal-tabs">
      {TABS.map(tab => (
        <div 
          key={tab}
          className={`tab-item ${props.activeTab === tab ? "active" : ""}`}
          onClick={() => props.onChangeTab(tab)}
        >
          {getTabLabel(tab)}
        </div>
      ))}
    </div>
  );
};

export default ModalTabs;
