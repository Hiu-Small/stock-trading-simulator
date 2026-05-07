import React from "react";
import "./EventFilters.scss";

const EventFilters = ({ filters, onFilterChange, onReset, eventTypes }) => {
  return (
    <div className="events-filter-bar">
      <div className="filter-item">
        <label>Loại ngày</label>
        <select 
          value={filters.dateType} 
          onChange={(e) => onFilterChange("dateType", e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="exRightDate">Ngày GDKHQ</option>
          <option value="recordDate">Ngày chốt</option>
          <option value="payoutDate">Ngày thực hiện</option>
          <option value="publicDate">Ngày công bố</option>
        </select>
      </div>

      <div className="filter-item">
        <input 
          type="date" 
          value={filters.startDate} 
          onChange={(e) => onFilterChange("startDate", e.target.value)}
        />
      </div>

      <div className="filter-item">
        <input 
          type="date" 
          value={filters.endDate} 
          onChange={(e) => onFilterChange("endDate", e.target.value)}
        />
      </div>

      <div className="filter-item">
        <label>Nhóm sự kiện</label>
        <select 
          value={filters.eventType} 
          onChange={(e) => onFilterChange("eventType", e.target.value)}
        >
          <option value="all">Tất cả sự kiện</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <button className="reset-btn" onClick={onReset}>
        Xóa bộ lọc
      </button>
    </div>
  );
};

export default EventFilters;
