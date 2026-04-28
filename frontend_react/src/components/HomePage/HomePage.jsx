import React, { useState, useEffect } from "react";
import "./HomePage.scss";
import Nav from "../Layout/Nav";
import MarketSummary from "../Market/MarketSummary";
import MainContent from "../Market/MainContent";
import { getBoardData } from "../../services/marketApi";
import { checkIsMarketOpen, getMarketStatus, calculateMarketStats } from "../../utils/marketUtils";

const HomePage = () => {
  const [isMarketOpen, setIsMarketOpen] = useState(checkIsMarketOpen());
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [searchTicker, setSearchTicker] = useState(null);

  // Lưu trữ thống kê của các nhóm mã (Dùng để hiển thị lên IndexCard)
  const [marketStatsMap, setMarketStatsMap] = useState({
    HOSE: null,
    VN30: null,
    HNX: null,
    UPCOM: null,
  });

  // 1. Chạy định kỳ lấy dữ liệu của 4 nhóm chính để hiện thống kê lên IndexCard (Real-time)
  useEffect(() => {
    const initAllMarketStats = async () => {
      const groups = ["HOSE", "VN30", "HNX", "UPCOM"];
      
      try {
        const results = await Promise.all(
          groups.map(async (group) => {
            const result = await getBoardData(group);
            if (result && result.success && result.data) {
              const stats = calculateMarketStats(result.data);
              return { group, stats };
            }
            return { group, stats: null };
          })
        );

        const newStatsMap = { ...marketStatsMap };
        let hasChange = false;
        results.forEach(({ group, stats }) => {
          if (stats) {
            newStatsMap[group] = stats;
            hasChange = true;
          }
        });
        if (hasChange) setMarketStatsMap(newStatsMap);
      } catch (err) {
        console.error(`[HomePage] Lỗi cập nhật stats định kỳ:`, err);
      }
    };

    // Gọi lần đầu ngay khi load
    initAllMarketStats();

    // Thiết lập vòng lặp 15 giây (Real-time)
    const interval = setInterval(initAllMarketStats, 15000);

    return () => clearInterval(interval);
  }, []);

  // Cập nhật trạng thái mỗi phút
  useEffect(() => {
    const timer = setInterval(() => {
      setIsMarketOpen(checkIsMarketOpen());
      setMarketStatus(getMarketStatus());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (symbol) => {
    setSearchTicker(symbol);
  };

  // Cập nhật thống kê cho một nhóm cụ thể
  const handleUpdateGroupStats = (group, stats) => {
    setMarketStatsMap(prev => ({
      ...prev,
      [group]: stats
    }));
  };

  return (
    <>
      {/* Navbar trên cùng */}
      <Nav 
        isMarketOpen={isMarketOpen} 
        marketStatus={marketStatus} 
        onSearch={handleSearch}
      />

      {/* Dải chỉ số thị trường - Nhận dữ liệu thống kê từ Map */}
      <MarketSummary 
        onStatusChange={setIsMarketOpen} 
        marketStatsMap={marketStatsMap}
      />

      {/* Khu vực chính: Sidebar + PriceBoard - Truyền hàm cập nhật stats */}
      <MainContent 
        searchTicker={searchTicker} 
        onUpdateGroupStats={handleUpdateGroupStats}
      />
    </>
  );
};

export default HomePage;
