import React, { useState, useEffect } from "react";
import "./HomePage.scss";
import Nav from "../Layout/Nav";
import MarketSummary from "../Market/MarketSummary";
import MainContent from "../Market/MainContent";
import { checkIsMarketOpen, getMarketStatus } from "../../utils/marketUtils";

const HomePage = () => {
  const [isMarketOpen, setIsMarketOpen] = useState(checkIsMarketOpen());
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  // Cập nhật trạng thái mỗi phút
  useEffect(() => {
    const timer = setInterval(() => {
      setIsMarketOpen(checkIsMarketOpen());
      setMarketStatus(getMarketStatus());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Navbar trên cùng */}
      <Nav isMarketOpen={isMarketOpen} marketStatus={marketStatus} />

      {/* Dải chỉ số thị trường */}
      <MarketSummary onStatusChange={setIsMarketOpen} />

      {/* Khu vực chính: Sidebar + PriceBoard */}
      <MainContent />
    </>
  );
};

export default HomePage;
