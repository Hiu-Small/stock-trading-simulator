import React from "react";
import "./SubsidiariesBlock.scss";

// Hàm xử lý Vốn Điều Lệ (VĐL) thông minh
const formatCharterCapital = (capital) => {
  if (!capital) return "0.0";

  let valueInBillion = 0;

  // Nâng mốc kiểm tra lên 50 triệu để phân biệt rõ ràng hơn
  if (capital >= 50_000_000) {
    // Đơn vị gốc là Đồng (VD: 2,020,670,000,000 của BIC hoặc 100,000,000 của BIDCAM) -> Chia 1 tỷ
    valueInBillion = capital / 1_000_000_000;
  } else if (capital >= 1_000) {
    // Đơn vị gốc là Triệu đồng (VD: 2,453,659 của BSI) -> Chia 1000
    valueInBillion = capital / 1_000;
  } else {
    // Đã là tỷ đồng sẵn
    valueInBillion = capital;
  }

  // Ép về 0.0 nếu số quá nhỏ (nhỏ hơn hoặc bằng 0.1 tỷ - tương đương 100 triệu đổ lại)
  // Tính năng này giúp giao diện hiển thị 0.0 cho các cty như BIDCAM giống y như web gốc
  if (valueInBillion <= 0.1 && valueInBillion > 0) {
    return "0.0";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false, // Tắt dấu phẩy ngăn cách hàng nghìn
  }).format(valueInBillion);
};

const SubsidiariesBlock = (props) => {
  const currentData =
    props.activeTab === "Công ty con" ? props.subsidiaries : props.affiliates;

  return (
    <div className="subsidiaries-block">
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th className="col-name text-left">Tên Công ty</th>
              {/* <th className="col-symbol text-center">Mã</th> */}
              <th className="col-capital text-right">VĐL (Tỷ)</th>
              <th className="col-percent text-right">TL nắm giữ</th>
            </tr>
          </thead>
          <tbody>
            {currentData && currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr key={index}>
                  <td className="col-name text-left" title={item.name}>
                    {item.name}
                  </td>
                  {/* <td className="col-symbol text-center">{item.symbol || "-"}</td> */}

                  {/* Gọi hàm format thông minh tại đây */}
                  <td className="col-capital text-right">
                    {formatCharterCapital(item.charter_capital)}
                  </td>

                  <td className="col-percent text-right">
                    {item.ownership_percent
                      ? `${item.ownership_percent.toFixed(2)}%`
                      : "0.00%"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center no-data">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubsidiariesBlock;
