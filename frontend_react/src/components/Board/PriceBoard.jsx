import React, { useState, useEffect, useContext } from "react";
import "./PriceBoard.scss";
import BoardHeader from "./BoardHeader";
import StockTable from "./StockTable";
import { toast } from "react-toastify";
import StockDetailModal from "../StockModal/StockDetailModal";
import { fetchStockDetail } from "../../services/marketApi";
import { SearchContext } from "../../context/SearchContext";

/**
 * PriceBoard - Bảng giá trung tâm
 * Kết hợp BoardHeader + StockTable + StockDetailPanel
 */
const PriceBoard = (props) => {
  const { searchTicker, clearSearch } = useContext(SearchContext);
  // State: mã cổ phiếu đang được click để hiển thị chi tiết
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("VN30"); // Nhóm đang chọn: VN30, HNX30, HOSE...
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Xử lý khi có yêu cầu tìm kiếm từ Nav (thông qua SearchContext)
  useEffect(() => {
    if (searchTicker) {
      const performSearch = async () => {
        const result = await fetchStockDetail(searchTicker);
        if (result && result.success && result.data && result.data.symbol && result.data.refPrice > 0) {
          // Bọc kết quả vào array để StockTable hiển thị
          setSearchResults([result.data]);
          setSelectedGroup("SEARCH"); // Đánh dấu đang ở chế độ tìm kiếm
          toast.success(`Đã tìm thấy mã ${searchTicker}`);
        } else {
          toast.error(`Không tìm thấy mã cổ phiếu: ${searchTicker}`);
          // Xóa kết quả cũ để tránh hiện row trống như trong ảnh
          setSearchResults(null);
        }
      };
      performSearch();
    }
  }, [searchTicker]);

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
      return;
    }

    setSelectedTicker(ticker);
  };

  const handleCloseDetail = () => {
    setSelectedTicker(null);
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
            clearSearch(); // Xóa mã tìm kiếm trong context
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
          onClose={handleCloseDetail} 
        />
      )}
    </div>
  );
};

export default PriceBoard;
