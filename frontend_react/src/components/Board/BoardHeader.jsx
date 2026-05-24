import React, { useState, useEffect, useRef } from "react";
import "./BoardHeader.scss";
import { useTranslation } from "../../context/LanguageContext";

/**
 * BoardHeader - Thanh công cụ phía trên bảng giá:
 *   - Tab sàn: HOSE, HNX, UPCOM, Derivatives, Futures
 *   - Nút lọc: Active Only, Columns, giờ ATO
 */
const BoardHeader = (props) => {
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const groups = [
    { id: "VN30", label: "VN30" },
    { id: "HNX30", label: "HNX30" },
    { id: "HOSE", label: "HOSE" },
    { id: "HNX", label: "HNX" },
    { id: "UPCOM", label: "UPCOM" },
    { id: "VN100", label: "VN100" },
  ];

  return (
    <div className="board-header">
      {/* ===== Tab sàn ===== */}
      <div className="board-header__tabs">
        {groups.map((group) => (
          <button
            key={group.id}
            className={`board-tab ${
              props.selectedGroup === group.id ? "board-tab--active" : ""
            }`}
            onClick={() => props.onGroupChange(group.id)}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* ===== Thống kê nhanh (tăng / giảm / không đổi / kịch trần / kịch sàn) ===== */}
      <div className="board-header__quick-stats">
        <span className="quick-stat price--ceiling" title={t("board.stats.ceiling")}>
          <div>▲</div> <div>{props.stateStock.ceiling}</div>
        </span>
        <span className="quick-stat price--up" title={t("board.stats.up")}>
          <div>▲</div> <div>{props.stateStock.increase}</div>
        </span>
        <span className="quick-stat price--ref" title={t("board.stats.ref")}>
          <div>–</div> <div>{props.stateStock.ref}</div>
        </span>
        <span className="quick-stat price--down" title={t("board.stats.down")}>
          <div>▼</div> <div>{props.stateStock.decrease}</div>
        </span>
        <span className="quick-stat price--floor" title={t("board.stats.floor")}>
          <div>▼</div> <div>{props.stateStock.floor}</div>
        </span>
      </div>

      {/* ===== Bộ lọc & Cài đặt ===== */}
      <div className="board-header__actions">
        <button
          className={`board-action-btn ${props.showActiveOnly ? "board-action-btn--active" : ""}`}
          id="btn-active-only"
          onClick={props.onToggleActiveOnly}
        >
          <i className="fa-solid fa-filter"></i>
          {t("lang") === "vi" ? "Chỉ mã giao dịch" : "Active Only"}
        </button>

        <div className="board-header__dropdown-container" ref={dropdownRef}>
          <button 
            className={`board-action-btn ${showDropdown ? "board-action-btn--active" : ""}`} 
            id="btn-columns"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <i className="fa-solid fa-table-columns"></i>
            {t("lang") === "vi" ? "Cột hiển thị" : "Columns"}
          </button>
          
          {showDropdown && (
            <div className="board-header__dropdown-menu">
              <div className="dropdown-title">
                {t("lang") === "vi" ? "Cột hiển thị" : "Show Columns"}
              </div>
              <label className="dropdown-item">
                <input 
                  type="checkbox" 
                  checked={props.visibleColumns?.basic ?? true} 
                  onChange={() => props.onToggleColumn("basic")}
                />
                <span>{t("lang") === "vi" ? "Giá cơ bản (TC/Trần/Sàn)" : "Basic Prices (Ref/Ceil/Floor)"}</span>
              </label>
              <label className="dropdown-item">
                <input 
                  type="checkbox" 
                  checked={props.visibleColumns?.highLow ?? true} 
                  onChange={() => props.onToggleColumn("highLow")}
                />
                <span>{t("lang") === "vi" ? "Biên độ ngày (Cao/Thấp)" : "Daily Range (High/Low)"}</span>
              </label>
              <label className="dropdown-item">
                <input 
                  type="checkbox" 
                  checked={props.visibleColumns?.totalVol ?? true} 
                  onChange={() => props.onToggleColumn("totalVol")}
                />
                <span>{t("lang") === "vi" ? "Tổng Khối Lượng" : "Total Volume"}</span>
              </label>
              <label className="dropdown-item">
                <input 
                  type="checkbox" 
                  checked={props.visibleColumns?.foreign ?? true} 
                  onChange={() => props.onToggleColumn("foreign")}
                />
                <span>{t("lang") === "vi" ? "Khối ngoại (Mua/Bán/Room)" : "Foreign Trades (Buy/Sell/Room)"}</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardHeader;
