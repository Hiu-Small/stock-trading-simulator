import React, { useContext, useState, useEffect, useRef } from "react";
import "./ModalHeader.scss";
import "../../../assets/styles/global.scss";
import { UserContext } from "../../../context/UserContext";
import { fetchStockDetail } from "../../../services/marketApi";
import useAllStocks from "../../../hooks/useAllStocks";
import { toast } from "react-toastify";

const ModalHeader = (props) => {
  const { user, setShowLoginModal } = useContext(UserContext);
  const [isSearching, setIsSearching] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const { allStocks, loading: stocksLoading } = useAllStocks();
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);

  // Tự động focus ô tìm kiếm khi mở
  useEffect(() => {
    if (isSearching && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearching]);

  const handleInputChange = (val) => {
    const cleanVal = val.toUpperCase();
    setSearchVal(cleanVal);

    if (!cleanVal) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const filtered = allStocks.filter(stock => 
      stock.symbol.toUpperCase().includes(cleanVal) || 
      (stock.companyName && stock.companyName.toUpperCase().includes(cleanVal))
    ).slice(0, 7);

    setSuggestions(filtered);
    setActiveIndex(-1);
  };

  const prevLoading = useRef(false);

  // Khi props.isLoading chuyển từ true -> false, tức là dữ liệu mã mới đã load xong
  useEffect(() => {
    if (prevLoading.current && !props.isLoading) {
      setIsSearching(false);
      setSearchVal("");
      setSuggestions([]);
    }
    prevLoading.current = props.isLoading;
  }, [props.isLoading]);

  const handleSelectStock = (symbol) => {
    if (props.onChangeSymbol) {
      props.onChangeSymbol(symbol.toUpperCase());
    }
    // Giữ ô tìm kiếm mở để hiển thị Spinner, chỉ ẩn dropdown gợi ý đi trước
    setSuggestions([]);
  };

  const handleSearchSubmit = async () => {
    const cleanSymbol = searchVal.trim().toUpperCase();
    if (!cleanSymbol) return;

    const match = suggestions.find(s => s.symbol.toUpperCase() === cleanSymbol);
    if (match) {
      handleSelectStock(match.symbol);
      return;
    }

    try {
      const res = await fetchStockDetail(cleanSymbol);
      if (res && res.success && res.data && res.data.symbol && res.data.refPrice > 0) {
        handleSelectStock(cleanSymbol);
      } else {
        toast.error(`Mã cổ phiếu ${cleanSymbol} không hợp lệ!`);
      }
    } catch (err) {
      toast.error(`Không tìm thấy mã cổ phiếu: ${cleanSymbol}`);
    }
  };

  if (!props.data)
    return <div className="modal-header">Đang tải dữ liệu...</div>;

  // Tính toán các giá trị hiển thị
  const matchPrice = props.data.matchPrice || 0;
  const refPrice = props.data.refPrice || 0;
  const totalVolume = props.data.totalVolume || 0;

  const hasTraded = matchPrice > 0;

  const change = hasTraded
    ? props.data.matchChange !== undefined
      ? props.data.matchChange
      : matchPrice - refPrice
    : 0;
  const changePercent = hasTraded
    ? props.data.matchChangePercent !== undefined
      ? props.data.matchChangePercent
      : refPrice
        ? (change / refPrice) * 100
        : 0
    : 0;

  const formatPrice = (p) => (p / 1000).toFixed(2);
  const formatVol = (v) => (v ? v.toLocaleString("vi-VN") : "0");

  // Hàm lấy class màu sắc dựa trên giá
  const getPriceClass = (price) => {
    if (!hasTraded || !price || price === 0) return "price--white";
    if (!props.data.refPrice) return "price--ref";
    if (price >= props.data.ceiling) return "price--ceiling";
    if (price <= props.data.floor) return "price--floor";
    if (price > props.data.refPrice) return "price--up";
    if (price < props.data.refPrice) return "price--down";
    return "price--ref";
  };

  const avgPrice =
    hasTraded && props.data.high && props.data.low
      ? (props.data.high + props.data.low) / 2
      : 0;

  return (
    <div className="modal-header">
      <div className="header-top">
        <div className="stock-title-search-container">
          {/* Tên cổ phiếu hiển thị mặc định */}
          <div
            className={`stock-title ${isSearching ? "stock-title--hidden" : "stock-title--visible"}`}
            onClick={() => setIsSearching(true)}
            style={{ cursor: "pointer" }}
            title="Nhấp để tìm kiếm mã khác"
          >
            <div className="search-icon">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <h1 className="symbol">{props.symbol}</h1>
            <span className="exchange">({props.data.exchange})</span>
            <span className="company-name">{props.data.companyName}</span>
          </div>

          {/* Hộp tìm kiếm kết hợp hiệu ứng co giãn */}
          <div className={`stock-search-input-wrapper ${isSearching ? "stock-search-input-wrapper--active" : ""}`}>
            {props.isLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin search-input-icon loading-spinner"></i>
            ) : (
              <i className="fa-solid fa-magnifying-glass search-input-icon"></i>
            )}
            <input
              ref={inputRef}
              type="text"
              className="stock-search-input"
              value={searchVal}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={props.isLoading ? "Đang tải dữ liệu..." : "Tìm mã cổ phiếu..."}
              disabled={props.isLoading}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (activeIndex >= 0 && activeIndex < suggestions.length) {
                    handleSelectStock(suggestions[activeIndex].symbol);
                  } else {
                    handleSearchSubmit();
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setIsSearching(false);
                  setSearchVal("");
                  setSuggestions([]);
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  setIsSearching(false);
                  setSearchVal("");
                  setSuggestions([]);
                }, 200);
              }}
            />

            {/* Thả xuống gợi ý tìm kiếm cổ phiếu */}
            {suggestions.length > 0 && (
              <div className="stock-suggestions-dropdown">
                {suggestions.map((stock, index) => (
                  <div
                    key={stock.symbol || index}
                    className={`suggestion-item ${index === activeIndex ? "suggestion-item--active" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectStock(stock.symbol);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="symbol-badge">{stock.symbol}</span>
                    <span className="company-name">{stock.companyName}</span>
                    <span className="exchange-badge">({stock.exchange || "HOSE"})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="header-actions">
          {!props.onlyOrder && (
            <>
              <button className="btn-analysis">Phân tích cơ bản</button>
              <button 
                className={`btn-order ${props.isOrderActive ? "active" : ""}`}
                onClick={() => {
                  if (user && user.isAuthenticated) {
                    props.setIsOrderActive(!props.isOrderActive);
                  } else {
                    setShowLoginModal(true);
                  }
                }}
              >
                {props.isOrderActive ? "Dữ liệu khớp lệnh" : "Đặt lệnh"}
              </button>
            </>
          )}
          <button className="btn-close" onClick={props.onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div className={`header-info ${props.isLoading ? "header-info--loading" : ""}`}>
        <div className="price-section">
          <div className={`current-price ${getPriceClass(matchPrice)}`}>
            {hasTraded ? formatPrice(matchPrice) : "-"}
          </div>
          <div className={`price-change ${getPriceClass(matchPrice)}`}>
            <div>
              {hasTraded
                ? (change > 0 ? "+" : "") + formatPrice(change)
                : "0.00"}
            </div>
            <div>
              {hasTraded
                ? (changePercent > 0 ? "+" : "") +
                  changePercent.toFixed(2) +
                  "%"
                : "0.00%"}
            </div>
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-row">
              <span className="label">CAO/THẤP:</span>
              <span className="value">
              {hasTraded && props.data.high ? (
                <span className={getPriceClass(props.data.high)}>
                  {formatPrice(props.data.high)}
                </span>
              ) : (
                "-"
              )}
              {" / "}
              {hasTraded && props.data.low ? (
                <span className={getPriceClass(props.data.low)}>
                  {formatPrice(props.data.low)}
                </span>
              ) : (
                "-"
              )}
              </span>
            </div>
          <div className="stat-row">
              <span className="label">MỞ CỬA/TRUNG BÌNH:</span>
              <span className="value">
              {hasTraded && props.data.openPrice ? (
                <span className={getPriceClass(props.data.openPrice)}>
                  {formatPrice(props.data.openPrice)}
                </span>
              ) : (
                "-"
              )}
              {" / "}
              {hasTraded && avgPrice ? (
                <span className={getPriceClass(avgPrice)}>
                  {formatPrice(avgPrice)}
                </span>
              ) : (
                "-"
              )}
              </span>
            </div>
          </div>

        <div className="ref-section">
            <div className="ref-item">
              <span className="label">Trần</span>
            <span className="value color-ceiling">
              {formatPrice(props.data.ceiling || 0)}
            </span>
            </div>
            <div className="ref-item">
              <span className="label">Sàn</span>
            <span className="value color-floor">
              {formatPrice(props.data.floor || 0)}
            </span>
            </div>
            <div className="ref-item">
              <span className="label">Tham chiếu</span>
              <span className="value color-ref">{formatPrice(refPrice)}</span>
            </div>
          <div className="ref-item total-vol">
              <span className="label">TỔNG KL:</span>
            <span className="value">
              {totalVolume > 0 ? formatVol(totalVolume) : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalHeader;
