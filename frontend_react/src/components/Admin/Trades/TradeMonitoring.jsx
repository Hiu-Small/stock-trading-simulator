import React, { useState, useEffect } from "react";
import "./TradeMonitoring.scss";
import { 
  fetchAllOrders, 
  forceCancelOrder, 
  forceMatchOrder,
  cancelStandardOrder,
  modifyAdminOrder 
} from "../../../services/adminService";
import { toast } from "react-toastify";
import { useTranslation } from "../../../context/LanguageContext";

const TradeMonitoring = () => {
  const { t, lang } = useTranslation();
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                   today.getDate().toString().padStart(2, '0');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [lastUpdate, setLastUpdate] = useState("--:--:--");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Modification states for Admin
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modifyType, setModifyType] = useState('PRICE'); // 'PRICE' | 'QTY'
  const [newPrice, setNewPrice] = useState(0);
  const [newQuantity, setNewQuantity] = useState(0);
  const [modifyingId, setModifyingId] = useState(null);

  // Cancel states for Admin
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const getTickSize = (priceVal, exchange = 'HOSE') => {
    const currentExchange = (exchange || 'HOSE').toUpperCase();
    const p = Number(priceVal || 0);
    
    if (currentExchange === 'HNX' || currentExchange === 'UPCOM') {
      return 0.10;
    }
    
    if (p < 10.00) {
      return 0.01;
    } else if (p < 50.00) {
      return 0.05;
    } else {
      return 0.10;
    }
  };

  const handleOpenModify = (order) => {
    const raw = order.rawOrder;
    setSelectedOrder(raw);
    setModifyType('PRICE');
    setNewPrice(raw.price / 1000);
    setNewQuantity(raw.quantity);
    setShowModifyModal(true);
  };

  const handleExecuteModify = async () => {
    if (!selectedOrder) return;

    if (modifyType === 'PRICE') {
      const p = parseFloat(newPrice);
      if (isNaN(p) || p <= 0) {
        toast.error(t("admin.trades.toastModifyPriceInvalid"));
        return;
      }
      if (p * 1000 === parseFloat(selectedOrder.price)) {
        toast.error(t("admin.trades.toastModifySamePrice"));
        return;
      }

      // Check tick size
      const currentExchange = selectedOrder.stock?.exchange || 'HOSE';
      const tick = getTickSize(newPrice, currentExchange);
      const priceInVnd = p * 1000;
      const tickInVnd = tick * 1000;
      const priceInt = Math.round(priceInVnd);
      const tickInt = Math.round(tickInVnd);
      if (priceInt % tickInt !== 0) {
        toast.error(t("admin.trades.toastModifyInvalidTick", { exchange: currentExchange, tick: tickInt }));
        return;
      }
    } else {
      const q = parseInt(newQuantity);
      const matchedQty = selectedOrder.quantity - selectedOrder.remaining_quantity;
      if (isNaN(q) || q <= 0) {
        toast.error(t("admin.trades.toastModifyInvalidQty"));
        return;
      }
      if (q === selectedOrder.quantity) {
        toast.error(t("admin.trades.toastModifySameQty"));
        return;
      }
      if (q <= matchedQty) {
        toast.error(t("admin.trades.toastModifyQtyBelowMatched", { qty: matchedQty }));
        return;
      }
      if (q >= 100 && q % 100 !== 0) {
        toast.error(t("admin.trades.toastModifyOddQty"));
        return;
      }
    }

    setModifyingId(selectedOrder.id);
    try {
      const res = await modifyAdminOrder(
        selectedOrder.id,
        modifyType === 'PRICE' ? newPrice * 1000 : undefined,
        modifyType === 'QTY' ? newQuantity : undefined
      );
      if (res && res.EC === 0) {
        toast.success(t("admin.trades.toastModifySuccess"));
        setShowModifyModal(false);
        fetchOrdersData(true);
      } else {
        toast.error(res?.EM || t("admin.trades.toastModifyError"));
      }
    } catch (err) {
      console.error("Error modifying order:", err);
      toast.error(t("admin.trades.toastConnError"));
    } finally {
      setModifyingId(null);
    }
  };

  const handleCancelClick = (order) => {
    setSelectedOrder(order.rawOrder);
    setShowCancelModal(true);
  };

  const handleExecuteCancel = async () => {
    if (!selectedOrder) return;
    setCancellingId(selectedOrder.id);
    try {
      const res = await cancelStandardOrder(selectedOrder.id);
      if (res && res.EC === 0) {
        toast.success(t("admin.trades.toastForceCancelSuccess"));
        setShowCancelModal(false);
        fetchOrdersData(true);
      } else {
        toast.error(res?.EM || t("admin.trades.toastForceCancelError"));
      }
    } catch (err) {
      console.error("Error cancelling order:", err);
      toast.error(t("admin.trades.toastConnError"));
    } finally {
      setCancellingId(null);
    }
  };

  const fetchOrdersData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetchAllOrders(startDate, endDate);
      if (res && res.EC === 0) {
        setOrders(res.DT || []);
        
        const now = new Date();
        setLastUpdate(
          now.getHours().toString().padStart(2, '0') + ":" + 
          now.getMinutes().toString().padStart(2, '0') + ":" + 
          now.getSeconds().toString().padStart(2, '0')
        );
      } else {
        toast.error(res?.EM || t("admin.trades.toastLoadError"));
      }
    } catch (err) {
      console.error("Error fetching system orders:", err);
      toast.error(t("admin.trades.toastConnError"));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();

    // Tự động cập nhật mỗi 5 giây
    const interval = setInterval(() => {
      fetchOrdersData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const handleForceCancel = async (orderId) => {
    if (window.confirm(t("admin.trades.toastForceCancelConfirm", { id: orderId }))) {
      try {
        const res = await forceCancelOrder(orderId);
        if (res && res.EC === 0) {
          toast.success(res.EM || t("admin.trades.toastForceCancelSuccess"));
          fetchOrdersData(true);
        } else {
          toast.error(res?.EM || t("admin.trades.toastForceCancelError"));
        }
      } catch (err) {
        toast.error(t("admin.trades.toastConnError"));
      }
    }
  };

  const handleForceMatch = async (orderId) => {
    if (window.confirm(t("admin.trades.toastForceMatchConfirm", { id: orderId }))) {
      try {
        const res = await forceMatchOrder(orderId);
        if (res && res.EC === 0) {
          toast.success(res.EM || t("admin.trades.toastForceMatchSuccess"));
          fetchOrdersData(true);
        } else {
          toast.error(res?.EM || t("admin.trades.toastForceMatchError"));
        }
      } catch (err) {
        toast.error(t("admin.trades.toastConnError"));
      }
    }
  };

  // Helper formats
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const date = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');
    return `${date}/${month}/${year} ${hh}:${mm}:${ss}`;
  };

  const formatPrice = (p) => {
    const num = Number(p);
    if (num >= 1000) {
      return (num / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('vi-VN');
  };

  const mapStatus = (dbStatus) => {
    switch (dbStatus) {
      case "PENDING":
        return "Pending";
      case "PARTIAL_MATCHED":
        return "Pending";
      case "MATCHED":
        return "Matched";
      case "CANCELLED":
        return "Canceled";
      case "FAILED_STUCK":
        return "Stuck";
      default:
        return dbStatus || "Pending";
    }
  };

  const mappedOrders = orders.map(o => ({
    id: o.id,
    timestamp: formatDate(o.createdAt),
    userId: o.user?.account_number || o.user_id,
    symbol: o.symbol,
    side: o.side,
    type: o.order_type || "LO",
    volume: Number(o.quantity).toLocaleString('vi-VN'),
    price: formatPrice(o.price),
    status: mapStatus(o.status),
    rawStatus: o.status,
    rawOrder: o
  }));

  const getStatusCount = (status) => {
    if (status === "All") return mappedOrders.length;
    if (status === "Failed/Stuck") return mappedOrders.filter(o => o.status === "Stuck" || o.status === "Failed").length;
    return mappedOrders.filter(o => o.status === status).length;
  };

  const filteredOrders = mappedOrders.filter(o => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Failed/Stuck") return o.status === "Stuck" || o.status === "Failed";
    return o.status === activeFilter;
  });

  const tabs = [
    { label: "All", key: "All" },
    { label: "Pending", key: "Pending" },
    { label: "Matched", key: "Matched" },
    { label: "Canceled", key: "Canceled" },
    { label: "Failed/Stuck", key: "Failed/Stuck" },
  ];

  const isFiltered = startDate !== todayStr || endDate !== todayStr;

  return (
    <div className="admin-trades-page">
      <div className="page-header">
        <div className="header-top">
          <h1>Live Order Book</h1>
          <div className="live-badge">
            <div className="pulse-dot"></div>
            <span>Live</span>
          </div>
        </div>
        <div className="refresh-info">
          <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? "spinning" : ""}`}></i>
          <span>Auto-refresh • Last update: {lastUpdate}</span>
        </div>
      </div>

      <div className="ob-filters">
        <div className="filter-tabs">
          {tabs.map(tab => {
            let tabClass = "tab-item";
            if (activeFilter === tab.key) {
              tabClass += " active";
              if (tab.key === "Failed/Stuck") tabClass += " danger";
            }
            
            return (
              <button 
                key={tab.key}
                className={tabClass}
                onClick={() => setActiveFilter(tab.key)}
              >
                <span className="label">{tab.label}</span>
                <span className="count">{getStatusCount(tab.key)}</span>
              </button>
            );
          })}
        </div>

        <div className="date-filters">
          <div className="date-input-group">
            <span>{t("admin.trades.filterFrom")}</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <span className="date-sep">|</span>
          <div className="date-input-group">
            <span>{t("admin.trades.filterTo")}</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          {isFiltered && (
            <button 
              className="btn-clear-date" 
              onClick={() => { 
                setStartDate(todayStr); 
                setEndDate(todayStr); 
              }}
              title={t("admin.trades.resetFilterTooltip")}
            >
              <i className="fa-solid fa-xmark"></i> {t("admin.trades.btnResetFilter")}
            </button>
          )}
        </div>
      </div>

      <div className="table-container dashboard-section">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "10px" }}></i>
            {t("admin.trades.loading")}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-inbox"></i>
            <span>{t("admin.trades.emptyState")}</span>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.trades.colId")}</th>
                <th>{t("admin.trades.colTime")}</th>
                <th>{t("admin.trades.colUser")}</th>
                <th>{t("admin.trades.colSymbol")}</th>
                <th>{t("admin.trades.colSide")}</th>
                <th>{t("admin.trades.colType")}</th>
                <th>{t("admin.trades.colVolume")}</th>
                <th>{t("admin.trades.colPrice")}</th>
                <th>{t("admin.trades.colStatus")}</th>
                <th>{t("admin.trades.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => {
                const isProblematic = order.status === "Stuck" || order.status === "Failed";
                return (
                  <tr key={index} className={isProblematic ? "row-problematic" : ""}>
                    <td className="col-id">{order.id}</td>
                    <td className="col-time">{order.timestamp}</td>
                    <td className="col-user">#{order.userId}</td>
                    <td className="col-symbol"><strong>{order.symbol}</strong></td>
                    <td>
                      <span className={`side-badge ${order.side.toLowerCase()}`}>{order.side}</span>
                    </td>
                    <td className="col-type">{order.type}</td>
                    <td className="col-vol">{order.volume}</td>
                    <td className="col-price">{order.price}</td>
                    <td>
                      <span className={`status-badge ${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="col-actions">
                      {isProblematic ? (
                        <div className="action-btns">
                          <button 
                            className="btn-action cancel" 
                            title="Force Cancel"
                            onClick={() => handleForceCancel(order.id)}
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                          <button 
                            className="btn-action match" 
                            title="Force Match"
                            onClick={() => handleForceMatch(order.id)}
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                        </div>
                      ) : order.status === "Pending" ? (
                        <div className="action-btns">
                          <button 
                            className="btn-action modify" 
                            title={lang === "vi" ? "Sửa Lệnh" : "Modify Order"}
                            onClick={() => handleOpenModify(order)}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button 
                            className="btn-action cancel" 
                            title={lang === "vi" ? "Hủy Lệnh" : "Cancel Order"}
                            onClick={() => handleCancelClick(order)}
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="no-action">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="trades-summary-grid">
        <div className="summary-card">
          <span className="label">{t("admin.trades.summaryTotal")}</span>
          <span className="value">{mappedOrders.length}</span>
        </div>
        <div className="summary-card">
          <span className="label">{t("admin.trades.summaryMatched")}</span>
          <span className="value matched">{getStatusCount("Matched")}</span>
        </div>
        <div className="summary-card">
          <span className="label">{t("admin.trades.summaryPending")}</span>
          <span className="value pending">{getStatusCount("Pending")}</span>
        </div>
        <div className="summary-card">
          <span className="label">{t("admin.trades.summaryFailed")}</span>
          <span className="value failed">{getStatusCount("Failed/Stuck")}</span>
        </div>
      </div>

      {/* Modal Hủy lệnh (Standard Admin Cancel) */}
      {showCancelModal && selectedOrder && (
        <div className="cancel-confirm-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="cancel-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <div className="modal-title-custom">
                <i className="fa-solid fa-triangle-exclamation warning-icon"></i>
                <h2>{t("admin.trades.modalCancelTitle")}</h2>
              </div>
              <button className="btn-close-modal" onClick={() => setShowCancelModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body-custom">
              <p>{t("admin.trades.modalCancelDesc")}</p>
              <div className="order-summary-box">
                <div className="summary-row">
                  <span>{t("admin.trades.modalCancelStock")}</span>
                  <strong className="val-symbol">{selectedOrder.symbol}</strong>
                </div>
                <div className="summary-row">
                  <span>{t("admin.trades.modalCancelType")}</span>
                  <strong style={{ color: selectedOrder.side === 'BUY' ? '#00c805' : '#ff4d4f' }}>
                    {selectedOrder.side === 'BUY' ? (lang === 'vi' ? 'MUA' : 'BUY') : (lang === 'vi' ? 'BÁN' : 'SELL')}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>{t("admin.trades.modalCancelPrice")}</span>
                  <strong>{Number(selectedOrder.price).toLocaleString('vi-VN')} ₫</strong>
                </div>
                <div className="summary-row">
                  <span>{t("admin.trades.modalCancelRemaining")}</span>
                  <strong>{selectedOrder.remaining_quantity.toLocaleString('vi-VN')} {lang === "vi" ? "CP" : "shares"}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button className="btn-modal-back" onClick={() => setShowCancelModal(false)}>
                {t("admin.trades.modalCancelBack")}
              </button>
              <button 
                className="btn-modal-confirm" 
                onClick={handleExecuteCancel}
                disabled={cancellingId !== null}
              >
                {cancellingId !== null ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  t("admin.trades.modalCancelConfirm")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa lệnh (Standard Admin Modify) */}
      {showModifyModal && selectedOrder && (
        <div className="modify-confirm-modal-overlay" onClick={() => setShowModifyModal(false)}>
          <div className="modify-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <div className="modal-title-custom">
                <i className="fa-solid fa-pen-to-square modify-icon"></i>
                <h2>{t("admin.trades.modalModifyTitle")}</h2>
              </div>
              <button className="btn-close-modal" onClick={() => setShowModifyModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body-custom">
              <div className="order-summary-box">
                <div className="summary-row">
                  <span>{t("admin.trades.modalCancelStock")}</span>
                  <strong className="val-symbol">{selectedOrder.symbol}</strong>
                </div>
                <div className="summary-row">
                  <span>{t("admin.trades.modalCancelType")}</span>
                  <strong style={{ color: selectedOrder.side === 'BUY' ? '#00c805' : '#ff4d4f' }}>
                    {selectedOrder.side === 'BUY' ? (lang === 'vi' ? 'MUA' : 'BUY') : (lang === 'vi' ? 'BÁN' : 'SELL')}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>{t("admin.trades.modalModifyCurrPrice")}</span>
                  <strong>{Number(selectedOrder.price).toLocaleString('vi-VN')} ₫</strong>
                </div>
                <div className="summary-row">
                  <span>{t("admin.trades.modalModifyCurrQty")}</span>
                  <strong>{selectedOrder.quantity.toLocaleString('vi-VN')} / {(selectedOrder.quantity - selectedOrder.remaining_quantity).toLocaleString('vi-VN')} {lang === "vi" ? "CP" : "shares"}</strong>
                </div>
              </div>

              {/* Selector: Sửa Giá hoặc Khối Lượng */}
              <div className="modify-toggle-group">
                <button 
                  className={`toggle-btn ${modifyType === 'PRICE' ? 'active' : ''}`}
                  onClick={() => {
                    setModifyType('PRICE');
                    setNewQuantity(selectedOrder.quantity);
                  }}
                >
                  {t("admin.trades.modalModifyTypePrice")}
                </button>
                <button 
                  className={`toggle-btn ${modifyType === 'QTY' ? 'active' : ''}`}
                  onClick={() => {
                    setModifyType('QTY');
                    setNewPrice(selectedOrder.price / 1000);
                  }}
                >
                  {t("admin.trades.modalModifyTypeQty")}
                </button>
              </div>

              {/* Dynamic Input Row */}
              {modifyType === 'PRICE' ? (
                <div className="modify-input-section">
                  <label>{t("admin.trades.modalModifyNewPriceLabel")}</label>
                  <div className="number-input">
                    <button onClick={() => {
                      const tick = getTickSize(newPrice, selectedOrder.stock?.exchange || 'HOSE');
                      setNewPrice(prev => parseFloat(Math.max(0, prev - tick).toFixed(2)));
                    }}>-</button>
                    <input 
                      type="number"
                      step="0.01"
                      value={newPrice}
                      onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                      onBlur={() => {
                        const tick = getTickSize(newPrice, selectedOrder.stock?.exchange || 'HOSE');
                        const rounded = Math.round(newPrice / tick) * tick;
                        setNewPrice(parseFloat(rounded.toFixed(2)));
                      }}
                    />
                    <button onClick={() => {
                      const tick = getTickSize(newPrice, selectedOrder.stock?.exchange || 'HOSE');
                      setNewPrice(prev => parseFloat((prev + tick).toFixed(2)));
                    }}>+</button>
                  </div>
                  <span className="price-hint">
                    {t("admin.trades.modalModifyTickHint", { 
                      tick: (getTickSize(newPrice, selectedOrder.stock?.exchange || 'HOSE') * 1000).toLocaleString('vi-VN'), 
                      exchange: selectedOrder.stock?.exchange || 'HOSE' 
                    })}
                  </span>
                </div>
              ) : (
                <div className="modify-input-section">
                  <label>{t("admin.trades.modalModifyNewQtyLabel")}</label>
                  <div className="number-input">
                    <button onClick={() => {
                      setNewQuantity(prev => {
                        const val = Number(prev);
                        if (val > 100) return val - 100;
                        return Math.max(1, val - 1);
                      });
                    }}>-</button>
                    <input 
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                      onBlur={() => {
                        let val = newQuantity;
                        if (val > 100 && val % 100 !== 0) {
                          val = Math.floor(val / 100) * 100;
                        }
                        setNewQuantity(Math.max(1, val));
                      }}
                    />
                    <button onClick={() => {
                      setNewQuantity(prev => {
                        const val = Number(prev);
                        if (val >= 100) return val + 100;
                        return val + 1;
                      });
                    }}>+</button>
                  </div>
                  <span className="qty-hint">
                    {t("admin.trades.modalModifyQtyHint", { 
                      qty: (selectedOrder.quantity - selectedOrder.remaining_quantity).toLocaleString('vi-VN') 
                    })}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer-custom">
              <button className="btn-modal-back" onClick={() => setShowModifyModal(false)}>
                {t("admin.trades.modalModifyCancelBtn")}
              </button>
              <button 
                className="btn-modal-confirm btn-modify-submit" 
                onClick={handleExecuteModify}
                disabled={modifyingId !== null}
              >
                {modifyingId !== null ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  t("admin.trades.modalModifySaveBtn")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeMonitoring;
