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
        <div className="nav-actions">
          <div className="action-icons">
            <div className="notification">
              <i className="fa-solid fa-bell"></i>
            </div>
            <div className="theme-toggle">
              <i className="fa-solid fa-moon"></i>
            </div>
            <div className="language">
              <svg width="20" height="20" viewBox="0 0 512 512" style={{borderRadius: '50%'}}>
                <rect width="512" height="512" fill="#da251d"/>
                <polygon 
                  fill="#ff0" 
                  points="256,92 298,223 436,223 325,303 367,435 256,355 145,435 187,303 76,223 214,223"
                />
              </svg>
            </div>
          </div>
          <div className="separator"></div>
          <div className="auth-buttons">
            <button className="btn-open-account">Mở tài khoản</button>
            <button className="btn-login">Đăng nhập</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nav;
