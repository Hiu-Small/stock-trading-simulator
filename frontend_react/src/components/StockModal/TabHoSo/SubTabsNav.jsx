import React from "react";
import "./SubTabsNav.scss";

const SubTabsNav = (props) => {
  if (!props.tabs || !props.tabs.length) return null;

  return (
    <div className="sub-tabs-nav">
      {props.tabs.map((tab) => (
        <button
          key={tab}
          className={`sub-tab-btn ${props.activeTab === tab ? "active" : ""}`}
          onClick={() => props.onChangeTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default SubTabsNav;
