import React, { useState, useEffect } from "react";
import "./PriceBoard.scss";
import BoardHeader from "./BoardHeader";
import StockTable from "./StockTable";
import { toast } from "react-toastify";
import StockDetailModal from "../StockModal/StockDetailModal";
import { fetchStockDetail } from "../../services/marketApi";

/**
 * PriceBoard - Bảng giá trung tâm
 * Kết hợp BoardHeader + StockTable + StockDetailPanel
 */
const PriceBoard = (props) => {
  // State: mã cổ phiếu đang được click để hiển thị chi tiết
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedStockData, setSelectedStockData] = useState(null);
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

  const handleRowClick = async (ticker) => {
    // Nếu click mã đang chọn thì đóng
    if (selectedTicker === ticker) {
      setSelectedTicker(null);
      setSelectedStockData(null);
      return;
    }

    setSelectedTicker(ticker);
    // Gọi API lấy chi tiết ngay lập tức
    try {
      const result = await fetchStockDetail(ticker);
      if (result && result.success) {
        setSelectedStockData(result.data);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết cổ phiếu:", error);
    }
  };

  const handleCloseDetail = () => {
    setSelectedTicker(null);
    setSelectedStockData(null);
  };

  const handleUpdateStats = (newStats) => {
    setStateStock(newStats);
    // Đẩy thống kê lên HomePage để đồng bộ với MarketSummary
    if (props.onUpdateGroupStats) {
      props.onUpdateGroupStats(selectedGroup, newStats);
    }
  };

  return (
    <div className="price-board">
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

      {/* ===== Modal chi tiết cổ phiếu ===== */}
      {selectedTicker && (
        <StockDetailModal 
          symbol={selectedTicker} 
          data={selectedStockData} 
          onClose={handleCloseDetail} 
        />
      )}
    </div>
  );
};

export default PriceBoard;
