import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./UsersPage.scss";
import BalanceAdjustmentModal from "./BalanceAdjustmentModal";
import ConfirmModal from "./ConfirmModal";
import EditUserModal from "./EditUserModal";
import StockDetailModal from "../../StockModal/StockDetailModal";
import { fetchAllUsers, updateUserStatus } from "../../../services/adminService";
import { toast } from "react-toastify";
import { useTranslation } from "../../../context/LanguageContext";

const UsersPage = () => {
  const { t, lang } = useTranslation();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSymbol, setOrderSymbol] = useState("ACB");
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetchAllUsers();
      if (response && response.EC === 0) {
        setUsers(response.DT);
      } else {
        toast.error(response.EM || (lang === "vi" ? "Lỗi khi lấy danh sách người dùng" : "Error fetching user list"));
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

  useEffect(() => {
    const closeDropdown = () => {
      setShowStatusDropdown(false);
    };
    window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  }, []);

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleLock = (user) => {
    if (user.role === 'ADMIN') {
        toast.error(t("admin.users.toastLockAdmin"));
        return;
    }

    const isCurrentlyLocked = user.status?.toLowerCase() === 'locked';
    const newStatus = isCurrentlyLocked ? 'Active' : 'Locked';
    
    setConfirmConfig({
        userId: user.id,
        status: newStatus,
        title: isCurrentlyLocked ? t("admin.users.modalUnlockTitle") : t("admin.users.modalLockTitle"),
        message: t("admin.users.modalLockConfirm", {
            action: isCurrentlyLocked 
                ? (lang === "vi" ? "mở khóa" : "unlock") 
                : (lang === "vi" ? "khóa" : "lock"),
            email: user.email
        }) + (!isCurrentlyLocked ? t("admin.users.modalLockDesc") : ""),
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
            toast.success(response.EM || (lang === "vi" ? "Cập nhật trạng thái thành công" : "Status updated successfully"));
            fetchUsers();
        } else {
            toast.error(response.EM || (lang === "vi" ? "Lỗi khi cập nhật trạng thái" : "Error updating status"));
        }
    } catch (error) {
        console.error("Update status error:", error);
        toast.error(lang === "vi" ? "Lỗi hệ thống" : "System error");
    } finally {
        setShowConfirmModal(false);
    }
  };

  const handleWalletClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.warning(t("admin.users.toastExportNoData"));
      return;
    }

    // Định nghĩa tiêu đề cột
    const headers = [
      "   ID   ",
      "      Số tài khoản      ",
      "            Họ tên            ",
      "               Email               ",
      "     Số điện thoại     ",
      "     Số dư ví ($)     ",
      "    Giá trị danh mục ($)    ",
      "      Tổng tài sản ($)      ",
      "   Trạng thái   ",
      "   Quyền hạn   ",
      "      Ngày tham gia      "
    ];

    // Chuyển đổi dữ liệu người dùng sang định dạng dòng CSV
    const csvRows = filteredUsers.map(user => {
      const balance = parseFloat(user.virtual_balance || 0);
      const portfolio = parseFloat(user.portfolio_value || 0);
      const totalAssets = balance + portfolio;
      
      const dateValue = user.createdAt || user.created_at || user.createAt;
      const joinedDate = dateValue ? new Date(dateValue).toLocaleDateString("vi-VN") : "N/A";

      return [
        user.id,
        user.account_number || "N/A",
        `"${user.profile?.full_name || "N/A"}"`, 
        user.email,
        `="${user.phone || "N/A"}"`, 
        `="${balance.toFixed(2)}"`, 
        `="${portfolio.toFixed(2)}"`,
        `="${totalAssets.toFixed(2)}"`,
        user.status,
        user.role,
        `="${joinedDate}"` // Dùng định dạng này để Excel không hiện ######## khi cột hẹp
      ].join(",");
    });

    // Kết hợp tiêu đề và nội dung (thêm BOM để hiển thị đúng tiếng Việt trong Excel)
    const csvString = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    
    // Tạo Blob và URL để tải xuống
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `User_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(t("admin.users.toastExportSuccess"));
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
  };

  // Helper to remove Vietnamese tone marks
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  // Logic lọc người dùng dựa trên search và status
  const filteredUsers = users.filter((user) => {
    const fullName = user.profile?.full_name || "";
    const email = user.email || "";
    const id = String(user.id || "");
    const accNum = user.account_number || "";

    const search = normalizeText(searchTerm);

    const matchesSearch =
      normalizeText(fullName).includes(search) ||
      normalizeText(email).includes(search) ||
      normalizeText(id).includes(search) ||
      normalizeText(accNum).includes(search);

    const matchesStatus = statusFilter === "all" || user.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleExpand = (userId) => {
    const isExpanding = !expandedUsers[userId];
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: isExpanding
    }));

    if (isExpanding) {
      setTimeout(() => {
        const element = document.getElementById(`user-row-${userId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    }
  };

  useEffect(() => {
    if (location.state && location.state.expandUserId && !loading) {
      const uId = location.state.expandUserId;
      setExpandedUsers(prev => ({
        ...prev,
        [uId]: true
      }));
      setTimeout(() => {
        const element = document.getElementById(`user-row-${uId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      // clear navigation state to prevent re-expanding on back button or reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading]);

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <div className="header-left">
          <h1>{t("admin.users.title")}</h1>
          <p>{t("admin.users.subtitle")}</p>
        </div>
        <div className="header-right">
          <button className="btn-export" onClick={handleExportCSV}>
            <i className="fa-solid fa-download"></i> {t("admin.users.exportCsv")}
          </button>
        </div>
      </div>

      <div className="filter-section dashboard-section">
        <div className="filter-row">
          <div className="filter-item search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder={t("admin.users.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-item custom-select-wrapper">
            <div 
              className={`custom-select-trigger ${showStatusDropdown ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusDropdown(!showStatusDropdown);
              }}
            >
              <span>
                {statusFilter === "all" && t("admin.users.filterAll")}
                {statusFilter === "active" && t("admin.users.filterActive")}
                {statusFilter === "locked" && t("admin.users.filterLocked")}
                {statusFilter === "pending" && t("admin.users.filterPending")}
              </span>
              <i className="fa-solid fa-chevron-down select-arrow"></i>
            </div>
            
            {showStatusDropdown && (
              <div className="custom-select-options" onClick={(e) => e.stopPropagation()}>
                <div 
                  className={`custom-select-option ${statusFilter === "all" ? "selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("all");
                    setShowStatusDropdown(false);
                  }}
                >
                  {t("admin.users.filterAll")}
                </div>
                <div 
                  className={`custom-select-option ${statusFilter === "active" ? "selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("active");
                    setShowStatusDropdown(false);
                  }}
                >
                  {t("admin.users.filterActive")}
                </div>
                <div 
                  className={`custom-select-option ${statusFilter === "locked" ? "selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("locked");
                    setShowStatusDropdown(false);
                  }}
                >
                  {t("admin.users.filterLocked")}
                </div>
                <div 
                  className={`custom-select-option ${statusFilter === "pending" ? "selected" : ""}`}
                  onClick={() => {
                    setStatusFilter("pending");
                    setShowStatusDropdown(false);
                  }}
                >
                  {t("admin.users.filterPending")}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="filter-info">
          {t("admin.users.showingCount", { filtered: filteredUsers.length, total: users.length })}
        </div>
      </div>

      <div className="table-container dashboard-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>{t("admin.users.colAcc")}</th>
              <th>{t("admin.users.colName")}</th>
              <th>{t("admin.users.colEmail")}</th>
              <th>{t("admin.users.colBalance")}</th>
              <th>{t("admin.users.colPortfolio")}</th>
              <th>{t("admin.users.colStatus")}</th>
              <th>{t("admin.users.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>{t("admin.users.loading")}</td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <React.Fragment key={index}>
                  <tr 
                    id={`user-row-${user.id}`}
                    className={`user-row ${expandedUsers[user.id] ? 'active' : ''}`}
                    onClick={() => toggleExpand(user.id)}
                  >
                    <td className="expand-icon">
                      <i className={`fa-solid fa-chevron-${expandedUsers[user.id] ? 'down' : 'right'}`}></i>
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
                  {expandedUsers[user.id] && (
                    <tr className="holdings-detail-row">
                      <td colSpan="8">
                        <div className="holdings-expand-container">
                          <div className="holdings-header-row">
                            <h4>{t("admin.users.holdingsTitle")}</h4>
                            {user.holdings && user.holdings.length > 0 && (
                              <button
                                className="btn-place-order-admin"
                                onClick={() => {
                                  setSelectedUser(user);
                                  const defaultSym = user.holdings[0].stock?.symbol || "ACB";
                                  setOrderSymbol(defaultSym);
                                  setShowOrderModal(true);
                                }}
                              >
                                <i className="fa-solid fa-cart-shopping"></i> {t("admin.users.btnPlaceOrder")}
                              </button>
                            )}
                          </div>
                          {user.holdings && user.holdings.length > 0 ? (
                            <table className="holdings-inner-table">
                              <thead>
                                <tr>
                                  <th>{t("admin.users.colSymbol")}</th>
                                  <th>{t("admin.users.colQty")}</th>
                                  <th>{t("admin.users.colCostPrice")}</th>
                                  <th>{t("admin.users.colCurrPrice")}</th>
                                  <th>{t("admin.users.colTotalValue")}</th>
                                  <th>{t("admin.users.colPnL")}</th>
                                  <th>{t("admin.users.colPnLPercent")}</th>
                                  <th>{t("admin.users.colAction")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  let totalCostValue = 0;
                                  let totalMarketValue = 0;
                                  user.holdings.forEach(h => {
                                    const cost = h.quantity * h.average_price;
                                    totalCostValue += cost;
                                    totalMarketValue += (h.totalValue || 0);
                                  });
                                  const totalProfitLoss = totalMarketValue - totalCostValue;
                                  const totalProfitPercent = totalCostValue > 0 ? (totalProfitLoss / totalCostValue) * 100 : 0;
                                  const isTotalProfit = totalProfitLoss >= 0;
                                  
                                  return (
                                    <>
                                      {user.holdings.map((h, hIndex) => {
                                        const costValue = h.quantity * h.average_price;
                                        const profit = h.totalValue - costValue;
                                        const profitPercent = costValue > 0 ? (profit / costValue) * 100 : 0;
                                        const isProfit = profit >= 0;
                                        const sellableQty = h.sellableQuantity ?? h.quantity ?? 0;
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
                                            <td className={isProfit ? 'text-profit' : 'text-loss'}>
                                              {isProfit ? '+' : ''}{profitPercent.toFixed(2)}%
                                            </td>
                                            <td>
                                              {sellableQty > 0 ? (
                                                <button
                                                  className="btn-sell-custom"
                                                  title={t("admin.users.sellTitle", { symbol: h.stock?.symbol, qty: sellableQty.toLocaleString() })}
                                                  onClick={() => {
                                                    setSelectedUser(user);
                                                    setSelectedHolding(h);
                                                    setShowSellModal(true);
                                                  }}
                                                >
                                                  <i className="fa-solid fa-arrow-trend-down" /> {t("admin.users.btnSell")}
                                                </button>
                                              ) : (
                                                <span className="badge-pending-custom" title={lang === "vi" ? "Cổ phiếu chưa về, cần chờ T+2.5 ngày sau khi mua" : "Stock not settled, wait for T+2.5 days after purchase"}>
                                                  <i className="fa-regular fa-clock" /> {t("admin.users.btnPendingT25")}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      <tr className="holdings-total-row">
                                        <td><strong>{t("admin.users.holdingsTotal")}</strong></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td><strong>{formatCurrency(totalMarketValue)}</strong></td>
                                        <td className={isTotalProfit ? 'text-profit' : 'text-loss'}>
                                          <strong>{isTotalProfit ? '+' : ''}{formatCurrency(totalProfitLoss)}</strong>
                                        </td>
                                        <td className={isTotalProfit ? 'text-profit' : 'text-loss'}>
                                          <strong>{isTotalProfit ? '+' : ''}{totalProfitPercent.toFixed(2)}%</strong>
                                        </td>
                                        <td></td>
                                      </tr>
                                    </>
                                  );
                                })()}
                              </tbody>
                            </table>
                          ) : (
                            <div className="no-holdings-container">
                              <p className="no-data">{t("admin.users.noHoldings")}</p>
                              <button
                                className="btn-place-order-admin btn-place-order-empty"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setOrderSymbol("ACB");
                                  setShowOrderModal(true);
                                }}
                              >
                                <i className="fa-solid fa-cart-shopping"></i> {t("admin.users.btnPlaceOrder")}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>{t("admin.users.noData")}</td>
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
        confirmText={lang === "vi" ? "Xác nhận" : "Confirm"}
        cancelText={lang === "vi" ? "Hủy" : "Cancel"}
      />

      <EditUserModal
        show={showEditModal}
        handleClose={() => setShowEditModal(false)}
        userData={selectedUser}
        onSuccess={fetchUsers}
      />

      {showSellModal && selectedHolding && selectedUser && (
        <StockDetailModal
          symbol={selectedHolding.stock?.symbol}
          onlyOrder={true}
          defaultSide="SELL"
          onClose={() => {
            setShowSellModal(false);
            setSelectedHolding(null);
          }}
          targetUser={selectedUser}
          isAdmin={true}
          onSuccess={fetchUsers}
        />
      )}

      {showOrderModal && selectedUser && (
        <StockDetailModal
          symbol={orderSymbol}
          onlyOrder={true}
          defaultSide="BUY"
          onClose={() => {
            setShowOrderModal(false);
          }}
          onChangeSymbol={(newSym) => setOrderSymbol(newSym)}
          targetUser={selectedUser}
          isAdmin={true}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
};

export default UsersPage;
