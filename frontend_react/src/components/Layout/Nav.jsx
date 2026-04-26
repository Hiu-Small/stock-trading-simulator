import React, { useState } from "react";
import "./Nav.scss";
import { NavLink } from "react-router-dom";

const Nav = (props) => {
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <div className="nav-container">
      <div className="left-container">
        <div className="logo-name">
          <div className="logo">
            <span>
              <i className="fa-solid fa-arrow-trend-up"></i>
            </span>
          </div>
          <div className="name">
            <span className="chu-i">i</span>
            <span className="chu-board">Board</span>
          </div>
        </div>

        <div className="nav-link">
          <NavLink to="/market" className="child-nav-link">
            Thị trường
          </NavLink>
          <NavLink to="/analysis" className="child-nav-link">
            Phân tích
          </NavLink>
          <NavLink to="/asset" className="child-nav-link">
            Quản lý tài sản
          </NavLink>
          <NavLink to="/news" className="child-nav-link">
            Tin tức
          </NavLink>
        </div>

        <div className="search">
          <div className="icon-search">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <div className="input-search">
            <input 
              placeholder="Search Ticker..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  props.onSearch(searchTerm);
                  setSearchTerm(""); // Reset sau khi tìm
                }
              }}
            />
          </div>
        </div>

        <div className={`status-market status--${props.marketStatus.toLowerCase()}`}>
          <span className="dot"></span> {/* Dấu chấm tròn */}
          <span className="text">
            {props.marketStatus === "OPEN" && "MARKET OPEN"}
            {props.marketStatus === "BREAK" && "LUNCH BREAK"}
            {props.marketStatus === "CLOSED" && "MARKET CLOSED"}
          </span>
        </div>
      </div>

      <div className="right-container">
        <div className="screener">
          <div className="icon-screener">
            <i className="fa-solid fa-bolt-lightning"></i>
          </div>
          <div className="text-screener">
            <span>Screener</span>
          </div>
        </div>
        <div className="function">
          <div className="notification">
            <i className="fa-solid fa-bell"></i>
          </div>
          <div className="diagram">
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div className="setting">
            <i className="fa-solid fa-gear"></i>
          </div>
        </div>
        <div className="profile">
          <div className="avatar">
            <i className="fa-solid fa-circle-user"></i>
          </div>
          <div className="name">
            <span>Investor</span>
          </div>
          <div className="angle-down">
            <i className="fa-solid fa-angle-down"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nav;
