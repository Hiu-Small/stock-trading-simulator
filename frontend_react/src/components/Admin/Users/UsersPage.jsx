import React, { useState, useEffect } from "react";
import "./UsersPage.scss";
import BalanceAdjustmentModal from "./BalanceAdjustmentModal";
import ConfirmModal from "./ConfirmModal";
import EditUserModal from "./EditUserModal";
import { fetchAllUsers, updateUserStatus } from "../../../services/adminService";
import { toast } from "react-toastify";

const UsersPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    userId: null,
    status: "",
    title: "",
    message: "",
    type: "info"
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetchAllUsers();
      if (response && response.EC === 0) {
        setUsers(response.DT);
      } else {
        toast.error(response.EM || "Lỗi khi lấy danh sách người dùng");
      }
    } catch (error) {
      console.error("Fetch users error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleLock = (user) => {
    if (user.role === 'ADMIN') {
        toast.error("Không thể khóa tài khoản Quản trị viên");
        return;
    }

    const isCurrentlyLocked = user.status?.toLowerCase() === 'locked';
    const newStatus = isCurrentlyLocked ? 'Active' : 'Locked';
    
    setConfirmConfig({
        userId: user.id,
        status: newStatus,
        title: isCurrentlyLocked ? "Mở khóa tài khoản" : "Khóa tài khoản",
        message: (
            <>
                Bạn có chắc chắn muốn {isCurrentlyLocked ? "mở khóa" : "khóa"} tài khoản <strong>{user.email}</strong>? 
                {!isCurrentlyLocked && " Người dùng này sẽ không thể đăng nhập vào hệ thống."}
            </>
        ),
        type: isCurrentlyLocked ? "info" : "danger"
    });
    setShowConfirmModal(true);
  };

  const confirmUpdateStatus = async () => {
    try {
        const response = await updateUserStatus({
            userId: confirmConfig.userId,
            status: confirmConfig.status
        });

        if (response && response.EC === 0) {
            toast.success(response.EM || "Cập nhật trạng thái thành công");
            fetchUsers();
        } else {
            toast.error(response.EM || "Lỗi khi cập nhật trạng thái");
        }
    } catch (error) {
        console.error("Update status error:", error);
        toast.error("Lỗi hệ thống");
    } finally {
        setShowConfirmModal(false);
    }
  };

  const handleWalletClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleExportCSV = () => {
    console.log("Exporting CSV...");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Logic lọc người dùng dựa trên search và status
  const filteredUsers = users.filter((user) => {
    const fullName = user.full_name || "";
    const email = user.email || "";
    const id = String(user.id || "");
    const accNum = user.account_number || "";

    const matchesSearch =
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.includes(searchTerm) ||
      accNum.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || user.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const [expandedUser, setExpandedUser] = useState(null);

  const toggleExpand = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
    }
  };

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
          {/* <div className="filter-item date">
            <input type="date" placeholder="dd/mm/yyyy" />
          </div> */}
        </div>
        <div className="filter-info">
          Showing <span>{filteredUsers.length} of {users.length}</span> users
        </div>
      </div>

      <div className="table-container dashboard-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
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
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>Đang tải dữ liệu...</td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <React.Fragment key={index}>
                  <tr 
                    className={`user-row ${expandedUser === user.id ? 'active' : ''}`}
                    onClick={() => toggleExpand(user.id)}
                  >
                    <td className="expand-icon">
                      <i className={`fa-solid fa-chevron-${expandedUser === user.id ? 'down' : 'right'}`}></i>
                    </td>
                    <td className="user-id">#{user.account_number || user.id}</td>
                    <td className="user-name">{user.profile?.full_name || 'N/A'}</td>
                    <td className="user-email">{user.email}</td>
                    <td className="user-balance">{formatCurrency(user.virtual_balance)}</td>
                    <td className="user-portfolio">{formatCurrency(user.portfolio_value)}</td>
                    <td>
                      <span className={`status-badge ${user.status.toLowerCase()}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <button title="Edit" onClick={() => handleEdit(user)}>
                        <i className="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button title={user.status?.toLowerCase() === 'locked' ? "Unlock" : "Lock"} onClick={() => handleLock(user)}>
                        <i className={`fa-solid fa-lock${user.status?.toLowerCase() === 'locked' ? '-open' : ''}`}></i>
                      </button>
                      <button title="Wallet" onClick={() => handleWalletClick(user)}>
                        <i className="fa-solid fa-dollar-sign"></i>
                      </button>
                    </td>
                  </tr>
                  {expandedUser === user.id && (
                    <tr className="holdings-detail-row">
                      <td colSpan="8">
                        <div className="holdings-expand-container">
                          <h4>Chi tiết danh mục nắm giữ</h4>
                          {user.holdings && user.holdings.length > 0 ? (
                            <table className="holdings-inner-table">
                              <thead>
                                <tr>
                                  <th>Mã CK</th>
                                  <th>Số lượng</th>
                                  <th>Giá vốn</th>
                                  <th>Giá hiện tại</th>
                                  <th>Tổng giá trị</th>
                                  <th>Lãi/Lỗ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {user.holdings.map((h, hIndex) => {
                                  const profit = h.totalValue - (h.quantity * h.average_price);
                                  const isProfit = profit >= 0;
                                  return (
                                    <tr key={hIndex}>
                                      <td>{h.stock?.symbol}</td>
                                      <td>{h.quantity.toLocaleString()}</td>
                                      <td>{formatCurrency(h.average_price)}</td>
                                      <td className="current-price">{formatCurrency(h.currentPrice)}</td>
                                      <td>{formatCurrency(h.totalValue)}</td>
                                      <td className={isProfit ? 'text-profit' : 'text-loss'}>
                                        {isProfit ? '+' : ''}{formatCurrency(profit)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p className="no-data">Người dùng này chưa nắm giữ cổ phiếu nào.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>Không tìm thấy người dùng nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BalanceAdjustmentModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <ConfirmModal
        show={showConfirmModal}
        handleClose={() => setShowConfirmModal(false)}
        handleConfirm={confirmUpdateStatus}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmText="Xác nhận"
      />

      <EditUserModal
        show={showEditModal}
        handleClose={() => setShowEditModal(false)}
        userData={selectedUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default UsersPage;
