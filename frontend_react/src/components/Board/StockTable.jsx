import React, { useState, useEffect } from "react";
import "./StockTable.scss";
import StockRow from "./StockRow";
import { getBoardData } from "../../services/marketApi";
import { checkIsMarketOpen, calculateMarketStats } from "../../utils/marketUtils";
import { useTranslation } from "../../context/LanguageContext";

// Dữ liệu mẫu để hiển thị cấu trúc bảng
const mockStocks = [
  {
    symbol: "ACB",
    companyName: "Banking",
    ceiling: 26.2,
    ref: 24.2,
    floor: 22.8,
    bid3Price: 24.0,
    bid3Vol: "2.33M",
    bid2Price: 24.1,
    bid2Vol: "1.23K",
    bid1Price: 24.1,
    bid1Vol: "3.46K",
    matchPrice: 24.2,
    matchVol: "3.46K",
    matchChange: -0.3,
    matchChangePercent: -1.22,
    ask1Price: 24.3,
    ask1Vol: "456.0K",
    ask2Price: 24.5,
    ask2Vol: "899.0K",
    ask3Price: 24.5,
    ask3Vol: "756.7K",
    totalVol: "12.35M",
    foreignBuy: "898.8K",
    foreignSell: "1.23M",
  },
  {
    symbol: "BID",
    companyName: "Banking",
    ceiling: 45.8,
    ref: 42.8,
    floor: 39.8,
    bid3Price: 43.3,
    bid3Vol: "778.0K",
    bid2Price: 43.4,
    bid2Vol: "734.5K",
    bid1Price: 43.5,
    bid1Vol: "107.1K",
    matchPrice: 43.5,
    matchVol: "708.2K",
    matchChange: +0.7,
    matchChangePercent: +1.64,
    ask1Price: 43.6,
    ask1Vol: "456.7K",
    ask2Price: 43.8,
    ask2Vol: "749.2K",
    ask3Price: 43.8,
    ask3Vol: "234.5K",
    totalVol: "2.35M",
    foreignBuy: "678.9K",
    foreignSell: "234.5K",
  },
  {
    symbol: "CTG",
    companyName: "Banking",
    ceiling: 36.9,
    ref: 34.5,
    floor: 32.1,
    bid3Price: 33.9,
    bid3Vol: "651.0K",
    bid2Price: 34.0,
    bid2Vol: "778.8K",
    bid1Price: 34.0,
    bid1Vol: "107.7K",
    matchPrice: 34.1,
    matchVol: "523.5K",
    matchChange: -0.4,
    matchChangePercent: -1.16,
    ask1Price: 34.2,
    ask1Vol: "749.0K",
    ask2Price: 34.3,
    ask2Vol: "741.2K",
    ask3Price: 34.4,
    ask3Vol: "234.0K",
    totalVol: "5.68M",
    foreignBuy: "234.5K",
    foreignSell: "567.8K",
  },
  {
    symbol: "FPT",
    companyName: "Technology",
    ceiling: 141.8,
    ref: 132.5,
    floor: 123.2,
    bid3Price: 135.0,
    bid3Vol: "351.0K",
    bid2Price: 135.1,
    bid2Vol: "234.5K",
    bid1Price: 135.2,
    bid1Vol: "234.5K",
    matchPrice: 135.2,
    matchVol: "135.4K",
    matchChange: +2.7,
    matchChangePercent: +2.04,
    ask1Price: 135.3,
    ask1Vol: "987.6K",
    ask2Price: 135.4,
    ask2Vol: "456.7K",
    ask3Price: 135.5,
    ask3Vol: "89.6K",
    totalVol: "987.6K",
    foreignBuy: "456.7K",
    foreignSell: "89.6K",
  },
];

/**
 * StockTable - Cấu trúc bảng HTML cho bảng giá
 * Nhận dữ liệu từ props
 */
