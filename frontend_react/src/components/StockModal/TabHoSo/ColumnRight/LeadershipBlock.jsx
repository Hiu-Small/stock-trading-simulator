import React from "react";
import "./LeadershipBlock.scss";

const LeadershipBlock = (props) => {
  return (
    <div className="leadership-block">
      <div className="list-container">
        {props.officers && props.officers.length > 0 ? (
          props.officers.map((officer, index) => (
            <div className="officer-item" key={index}>
              <div className="officer-name">{officer.name}</div>
              <div className="officer-position">{officer.position}</div>
            </div>
          ))
        ) : (
          <div className="no-data">Không có thông tin ban lãnh đạo</div>
        )}
      </div>
    </div>
  );
};

export default LeadershipBlock;
