import React from "react";
import "./BasicInfo.scss";

const BasicInfo = (props) => {
  if (!props.data) return null;

  const rows = [
    { label: "Mã SIC", value: props.data.sic_code },
    // { label: "Tên ngành", value: props.data.industry },
    // { label: "Mã ngành ICB", value: props.data.industry_id },
    { label: "Năm thành lập", value: props.data.establishment_date },
    {
      label: "VĐL (Tỷ)",
      value: props.data.charter_capital
        ? `${props.data.charter_capital.toLocaleString()} Tỷ`
        : "",
    },
    {
      label: "Số lượng nhân viên",
      value: props.data.total_employees?.toLocaleString(),
    },
    { label: "Số lượng chi nhánh", value: props.data.branches },
    { label: "Trụ sở", value: props.data.headquarters },
    { label: "Điện thoại", value: props.data.phone },
    { label: "Fax", value: props.data.fax },
    { label: "Website", value: props.data.website },
  ];

  return (
    <div className="basic-info">
      {rows.map((row, index) => (
        <div className="info-row" key={index}>
          <span className="label">{row.label}</span>
          <span className="value">{row.value || "-"}</span>
        </div>
      ))}
    </div>
  );
};

export default BasicInfo;
