import React, { useState, useEffect } from "react";
import "./PriceBoard.scss";
import BoardHeader from "./BoardHeader";
import StockTable from "./StockTable";
import StockDetailPanel from "./StockDetailPanel";
import { toast } from "react-toastify";
import { fetchStockDetail } from "../../services/marketApi";

/**
 * PriceBoard - Bảng giá trung tâm
 * Kết hợp BoardHeader + StockTable + StockDetailPanel
 */
const PriceBoard = (props) => {
  // State: mã cổ phiếu đang được click để hiển thị chi tiết
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("VN30"); // Nhóm đang chọn: VN30, HNX30, HOSE...
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Xử lý khi có yêu cầu tìm kiếm từ Nav (thông qua props)
  useEffect(() => {
    if (props.searchTicker) {
      const performSearch = async () => {
        const result = await fetchStockDetail(props.searchTicker);
        if (result && result.success && result.data) {
          // Bọc kết quả vào array để StockTable hiển thị
          setSearchResults([result.data]);
          setSelectedGroup("SEARCH"); // Đánh dấu đang ở chế độ tìm kiếm
          toast.success(`Đã tìm thấy mã ${props.searchTicker}`);
        } else {
          toast.error(`Không tìm thấy mã cổ phiếu: ${props.searchTicker}`);
        }
      };
      performSearch();
    }
  }, [props.searchTicker]);

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
          onGroupChange={(group) => {
            setSelectedGroup(group);
            setSearchResults(null); // Khi chuyển nhóm thì xóa kết quả tìm kiếm
          }}
          showActiveOnly={showActiveOnly}
          onToggleActiveOnly={() => {
            const newState = !showActiveOnly;
            setShowActiveOnly(newState);
            if (newState) {
              toast.success("Đã lọc danh sách cổ phiếu có giao dịch");
            } else {
              toast.info("Đã hiển thị tất cả cổ phiếu");
            }
          }}
        />
        <StockTable
          selectedGroup={selectedGroup}
          selectedTicker={selectedTicker}
          onRowClick={handleRowClick}
          onUpdateStats={handleUpdateStats}
          showActiveOnly={showActiveOnly}
          stocks={searchResults} // Truyền kết quả tìm kiếm xuống
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