const StockTable = (props) => {
  const [displayStocks, setDisplayStocks] = useState(mockStocks);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [marketOpen, setMarketOpen] = useState(checkIsMarketOpen());
  const [sortOrder, setSortOrder] = useState("asc");

  const visibleColumns = props.visibleColumns || {
    basic: true,
    highLow: true,
    totalVol: true,
    foreign: true,
  };

  const fetchBoard = async () => {
    setLoading(true);
    // Sử dụng props.selectedGroup thay vì hard-code "VN30"
    const result = await getBoardData(props.selectedGroup || "VN30");

    if (result && result.success) {
      if (result.data && result.data.length > 0) {
        setDisplayStocks(result.data);
      }
      // Tự xác định trạng thái thị trường
      setMarketOpen(checkIsMarketOpen());
    }
    setLoading(false);
  };

  // 2. Đồng bộ dữ liệu khi props.stocks thay đổi (Dùng cho Tìm kiếm)
  useEffect(() => {
    if (props.stocks) {
      setDisplayStocks(props.stocks);
    }
  }, [props.stocks]);

  // 3. Gọi API trong useEffect
  useEffect(() => {
    // Nếu cha đã truyền props.stocks xuống thì khỏi gọi API
    if (props.stocks) return;

    fetchBoard();

    // Chỉ set interval nếu thị trường đang mở
    let interval;
    if (marketOpen) {
      // Refresh mỗi 30 giây trong giờ giao dịch
      interval = setInterval(fetchBoard, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [props.stocks, props.selectedGroup, marketOpen]); // Thêm marketOpen vào dependency array

  useEffect(() => {
    const stats = calculateMarketStats(displayStocks);
    
    // 2. SAU KHI ĐẾM XONG, GỌI HÀM CỦA CHA ĐỂ ĐẨY DỮ LIỆU LÊN!
    if (props.onUpdateStats) {
      props.onUpdateStats({
        increase: stats.increase,
        decrease: stats.decrease,
        ref: stats.ref,
        ceiling: stats.ceiling,
        floor: stats.floor,
      });
    }
  }, [displayStocks]); // Chạy lại hàm này mỗi khi danh sách cổ phiếu cập nhật

  const handleSortSymbol = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);

    const sortedData = [...displayStocks].sort((a, b) => {
      if (newOrder === "asc") {
        return a.symbol.localeCompare(b.symbol);
      } else {
        return b.symbol.localeCompare(a.symbol);
      }
    });

    setDisplayStocks(sortedData);
  };

  return (
    <div className="stock-table-wrapper">
      {/* Hiệu ứng Loading Overlay */}
      {loading && (
        <div className="stock-table-loading">
          <div className="spinner"></div>
          <span>{t("board.loading")}</span>
        </div>
      )}

      <div className="stock-table-scroll-area">
        <table className={`stock-table ${loading ? "stock-table--loading" : ""}`}>
          <thead className="stock-table__head">
            <tr>
              {/* Cột cơ bản */}
              <th
                className="th-ticker"
                rowSpan={2}
                onClick={() => handleSortSymbol()}
                style={{ cursor: "pointer" }}
              >
                {t("board.ticker")}{" "}
                <span className="sort-icon">
                  {sortOrder === "asc" ? "↑" : "↓"}
                </span>
              </th>
              {visibleColumns.basic && (
                <>
                  <th className="th-price th-ref" rowSpan={2}>
                    {t("board.ref")}
                  </th>
                  <th className="th-price th-ceiling" rowSpan={2}>
                    {t("board.ceil")}
                  </th>
                  <th className="th-price th-floor" rowSpan={2}>
                    {t("board.floor")}
                  </th>
                </>
              )}

              {/* BID group */}
              <th className="th-group th-bid" colSpan={3}>
                {t("board.bid")}
              </th>

              {/* MATCH group */}
              <th className="th-group th-match" colSpan={3}>
                {t("board.match")}
              </th>

              {/* ASK group */}
              <th className="th-group th-ask" colSpan={3}>
                {t("board.ask")}
              </th>

              {/* Tổng KL */}
              {visibleColumns.totalVol && (
                <th className="th-total-vol" rowSpan={2}>
                  {t("board.totalVol")}
                </th>
              )}

              {/* CAO / THẤP*/}
              {visibleColumns.highLow && (
                <>
                  <th className="th-price" rowSpan={2}>
                    {t("board.high")}
                  </th>
                  <th className="th-price" rowSpan={2}>
                    {t("board.low")}
                  </th>
                </>
              )}

              {/* FOREIGN */}
              {visibleColumns.foreign && (
                <th className="th-group th-foreign" colSpan={3}>
                  {t("board.foreign")}
                </th>
              )}
            </tr>

            {/* Hàng thứ 2 của header */}
            <tr>
              {/* BID sub-headers */}
              <th className="th-sub th-bid">{t("lang") === "vi" ? "Giá 3 / KL 3" : "Price 3 / Vol 3"}</th>
              <th className="th-sub th-bid">{t("lang") === "vi" ? "Giá 2 / KL 2" : "Price 2 / Vol 2"}</th>
              <th className="th-sub th-bid">{t("lang") === "vi" ? "Giá 1 / KL 1" : "Price 1 / Vol 1"}</th>

              {/* MATCH sub-headers */}
              <th className="th-sub th-match">{t("lang") === "vi" ? "Giá / KL" : "Price / Vol"}</th>
              <th className="th-sub th-match">+/-</th>
              <th className="th-sub th-match">+/- (%)</th>

              {/* ASK sub-headers */}
              <th className="th-sub th-ask">{t("lang") === "vi" ? "Giá 1 / KL 1" : "Price 1 / Vol 1"}</th>
              <th className="th-sub th-ask">{t("lang") === "vi" ? "Giá 2 / KL 2" : "Price 2 / Vol 2"}</th>
              <th className="th-sub th-ask">{t("lang") === "vi" ? "Giá 3 / KL 3" : "Price 3 / Vol 3"}</th>

              {/* FOREIGN sub-headers */}
              {visibleColumns.foreign && (
                <>
                  <th className="th-sub th-foreign">{t("board.buy")}</th>
                  <th className="th-sub th-foreign">{t("board.sell")}</th>
                  <th className="th-sub th-foreign">{t("board.room")}</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="stock-table__body">
            {displayStocks
              .filter((stock) => {
                if (props.showActiveOnly) {
                  return (stock.totalVolume || 0) > 0;
                }
                return true;
              })
              .map((stock, index) => (
                <StockRow
                  key={stock.symbol || index}
                  stock={stock}
                  onRowClick={props.onRowClick}
                  onContextMenu={props.onContextMenu}
                  isSelected={props.selectedTicker === stock.symbol}
                  visibleColumns={visibleColumns}
                />
              ))}
          </tbody>
        </table>

        {/* Footer tổng số mã */}
        <div className="stock-table__footer">
          {props.showActiveOnly ? (
            <span>
              {t("board.showingStocks", { 
                activeCount: displayStocks.filter((s) => (s.totalVolume || 0) > 0).length, 
                totalCount: displayStocks.length 
              })}
            </span>
          ) : (
            <span>
              {t("board.showingStocksAll", { 
                totalCount: displayStocks.length 
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockTable;
