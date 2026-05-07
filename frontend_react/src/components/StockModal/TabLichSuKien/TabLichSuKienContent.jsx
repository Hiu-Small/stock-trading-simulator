import React, { useState, useEffect, useMemo } from "react";
import "./TabLichSuKienContent.scss";
import { fetchStockEvents } from "../../../services/companyApi";
import EventFilters from "./EventFilters";
import EventTable from "./EventTable";

const TabLichSuKienContent = ({ symbol }) => {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    dateType: "all",
    startDate: "",
    endDate: "",
    eventType: "all"
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchStockEvents(symbol);
        if (res && res.success) {
          setAllEvents(res.data || []);
        } else {
          setError("Không thể tải dữ liệu sự kiện.");
        }
      } catch (err) {
        setError("Có lỗi xảy ra khi kết nối API.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      loadData();
    }
  }, [symbol]);

  // Lấy danh sách các loại sự kiện duy nhất để đổ vào dropdown
  const eventTypes = useMemo(() => {
    const types = new Set(allEvents.map(e => e.type));
    return Array.from(types).sort();
  }, [allEvents]);

  // Logic lọc dữ liệu
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // 1. Lọc theo loại sự kiện
      if (filters.eventType !== "all" && event.type !== filters.eventType) {
        return false;
      }

      // 2. Lọc theo khoảng ngày
      if (filters.startDate || filters.endDate) {
        const dateToCompare = filters.dateType === "all" 
          ? event.publicDate // Mặc định dùng ngày công bố nếu chọn "Tất cả"
          : event[filters.dateType];

        if (!dateToCompare || dateToCompare === "-") return false;
        
        const eventTime = new Date(dateToCompare).getTime();
        
        if (filters.startDate) {
          const start = new Date(filters.startDate).getTime();
          if (eventTime < start) return false;
        }
        
        if (filters.endDate) {
          const end = new Date(filters.endDate).getTime();
          // Thêm 1 ngày vào ngày kết thúc để bao gồm cả ngày đó
          if (eventTime > (end + 86400000)) return false;
        }
      }

      return true;
    });
  }, [allEvents, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      dateType: "all",
      startDate: "",
      endDate: "",
      eventType: "all"
    });
  };

  if (loading) return <div className="tab-events-content"><div className="tab-loading">Đang tải dữ liệu...</div></div>;
  if (error) return <div className="tab-events-content"><div className="tab-error">{error}</div></div>;

  return (
    <div className="tab-events-content">
      <EventFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        onReset={handleReset}
        eventTypes={eventTypes}
      />
      <EventTable events={filteredEvents} />
    </div>
  );
};

export default TabLichSuKienContent;
