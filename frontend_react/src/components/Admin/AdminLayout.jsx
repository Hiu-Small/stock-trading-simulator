import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import AdminDashboard from "./Dashboard/AdminDashboard";
import UsersPage from "./Users/UsersPage";
import MarketData from "./Market/MarketData";
import TradeMonitoring from "./Trades/TradeMonitoring";
import CorporateActions from "./CorporateActions/CorporateActions";
import SettingsPage from "./Settings/SettingsPage";
import LeaderboardPage from "./Leaderboard/LeaderboardPage";
import SystemLogs from "./Logs/SystemLogs";
import "./AdminLayout.scss";

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      {/* Sidebar bên trái */}
      <Sidebar />

      {/* Nội dung chính bên phải */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <Routes>
              <Route path="dashboard" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">Dashboard</span>
                </div>
              } />
              <Route path="users" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">Users & Accounts</span>
                </div>
              } />
              <Route path="market" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">Market Data</span>
                </div>
              } />
              <Route path="trades" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">Trade Monitoring</span>
                </div>
              } />
              <Route path="corporate-actions" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">Corporate Actions</span>
                </div>
              } />
              <Route path="settings" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">Settings & Fees</span>
                </div>
              } />
              <Route path="leaderboard" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">Leaderboard</span>
                </div>
              } />
              <Route path="logs" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                  <span className="separator">&gt;</span>
                  <span className="current">System Logs</span>
                </div>
              } />
              <Route path="*" element={
                <div className="breadcrumb">
                  <span className="parent">Admin</span>
                </div>
              } />
            </Routes>
          </div>
          <div className="header-right">
            <div className="search-bar">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search users, trades, logs..." />
            </div>
            <div className="header-icons">
              <div className="notification">
                <i className="fa-solid fa-bell"></i>
                <span className="badge"></span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="market" element={<MarketData />} />
            <Route path="trades" element={<TradeMonitoring />} />
            <Route path="corporate-actions" element={<CorporateActions />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="logs" element={<SystemLogs />} />
            {/* Tạm thời redirect từ /admin về /admin/dashboard */}
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<div>Tính năng đang được phát triển...</div>} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
