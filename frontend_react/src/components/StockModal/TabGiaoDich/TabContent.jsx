import React from "react";
import "./TabContent.scss";
import TradingViewChart from "./TradingViewChart";
import OrderBookTable from "./OrderBookTable";
import MarketDepthChart from "./MarketDepthChart";
import MatchHistoryLog from "./MatchHistoryLog";
import OrderEntry from "./OrderEntry";

const TabContentGiaoDich = (props) => {
  return (
    <div className="tab-content-giaodich">
      {/* Nửa trái: Biểu đồ */}
      <div className="left-panel">
        <TradingViewChart symbol={props.symbol} data={props.data} />
      </div>

      {/* Nửa phải: Dữ liệu (Sổ lệnh, Độ sâu, Lịch sử khớp) */}
      <div className="right-panel">
        <div className="right-panel-column">
          <div className="right-top-section">
            <OrderBookTable symbol={props.symbol} data={props.data} />
          </div>
          <div className="right-middle-section">
            <MarketDepthChart symbol={props.symbol} data={props.data} />
          </div>
        </div>

        <div className="right-panel-column history-column">
          {props.isOrderActive ? (
            <OrderEntry symbol={props.symbol} data={props.data} />
          ) : (
            <MatchHistoryLog symbol={props.symbol} data={props.data} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TabContentGiaoDich;
