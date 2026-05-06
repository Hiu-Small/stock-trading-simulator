import React, { useState, useEffect } from "react";
import "./TabCoDongContent.scss";
import { fetchShareholders, fetchOwnership } from "../../../services/companyApi";
import ShareholdersList from "./ShareholdersList";
import OwnershipStructure from "./OwnershipStructure";

const TabCoDongContent = ({ symbol }) => {
  const [shareholders, setShareholders] = useState([]);
  const [ownership, setOwnership] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [shRes, owRes] = await Promise.all([
          fetchShareholders(symbol),
          fetchOwnership(symbol)
        ]);

        if (shRes.success) setShareholders(shRes.data);
        if (owRes.success) setOwnership(owRes.data);
      } catch (err) {
        console.error("Lỗi tải dữ liệu cổ đông:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [symbol]);

  if (loading) return <div className="tab-loading">Đang tải dữ liệu...</div>;

  return (
    <div className="tab-codong-container">
      <ShareholdersList data={shareholders} />
      <OwnershipStructure data={ownership} />
    </div>
  );
};

export default TabCoDongContent;
