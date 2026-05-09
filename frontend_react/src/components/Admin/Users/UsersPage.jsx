import React, { useState } from "react";
import "./UsersPage.scss";
import BalanceAdjustmentModal from "./BalanceAdjustmentModal";

const UsersPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const mockUsers = [
    { id: "#10241", name: "John Anderson", email: "john.anderson@email.com", balance: "$125,450.00", portfolio: "$142,320.50", status: "Active" },
    { id: "#10242", name: "Sarah Mitchell", email: "sarah.mitchell@email.com", balance: "$89,200.00", portfolio: "$95,780.25", status: "Active" },
    { id: "#10243", name: "Michael Chen", email: "michael.chen@email.com", balance: "$0.00", portfolio: "$0.00", status: "Locked" },
    { id: "#10244", name: "Emily Rodriguez", email: "emily.rodriguez@email.com", balance: "$250,000.00", portfolio: "$267,450.75", status: "Active" },
    { id: "#10245", name: "David Kim", email: "david.kim@email.com", balance: "$50,000.00", portfolio: "$50,000.00", status: "Pending" },
    { id: "#10246", name: "Jessica Taylor", email: "jessica.taylor@email.com", balance: "$175,800.00", portfolio: "$189,235.40", status: "Active" },
    { id: "#10247", name: "Robert Wilson", email: "robert.wilson@email.com", balance: "$42,500.00", portfolio: "$38,920.15", status: "Active" },
    { id: "#10248", name: "Amanda Brown", email: "amanda.brown@email.com", balance: "$98,750.00", portfolio: "$105,680.90", status: "Active" },
  ];

  const handleEdit = (userId) => {
    console.log("Edit user:", userId);
  };

  const handleLock = (userId) => {
    console.log("Lock user:", userId);
  };

  const handleWalletClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleExportCSV = () => {
    console.log("Exporting CSV...");
  };

  // Logic lọc người dùng dựa trên search và status
  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || user.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Users & Accounts</h1>
          <p>Manage user accounts and virtual balances</p>
        </div>
        <div className="header-right">
          <button className="btn-export" onClick={handleExportCSV}>
            <i className="fa-solid fa-download"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="filter-section dashboard-section">
        <div className="filter-row">
          <div className="filter-item search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-item select">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="filter-item date">
            <input type="date" placeholder="dd/mm/yyyy" />
          </div>
        </div>
        <div className="filter-info">
          Showing <span>{filteredUsers.length} of {mockUsers.length}</span> users
        </div>
      </div>

      <div className="table-container dashboard-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th>USER ID</th>
              <th>FULL NAME</th>
              <th>EMAIL</th>
              <th>VIRTUAL BALANCE</th>
              <th>PORTFOLIO VALUE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr key={index}>
                <td className="user-id">{user.id}</td>
                <td className="user-name">{user.name}</td>
                <td className="user-email">{user.email}</td>
                <td className="user-balance">{user.balance}</td>
                <td className="user-portfolio">{user.portfolio}</td>
                <td>
                  <span className={`status-badge ${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </td>
                <td className="actions">
                  <button title="Edit" onClick={() => handleEdit(user.id)}>
                    <i className="fa-regular fa-pen-to-square"></i>
                  </button>
                  <button title="Lock" onClick={() => handleLock(user.id)}>
                    <i className="fa-solid fa-lock"></i>
                  </button>
                  <button title="Wallet" onClick={() => handleWalletClick(user)}>
                    <i className="fa-solid fa-dollar-sign"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BalanceAdjustmentModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        user={selectedUser}
      />
    </div>
  );
};

export default UsersPage;
