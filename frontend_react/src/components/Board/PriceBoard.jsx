import React, { useState, useEffect, useContext } from "react";
import "./PriceBoard.scss";
import BoardHeader from "./BoardHeader";
import StockTable from "./StockTable";
import ContextMenu from "./ContextMenu";
import { toast } from "react-toastify";
import StockDetailModal from "../StockModal/StockDetailModal";
import { fetchStockDetail } from "../../services/marketApi";
import { SearchContext } from "../../context/SearchContext";

/**
 * PriceBoard - Bảng giá trung tâm
 * Kết hợp BoardHeader + StockTable + StockDetailPanel
 * 
 * Props:
 *   selectedGroup     - Nhóm đang chọn (được quản lý bởi MainContent)
 *   onGroupChange     - Callback khi đổi nhóm
 *   searchResults     - Kết quả tìm kiếm (được quản lý bởi MainContent)
 *   onSearchResults   - Callback để set kết quả tìm kiếm
 *   onUpdateGroupStats - Callback cập nhật stats lên HomePage
 */
const PriceBoard = (props) => {
  const { searchTicker, clearSearch } = useContext(SearchContext);
  // State: mã cổ phiếu đang được click để hiển thị chi tiết
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [isOnlyOrder, setIsOnlyOrder] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, symbol }

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("iboard_visible_columns");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // Ignore
    }
    return {
      basic: true,
      highLow: true,
      totalVol: true,
      foreign: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem("iboard_visible_columns", JSON.stringify(visibleColumns));
    } catch (e) {
      // Ignore
    }
  }, [visibleColumns]);

  const handleToggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  // Lấy selectedGroup và searchResults từ props (được quản lý ở MainContent)
  const selectedGroup = props.selectedGroup || "VN30";
  const searchResults = props.searchResults || null;
  const isSpecialMode = props.isPortfolioMode || props.isFavoritesMode || !!props.isWatchlistMode || searchResults !== null;
  const headerSelectedGroup = isSpecialMode ? null : selectedGroup;

  // Xử lý khi có yêu cầu tìm kiếm từ Nav (thông qua SearchContext)
  useEffect(() => {
    if (searchTicker) {
      const performSearch = async () => {
        const result = await fetchStockDetail(searchTicker);
        if (result && result.success && result.data && result.data.symbol && result.data.refPrice > 0) {
          // Bọc kết quả vào array để StockTable hiển thị
          if (props.onSearchResults) props.onSearchResults([result.data]);
          // Không thay đổi selectedGroup - giữ lại nhóm hiện tại để khi clear về lại đúng nhóm
          toast.success(`Đã tìm thấy mã ${searchTicker}`);
        } else {
          toast.error(`Không tìm thấy mã cổ phiếu: ${searchTicker}`);
          if (props.onSearchResults) props.onSearchResults(null);
        }
      };
      performSearch();
    }
  }, [searchTicker]);

  // Lắng nghe sự kiện mở modal chỉ đặt lệnh từ Sidebar
  useEffect(() => {
    const handleOpenOrderModal = (e) => {
      const symbol = e.detail?.symbol || "ACB";
      setIsOnlyOrder(true);
      setSelectedTicker(symbol);
    };
    window.addEventListener("open-order-modal", handleOpenOrderModal);
    return () => window.removeEventListener("open-order-modal", handleOpenOrderModal);
  }, []);

  // Lắng nghe sự kiện mở modal chi tiết cổ phiếu từ ContextMenu
  useEffect(() => {
    const handleOpenStockDetail = (e) => {
      const symbol = e.detail?.symbol;
      setIsOnlyOrder(false);
      setSelectedTicker(symbol);
    };
    window.addEventListener("open-stock-detail", handleOpenStockDetail);
    return () => window.removeEventListener("open-stock-detail", handleOpenStockDetail);
  }, []);

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
    setIsOnlyOrder(false);
  };

  const handleContextMenu = (symbol, e) => {
    // Tính toán vị trí menu, tránh tràn màn hình
    const menuW = 200;
    const menuH = 160;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = e.clientX + menuW > vw ? e.clientX - menuW : e.clientX;
    const y = e.clientY + menuH > vh ? e.clientY - menuH : e.clientY;
    setContextMenu({ x, y, symbol });
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
          selectedGroup={headerSelectedGroup}
          onGroupChange={(group) => {
            if (props.onGroupChange) props.onGroupChange(group);
            if (props.onSearchResults) props.onSearchResults(null); // Khi chuyển nhóm thì xóa kết quả tìm kiếm
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
          visibleColumns={visibleColumns}
          onToggleColumn={handleToggleColumn}
        />
        <StockTable
          selectedGroup={selectedGroup}
          selectedTicker={selectedTicker}
          onRowClick={handleRowClick}
          onContextMenu={handleContextMenu}
          onUpdateStats={handleUpdateStats}
          showActiveOnly={showActiveOnly}
          stocks={searchResults}
          visibleColumns={visibleColumns}
        />
      </div>

      {/* ===== Modal chi tiết cổ phiếu ===== */}
      {selectedTicker && (
        <StockDetailModal 
          symbol={selectedTicker} 
          onlyOrder={isOnlyOrder}
          onClose={handleCloseDetail} 
          onChangeSymbol={(newSymbol) => setSelectedTicker(newSymbol)}
        />
      )}

      {/* Context menu chuột phải */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          symbol={contextMenu.symbol}
          isWatchlistMode={props.isWatchlistMode}
          onRemoveFromWatchlist={props.onRemoveFromWatchlist}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default PriceBoard;
