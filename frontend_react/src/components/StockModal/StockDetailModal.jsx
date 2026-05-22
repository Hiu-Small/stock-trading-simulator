import React, { useState, useEffect } from "react";
import "./StockDetailModal.scss";
import ModalHeader from "./Layout/ModalHeader";
import ModalTabs from "./Layout/ModalTabs";
import TabContentGiaoDich from "./TabGiaoDich/TabContent";
import TabHoSoContent from "./TabHoSo/TabHoSoContent";
import TabCoDongContent from "./TabCoDong/TabCoDongContent";
import TabLichSuKienContent from "./TabLichSuKien/TabLichSuKienContent";
import OrderEntry from "./TabGiaoDich/OrderEntry";
import { fetchStockDetail, fetchMatchingDetail } from "../../services/marketApi";

const StockDetailModal = (props) => {
  const [activeTab, setActiveTab] = useState("Giao dịch");
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChangingSymbol, setIsChangingSymbol] = useState(false);
  const [isOrderActive, setIsOrderActive] = useState(props.onlyOrder || false);

  // Đồng bộ trạng thái đặt lệnh khi nhận prop onlyOrder
  useEffect(() => {
    if (props.onlyOrder) {
      setIsOrderActive(true);
      setActiveTab("Giao dịch");
    }
  }, [props.onlyOrder]);

  // Cơ chế Real-time: Tự động cập nhật dữ liệu mã này mỗi 10 giây
  useEffect(() => {
    const refreshData = async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
        setIsChangingSymbol(true);
      }
      try {
        // Gọi song song cả Detail (snapshot) và Intraday (lịch sử khớp lệnh)
        const [detailRes, matchingRes] = await Promise.all([
          fetchStockDetail(props.symbol),
          fetchMatchingDetail(props.symbol),
        ]);

        if (detailRes && detailRes.success && detailRes.data) {
          const combinedData = { ...detailRes.data };

          // Nếu có dữ liệu khớp lệnh mới nhất, cập nhật vào snapshot để Header đồng bộ
          if (
            matchingRes &&
            matchingRes.success &&
            matchingRes.match &&
            matchingRes.match.length > 0
          ) {
            const latestMatch = matchingRes.match[0];
            // Đồng bộ giá: API history trả về 23.5, snapshot cần 23500
            combinedData.matchPrice = latestMatch.price * 1000;
            // Lưu luôn history và stats vào stockData để các con dùng chung, không cần gọi lại
            combinedData.matchHistory = matchingRes.match;
            combinedData.matchStats = matchingRes.stats;
          }

          setStockData(combinedData);
        }
      } catch (err) {
        console.error(
          `[StockDetailModal] Lỗi refresh dữ liệu ${props.symbol}:`,
          err,
        );
      } finally {
        if (isInitial) {
          setLoading(false);
          setIsChangingSymbol(false);
        }
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
        className={`stock-modal-content ${props.onlyOrder ? "stock-modal-content--only-order" : ""}`}
        onClick={(e) => e.stopPropagation()} 
      >
        {loading && !stockData ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu {props.symbol}...</p>
          </div>
        ) : (
          <>
            <ModalHeader 
              symbol={props.symbol} 
              data={stockData} 
              onClose={props.onClose} 
              isOrderActive={isOrderActive}
              setIsOrderActive={setIsOrderActive}
              onlyOrder={props.onlyOrder}
              onChangeSymbol={props.onChangeSymbol}
              isLoading={isChangingSymbol}
            />
            
            {!props.onlyOrder && <ModalTabs activeTab={activeTab} onChangeTab={setActiveTab} />}
            
            <div className={`stock-modal-body ${isChangingSymbol ? "stock-modal-body--loading" : ""}`}>
              {isChangingSymbol && (
                <div className="body-loading-overlay">
                  <div className="spinner"></div>
                  <p>Đang tải dữ liệu {props.symbol}...</p>
                </div>
              )}
              {props.onlyOrder ? (
                <div className="stock-modal-body__only-order">
                  <OrderEntry 
                    symbol={props.symbol} 
                    data={stockData} 
                    defaultSide={props.defaultSide} 
                    targetUser={props.targetUser}
                    isAdmin={props.isAdmin}
                    onSuccess={props.onSuccess}
                    onClose={props.onClose}
                  />
                </div>
              ) : (
                <>
                  {activeTab === "Giao dịch" && stockData && (
                    <TabContentGiaoDich 
                      symbol={props.symbol} 
                      data={stockData} 
                      isOrderActive={isOrderActive} 
                      targetUser={props.targetUser}
                      isAdmin={props.isAdmin}
                      onSuccess={props.onSuccess}
                      onClose={props.onClose}
                    />
                  )}
                  {activeTab === "Hồ sơ" && (
                    <TabHoSoContent symbol={props.symbol} data={stockData} />
                  )}
                  {activeTab === "Cổ đông" && (
                    <TabCoDongContent symbol={props.symbol} />
                  )}
                  {activeTab === "Lịch sự kiện" && (
                    <TabLichSuKienContent symbol={props.symbol} />
                  )}
                  {activeTab !== "Giao dịch" && activeTab !== "Hồ sơ" && activeTab !== "Cổ đông" && activeTab !== "Lịch sự kiện" && (
                    <div className="empty-tab">Tính năng đang được phát triển...</div>
                  )}
                </>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
};

export default StockDetailModal;
