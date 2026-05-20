import React, { useState, useContext } from "react";
import "./MainContent.scss";
import Sidebar from "../Layout/Sidebar";
import PriceBoard from "../Board/PriceBoard";
import { SearchContext } from "../../context/SearchContext";
import { getMyHoldings } from "../../services/orderService";
import { fetchStockDetail } from "../../services/marketApi";
import { toast } from "react-toastify";
import { UserContext } from "../../context/UserContext";

/**
 * MainContent - Khu vực chính bên dưới thanh MarketSummary
 * Layout: Sidebar (trái) + PriceBoard (giữa/phải)
 * selectedGroup được lift lên đây để Sidebar và PriceBoard chia sẻ state
 */
const MainContent = (props) => {
  const { clearSearch } = useContext(SearchContext);
  const { user, setShowLoginModal } = useContext(UserContext);
  const [selectedGroup, setSelectedGroup] = useState("VN30");
  const [searchResults, setSearchResults] = useState(null);
  const [isPortfolioMode, setIsPortfolioMode] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const handleGroupChange = (group) => {
    setSelectedGroup(group);
    setSearchResults(null);
    setIsPortfolioMode(false);
    clearSearch();
  };

  const handlePortfolioClick = async () => {
    if (!user?.isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setPortfolioLoading(true);
    try {
      const res = await getMyHoldings();
      if (res && res.EC === 0 && Array.isArray(res.DT) && res.DT.length > 0) {
        // Fetch market data song song cho từng symbol trong holdings
        const symbols = res.DT.map(h => h.stock?.symbol).filter(Boolean);
        const stockDataArr = await Promise.all(
          symbols.map(sym => fetchStockDetail(sym))
        );
        const validStocks = stockDataArr
          .filter(r => r && r.success && r.data)
          .map(r => r.data);
        if (validStocks.length > 0) {
          setSearchResults(validStocks);
          setIsPortfolioMode(true);
          clearSearch();
          toast.success(`Danh mục của bạn: ${validStocks.length} mã cổ phiếu`);
        } else {
          toast.info("Không lấy được dữ liệu thị trường cho danh mục của bạn");
        }
      } else if (res && res.EC === 0 && Array.isArray(res.DT) && res.DT.length === 0) {
        toast.info("Danh mục của bạn đang trống. Hãy mua cổ phiếu để bắt đầu!");
      } else {
        toast.error("Không thể tải danh mục. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("[MainContent] handlePortfolioClick error:", err);
      toast.error("Lỗi khi tải danh mục cổ phiếu.");
    } finally {
      setPortfolioLoading(false);
    }
  };

  return (
    <div className="main-content">
      {/* ===== Sidebar bên trái ===== */}
      <Sidebar
        selectedGroup={selectedGroup}
        isSearchMode={!!searchResults && !isPortfolioMode}
        isPortfolioMode={isPortfolioMode}
        portfolioLoading={portfolioLoading}
        onAllStocksClick={() => {
          setSearchResults(null);
          setIsPortfolioMode(false);
          clearSearch();
        }}
        onPortfolioClick={handlePortfolioClick}
      />

      {/* ===== Bảng giá trung tâm ===== */}
      <div className="main-content__board">
        <PriceBoard
          onUpdateGroupStats={props.onUpdateGroupStats}
          selectedGroup={selectedGroup}
          onGroupChange={handleGroupChange}
          searchResults={searchResults}
          onSearchResults={(r) => { setSearchResults(r); setIsPortfolioMode(false); }}
        />
      </div>
    </div>
  );
};

export default MainContent;
