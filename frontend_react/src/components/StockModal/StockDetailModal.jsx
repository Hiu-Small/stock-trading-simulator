import React, { useState, useEffect } from "react";
import "./StockDetailModal.scss";
import ModalHeader from "./Layout/ModalHeader";
import ModalTabs from "./Layout/ModalTabs";
import TabContentGiaoDich from "./TabGiaoDich/TabContent";
import { fetchStockDetail } from "../../services/marketApi";

const StockDetailModal = (props) => {
  const [activeTab, setActiveTab] = useState("Giao dịch");
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cơ chế Real-time: Tự động cập nhật dữ liệu mã này mỗi 10 giây
  useEffect(() => {
    const refreshData = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const result = await fetchStockDetail(props.symbol);
        if (result && result.success && result.data) {
          setStockData(result.data);
        }
      } catch (err) {
        console.error(`[StockDetailModal] Lỗi refresh dữ liệu ${props.symbol}:`, err);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    // Gọi lần đầu
    refreshData(true);

    const interval = setInterval(() => refreshData(false), 10000);
    return () => clearInterval(interval);
  }, [props.symbol]);

  if (!props.symbol) return null;

  return (
    <div className="stock-modal-overlay" onClick={props.onClose}>
      <div 
        className="stock-modal-content" 
        onClick={(e) => e.stopPropagation()} 
      >
        {loading && !stockData ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu {props.symbol}...</p>
          </div>
        ) : (
          <>
            <ModalHeader symbol={props.symbol} data={stockData} onClose={props.onClose} />
            
            <ModalTabs activeTab={activeTab} onChangeTab={setActiveTab} />
            
            <div className="stock-modal-body">
              {activeTab === "Giao dịch" && stockData && (
                <TabContentGiaoDich symbol={props.symbol} data={stockData} />
              )}
              {activeTab !== "Giao dịch" && (
                <div className="empty-tab">Tính năng đang được phát triển...</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockDetailModal;
