import React from "react";
import "./MainContent.scss";
import Sidebar from "../Layout/Sidebar";
import PriceBoard from "../Board/PriceBoard";

/**
 * MainContent - Khu vực chính bên dưới thanh MarketSummary
 * Layout: Sidebar (trái) + PriceBoard (giữa/phải)
 */
const MainContent = (props) => {
  return (
    <div className="main-content">
      {/* ===== Sidebar bên trái ===== */}
      <Sidebar />

      {/* ===== Bảng giá trung tâm ===== */}
      <div className="main-content__board">
        <PriceBoard 
          onUpdateGroupStats={props.onUpdateGroupStats}
        />
      </div>
    </div>
  );
};

export default MainContent;
