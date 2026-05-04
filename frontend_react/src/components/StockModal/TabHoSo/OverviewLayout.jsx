import React from "react";
import "./OverviewLayout.scss";
import CompanyIntro from "./ColumnLeft/CompanyIntro";
import BasicInfo from "./ColumnLeft/BasicInfo";
import ListingInfo from "./ColumnLeft/ListingInfo";
import SubsidiariesBlock from "./ColumnMiddle/SubsidiariesBlock";
import LeadershipBlock from "./ColumnRight/LeadershipBlock";
import SubTabsNav from "./SubTabsNav";

const OverviewLayout = (props) => {
  return (
    <div className="overview-layout">
      {/* CỘT 1 */}
      <div className="column column-left">
        <div className="col-header">
          <SubTabsNav 
            tabs={["Giới thiệu", "TT cơ bản", "TT niêm yết"]} 
            activeTab={props.leftTab} 
            onChangeTab={props.setLeftTab} 
          />
        </div>
        <div className="col-content">
          {props.leftTab === "Giới thiệu" && <CompanyIntro data={props.profileData.overview} />}
          {props.leftTab === "TT cơ bản" && <BasicInfo data={props.profileData.basic_info} />}
          {props.leftTab === "TT niêm yết" && (
            <ListingInfo data={props.profileData.listing_info} refPrice={props.refPrice} />
          )}
        </div>
      </div>

      {/* CỘT 2 */}
      <div className="column column-middle">
        <div className="col-header">
          <SubTabsNav 
            tabs={["Công ty con", "Công ty liên kết"]} 
            activeTab={props.midTab} 
            onChangeTab={props.setMidTab} 
          />
        </div>
        <div className="col-content p-0">
          <SubsidiariesBlock
            activeTab={props.midTab}
            subsidiaries={props.profileData.subsidiaries || []}
            affiliates={props.profileData.affiliates || []}
          />
        </div>
      </div>

      {/* CỘT 3 */}
      <div className="column column-right">
        <div className="col-header">
          <span className="static-title active">Ban lãnh đạo</span>
        </div>
        <div className="col-content p-0">
          <LeadershipBlock officers={props.profileData.officers || []} />
        </div>
      </div>
    </div>
  );
};

export default OverviewLayout;
