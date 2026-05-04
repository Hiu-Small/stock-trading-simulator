import React from "react";
import "./ListingInfo.scss";

const ListingInfo = (props) => {
  if (!props.data) return null;

  // Tính thị giá vốn: SLCP lưu hành * Giá tham chiếu
  const calculateMarketCap = () => {
    const shares = props.data.outstanding_shares;
    const price = props.refPrice;
    if (!shares || !price) return "-";

    // (Cổ phiếu * Giá) / 1 tỷ = Vốn hóa tỷ đồng
    const capInBillions = (shares * price) / 1_000_000_000;

    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(capInBillions) + " Tỷ"
    );
  };

  const rows = [
    { label: "Ngày niêm yết", value: props.data.first_listing_date },
    { label: "Nơi niêm yết", value: props.data.exchange },
    {
      label: "Giá chào sàn (x1,000)",
      value: props.data.listing_price
        ? (props.data.listing_price / 1000).toFixed(2)
        : "-",
    },
    {
      label: "KL đang niêm yết (Tỷ)",
      value: props.data.listing_volume?.toLocaleString(),
    },
    { label: "Thị giá vốn", value: calculateMarketCap() },
    {
      label: "SLCP lưu hành",
      value: props.data.outstanding_shares?.toLocaleString(),
    },
  ];

  return (
    <div className="listing-info">
      {rows.map((row, index) => (
        <div className="info-row" key={index}>
          <span className="label">{row.label}</span>
          <span className="value">{row.value || "-"}</span>
        </div>
      ))}
    </div>
  );
};

export default ListingInfo;
