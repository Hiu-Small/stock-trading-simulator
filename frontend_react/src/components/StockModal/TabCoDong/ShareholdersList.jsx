import React, { useState } from "react";
import "./ShareholdersList.scss";

const ShareholdersList = ({ data }) => {
  const [filter, setFilter] = useState("Tất cả");

  const filteredList = data.filter(item => {
    if (filter === "Tất cả") return true;
    return item.type === filter;
  });

  // Hàm chuyển đổi định dạng ngày từ YYYY-MM-DD sang DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "-"; // Trả về dấu "-" nếu không có dữ liệu ngày
    // Tách chuỗi theo dấu "-", đảo ngược mảng, rồi nối lại bằng dấu "-"
    return dateString.split("-").reverse().join("-");
  };

  return (
    <div className="left-panel">
      <div className="filter-tabs">
        {["Tất cả", "Cá nhân", "Tổ chức"].map(t => (
          <button 
            key={t} 
            className={filter === t ? "active" : ""} 
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="shareholders-table">
        <div className="table-header">
          <span className="col-name">Tên</span>
          <span className="col-shares">Số cổ phiếu</span>
          <span className="col-percent">Tỷ lệ</span>
          <span className="col-date">Ngày cập nhật</span>
        </div>
        <div className="table-body">
          {filteredList.map((item, idx) => (
            <div className="table-row" key={idx}>
              <div className="col-name">
                <div className="name-text">{item.name}</div>
                <div className="type-text">{item.type}</div>
              </div>
              <span className="col-shares">{item.shares ? item.shares.toLocaleString() : "0"}</span>
              <span className="col-percent">{item.percentage}%</span>
              
              {/* Cập nhật hiển thị ngày qua hàm formatDate */}
              <span className="col-date">{formatDate(item.updateDate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShareholdersList;