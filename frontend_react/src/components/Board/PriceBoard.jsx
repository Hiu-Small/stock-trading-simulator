import React, { useState } from "react";
import "./PriceBoard.scss";
import BoardHeader from "./BoardHeader";
import StockTable from "./StockTable";
import StockDetailPanel from "./StockDetailPanel";

/**
 * PriceBoard - Bảng giá trung tâm
 * Kết hợp BoardHeader + StockTable + StockDetailPanel
 */
const PriceBoard = () => {
  // State: mã cổ phiếu đang được click để hiển thị chi tiết
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("VN30"); // Nhóm đang chọn: VN30, HNX30, HOSE...

  const [stateStock, setStateStock] = useState({
    increase: 0,
    decrease: 0,
    ref: 0,
    ceiling: 0,
    floor: 0,
  });

  const handleRowClick = (ticker) => {
    // Toggle: click vào mã đang chọn thì đóng panel
    setSelectedTicker((prev) => (prev === ticker ? null : ticker));
  };

  const handleCloseDetail = () => {
    setSelectedTicker(null);
  };

  const handleUpdateStats = (newStats) => {
    setStateStock(newStats);
  };

  return (
    <div
      className={`price-board ${selectedTicker ? "price-board--detail-open" : ""}`}
    >
      {/* ===== Phần chính: BoardHeader + StockTable ===== */}
      <div className="price-board__main">
        <BoardHeader
          stateStock={stateStock}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
        />
        <StockTable
          selectedGroup={selectedGroup}
          selectedTicker={selectedTicker}
          onRowClick={handleRowClick}
          onUpdateStats={handleUpdateStats}
        />
      </div>

      {/* ===== Panel chi tiết cổ phiếu (hiện khi có ticker được chọn) ===== */}
      {selectedTicker && (
        <StockDetailPanel ticker={selectedTicker} onClose={handleCloseDetail} />
      )}
    </div>
  );
};

export default PriceBoard;
