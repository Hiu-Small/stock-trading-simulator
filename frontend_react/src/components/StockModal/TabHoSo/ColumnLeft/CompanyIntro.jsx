import React from "react";
import "./CompanyIntro.scss";

const CompanyIntro = (props) => {
  if (!props.data) return null;

  // Xử lý xuống dòng cho text
  const formatText = (text) => {
    if (!text) return "";
    return text.split('\n').map((str, index) => (
      <p key={index}>{str}</p>
    ));
  };

  return (
    <div className="company-intro">
      <div className="intro-section">
        <h4 className="section-title">Giới thiệu</h4>
        {formatText(props.data.company_profile)}
      </div>
      <div className="history-section">
        <h4 className="section-title">Lịch sử hình thành</h4>
        {formatText(props.data.history)}
      </div>
    </div>
  );
};

export default CompanyIntro;
