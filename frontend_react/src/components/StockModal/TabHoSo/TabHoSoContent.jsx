import React, { useState, useEffect } from "react";
import "./TabHoSoContent.scss";
import { fetchCompanyProfile } from "../../../services/companyApi";
import SubTabsNav from "./SubTabsNav";
import OverviewLayout from "./OverviewLayout";

const TabHoSoContent = (props) => {
  const [leftTab, setLeftTab] = useState("Giới thiệu");
  const [midTab, setMidTab] = useState("Công ty con");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!props.symbol) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchCompanyProfile(props.symbol);
        if (res && res.success) {
          setProfileData(res.data);
        } else {
          setError("Không thể tải dữ liệu hồ sơ công ty.");
        }
      } catch (err) {
        setError("Có lỗi xảy ra khi lấy dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [props.symbol]);

  if (loading) {
    return (
      <div className="tab-hoso-loading">
        <div className="spinner"></div>
        <p>Đang tải hồ sơ công ty...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return <div className="tab-hoso-error">{error || "Không có dữ liệu"}</div>;
  }

  return (
    <div className="tab-hoso-content">
      <div className="tab-hoso-body">
        <OverviewLayout 
          profileData={profileData} 
          refPrice={props.data?.refPrice}
          leftTab={leftTab}
          setLeftTab={setLeftTab}
          midTab={midTab}
          setMidTab={setMidTab}
        />
      </div>
    </div>
  );
};

export default TabHoSoContent;
