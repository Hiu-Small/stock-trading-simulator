import React, { useState, useContext, useEffect } from "react";
import "./MainContent.scss";
import Sidebar from "../Layout/Sidebar";
import PriceBoard from "../Board/PriceBoard";
import { SearchContext } from "../../context/SearchContext";
import { getMyHoldings } from "../../services/orderService";
import { fetchStockDetail } from "../../services/marketApi";
import { toast } from "react-toastify";
import { UserContext } from "../../context/UserContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useWatchlists } from "../../context/WatchlistsContext";
import { useTranslation } from "../../context/LanguageContext";

/**
 * MainContent - Khu vực chính bên dưới thanh MarketSummary
 * Layout: Sidebar (trái) + PriceBoard (giữa/phải)
 * selectedGroup được lift lên đây để Sidebar và PriceBoard chia sẻ state
 */
const MainContent = (props) => {
  const { clearSearch } = useContext(SearchContext);
  const { user, setShowLoginModal } = useContext(UserContext);
  const { favorites } = useFavorites();
  const { watchlists, customNames, getWatchlist, removeStockFromWatchlist } = useWatchlists();
  const { t } = useTranslation();
  const [selectedGroup, setSelectedGroup] = useState("VN30");
  const [searchResults, setSearchResults] = useState(null);
  const [isPortfolioMode, setIsPortfolioMode] = useState(false);
  const [isFavoritesMode, setIsFavoritesMode] = useState(false);
  const [isWatchlistMode, setIsWatchlistMode] = useState(null); // banking, technology, realEstate, energy
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(null); // banking, technology, realEstate, energy or null
  const [portfolioCount, setPortfolioCount] = useState(0);

  // Tự động tải lại bảng giá khi danh mục thay đổi (thêm/bớt cổ phiếu)
  useEffect(() => {
    if (isWatchlistMode) {
      const symbols = getWatchlist(isWatchlistMode);
      if (symbols.length === 0) {
        setSearchResults([]);
        return;
      }
      const reloadWatchlist = async () => {
        const stockDataArr = await Promise.all(symbols.map(sym => fetchStockDetail(sym)));
        const validStocks = stockDataArr.filter(r => r && r.success && r.data).map(r => r.data);
        setSearchResults(validStocks);
      };
      reloadWatchlist();
    }
  }, [watchlists, isWatchlistMode, getWatchlist]);

  // Tự động lấy số lượng cổ phiếu trong danh mục My Portfolio khi người dùng đăng nhập
  useEffect(() => {
    if (user?.isAuthenticated) {
      const fetchCount = async () => {
        try {
          const res = await getMyHoldings();
          if (res && res.EC === 0 && Array.isArray(res.DT)) {
            setPortfolioCount(res.DT.length);
          } else {
            setPortfolioCount(0);
          }
        } catch (e) {
          console.error("[MainContent] fetchCount error:", e);
          setPortfolioCount(0);
        }
      };
      fetchCount();
    } else {
      setPortfolioCount(0);
    }
  }, [user]);

  const handleGroupChange = (group) => {
    setSelectedGroup(group);
    setSearchResults(null);
    setIsPortfolioMode(false);
    setIsFavoritesMode(false);
    setIsWatchlistMode(null);
    clearSearch();
  };

  const handleWatchlistClick = async (groupKey) => {
    setWatchlistLoading(groupKey);
    try {
      const symbols = getWatchlist(groupKey);
      if (symbols.length === 0) {
        setSearchResults([]);
        setIsWatchlistMode(groupKey);
        setIsFavoritesMode(false);
        setIsPortfolioMode(false);
        clearSearch();
        toast.info(t("sidebar.watchlistEmpty"));
        return;
      }
      const stockDataArr = await Promise.all(symbols.map(sym => fetchStockDetail(sym)));
      const validStocks = stockDataArr.filter(r => r && r.success && r.data).map(r => r.data);
      setSearchResults(validStocks);
      setIsWatchlistMode(groupKey);
      setIsFavoritesMode(false);
      setIsPortfolioMode(false);
      clearSearch();

      const groupName = customNames[groupKey] || t(`sidebar.${groupKey}`);
      toast.success(
        t("sidebar.watchlistTitle")
          .replace("{group}", groupName)
          .replace("{count}", validStocks.length)
      );
    } catch (err) {
      console.error("[MainContent] handleWatchlistClick error:", err);
      toast.error(t("sidebar.watchlistError"));
    } finally {
      setWatchlistLoading(null);
    }
  };

  const handleFavoritesClick = async () => {
    if (!user?.isAuthenticated) {
      setShowLoginModal(true);
      toast.warning(t("sidebar.favoritesLoginWarning"));
      return;
    }
    if (favorites.length === 0) {
      toast.info(t("sidebar.favoritesEmptyWarning"));
      return;
    }
    const stockDataArr = await Promise.all(favorites.map(sym => fetchStockDetail(sym)));
    const validStocks = stockDataArr.filter(r => r && r.success && r.data).map(r => r.data);
    if (validStocks.length > 0) {
      setSearchResults(validStocks);
      setIsFavoritesMode(true);
      setIsPortfolioMode(false);
      setIsWatchlistMode(null);
      clearSearch();
      toast.success(t("sidebar.favoritesListDesc").replace("{count}", validStocks.length));
    }
  };

  const handleFavoriteTickerClick = async (symbol) => {
    if (!user?.isAuthenticated) {
      setShowLoginModal(true);
      toast.warning(t("sidebar.favoritesLoginWarning"));
      return;
    }
    const result = await fetchStockDetail(symbol);
    if (result && result.success && result.data) {
      setSearchResults([result.data]);
      setIsFavoritesMode(false);
      setIsPortfolioMode(false);
      setIsWatchlistMode(null);
      clearSearch();
    }
  };

  const handlePortfolioClick = async () => {
    if (!user?.isAuthenticated) {
      setShowLoginModal(true);
      toast.warning(t("sidebar.myPortfolioLoginWarning"));
      return;
    }
    setPortfolioLoading(true);
    try {
      const res = await getMyHoldings();
      if (res && res.EC === 0 && Array.isArray(res.DT)) {
        setPortfolioCount(res.DT.length);
        if (res.DT.length > 0) {
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
            setIsFavoritesMode(false);
            setIsWatchlistMode(null);
            clearSearch();
            toast.success(
              t("sidebar.myPortfolioTitle").replace("{count}", validStocks.length)
            );
          } else {
            toast.info(t("sidebar.myPortfolioMarketDataError"));
          }
        } else {
          toast.info(t("sidebar.myPortfolioEmpty"));
        }
      } else {
        toast.error(t("sidebar.myPortfolioLoadError"));
      }
    } catch (err) {
      console.error("[MainContent] handlePortfolioClick error:", err);
      toast.error(t("sidebar.myPortfolioSystemError"));
    } finally {
      setPortfolioLoading(false);
    }
  };

  return (
    <div className="main-content">
      {/* ===== Sidebar bên trái ===== */}
      <Sidebar
        selectedGroup={selectedGroup}
        isSearchMode={!!searchResults && !isPortfolioMode && !isFavoritesMode && !isWatchlistMode}
        isPortfolioMode={isPortfolioMode}
        isFavoritesMode={isFavoritesMode}
        isWatchlistMode={isWatchlistMode}
        portfolioLoading={portfolioLoading}
        watchlistLoading={watchlistLoading}
        portfolioCount={portfolioCount}
        onAllStocksClick={() => {
          setSearchResults(null);
          setIsPortfolioMode(false);
          setIsFavoritesMode(false);
          setIsWatchlistMode(null);
          clearSearch();
        }}
        onPortfolioClick={handlePortfolioClick}
        onFavoritesClick={handleFavoritesClick}
        onFavoriteTickerClick={handleFavoriteTickerClick}
        onWatchlistClick={handleWatchlistClick}
      />

      {/* ===== Bảng giá trung tâm ===== */}
      <div className="main-content__board">
        <PriceBoard
          onUpdateGroupStats={props.onUpdateGroupStats}
          selectedGroup={selectedGroup}
          onGroupChange={handleGroupChange}
          searchResults={searchResults}
          isPortfolioMode={isPortfolioMode}
          isFavoritesMode={isFavoritesMode}
          isWatchlistMode={isWatchlistMode}
          onRemoveFromWatchlist={removeStockFromWatchlist}
          onSearchResults={(r) => { 
            setSearchResults(r); 
            setIsPortfolioMode(false); 
            setIsWatchlistMode(null); 
          }}
        />
      </div>
    </div>
  );
};

export default MainContent;
