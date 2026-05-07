import React from "react";
import "./EventTable.scss";

const EventTable = ({ events }) => {
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("vi-VN");
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="events-table-container">
      {events.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Loại sự kiện</th>
              <th className="center">Ngày GDKHQ</th>
              <th className="center">Ngày chốt</th>
              <th className="center">Ngày thực hiện</th>
              <th>Nội dung</th>
              <th className="center">Ngày công bố</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={index}>
                <td>{event.type}</td>
                <td className="date-cell">{formatDate(event.exRightDate)}</td>
                <td className="date-cell">{formatDate(event.recordDate)}</td>
                <td className="date-cell">{formatDate(event.payoutDate)}</td>
                <td className="content-cell">{event.content}</td>
                <td className="date-cell">{formatDate(event.publicDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-data">Không tìm thấy sự kiện nào</div>
      )}
    </div>
  );
};

export default EventTable;
