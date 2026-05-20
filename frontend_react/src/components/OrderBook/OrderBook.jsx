import React, { useState, useEffect, useCallback, useContext } from 'react';
import { toast } from 'react-toastify';
import { getMyOrders, cancelOrder, modifyOrderAPI } from '../../services/orderService';
import { verifyPin } from '../../services/userService';
import { UserContext } from '../../context/UserContext';
import './OrderBook.scss';


const STATUS_LABELS = {
    PENDING: { label: 'Chờ khớp', color: '#f59e0b' },
    PARTIAL_MATCHED: { label: 'Khớp 1 phần', color: '#60a5fa' },
    MATCHED: { label: 'Khớp lệnh', color: '#00c805' },
    CANCELLED: { label: 'Đã hủy', color: '#6b7280' },
    FAILED_STUCK: { label: 'Thất bại', color: '#ff4d4f' },
};

const SIDE_LABELS = {
    BUY: { label: 'MUA', color: '#00c805' },
    SELL: { label: 'BÁN', color: '#ff4d4f' },
};

const STATUS_FILTERS = [
    { value: '', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ khớp' },
    { value: 'PARTIAL_MATCHED', label: 'Khớp 1 phần' },
    { value: 'MATCHED', label: 'Đã khớp' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const OrderBook = () => {
    const { refreshBalance } = useContext(UserContext);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const LIMIT = 15;

    // Modification states
    const [showModifyModal, setShowModifyModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [modifyType, setModifyType] = useState('PRICE'); // 'PRICE' | 'QTY'
    const [newPrice, setNewPrice] = useState(0);
    const [newQuantity, setNewQuantity] = useState(0);
    const [modifyingId, setModifyingId] = useState(null);

    // PIN states for modification
    const [showPinConfirm, setShowPinConfirm] = useState(false);
    const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);

    // Helper to get today's date in YYYY-MM-DD local format
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useState(getTodayDateString());
    const [endDate, setEndDate] = useState(getTodayDateString());

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMyOrders({ 
                page, 
                limit: LIMIT, 
                status: statusFilter || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            });
            if (res && res.EC === 0) {
                setOrders(res.DT.orders);
                setTotalPages(res.DT.totalPages);
            }
        } catch (e) {
            toast.error('Không tải được danh sách lệnh');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, startDate, endDate]);

    useEffect(() => {
        fetchOrders();
        // Tự động refresh mỗi 10s để cập nhật trạng thái khớp lệnh
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const handleCancel = (orderId) => {
        setSelectedOrderId(orderId);
        setShowCancelModal(true);
    };

    const executeCancel = async (orderId) => {
        setCancellingId(orderId);
        try {
            const res = await cancelOrder(orderId);
            if (res && res.EC === 0) {
                toast.success('Đã hủy lệnh thành công!');
                fetchOrders();
                refreshBalance();
            } else {
                toast.error(res?.EM || 'Không thể hủy lệnh');
            }
        } catch (e) {
            toast.error('Lỗi khi hủy lệnh');
        } finally {
            setCancellingId(null);
            setSelectedOrderId(null);
        }
    };

    const getTickSize = (priceVal, exchange = 'HOSE') => {
        const currentExchange = (exchange || 'HOSE').toUpperCase();
        const p = Number(priceVal || 0);
        
        if (currentExchange === 'HNX' || currentExchange === 'UPCOM') {
            return 0.10;
        }
        
        // Sàn HOSE
        if (p < 10.00) {
            return 0.01;
        } else if (p < 50.00) {
            return 0.05;
        } else {
            return 0.10;
        }
    };

    const handleOpenModify = (order) => {
        setSelectedOrder(order);
        setModifyType('PRICE');
        setNewPrice(order.price / 1000);
        setNewQuantity(order.quantity);
        setShowPinConfirm(false);
        setPinDigits(["", "", "", "", "", ""]);
        setShowModifyModal(true);
    };

    const handlePinInput = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newPin = [...pinDigits];
        newPin[index] = value.slice(-1);
        setPinDigits(newPin);

        // Tự động focus ô tiếp theo
        if (value && index < 5) {
            const nextInput = document.querySelector(`input[name="confirm-modify-pin-${index + 1}"]`);
            if (nextInput) nextInput.focus();
        }
    };

    const handlePinKeyDown = (e, index) => {
        if (e.key === "Backspace") {
            const newPin = [...pinDigits];
            if (!newPin[index] && index > 0) {
                const prevInput = document.querySelector(`input[name="confirm-modify-pin-${index - 1}"]`);
                if (prevInput) {
                    prevInput.focus();
                    const prevPin = [...newPin];
                    prevPin[index - 1] = "";
                    setPinDigits(prevPin);
                }
            } else {
                newPin[index] = "";
                setPinDigits(newPin);
            }
        }
    };

    const handleExecuteModify = async () => {
        if (!selectedOrder) return;

        // Nếu chưa bật PIN confirm, chuyển qua bước nhập PIN
        if (!showPinConfirm) {
            // Validate sơ bộ
            if (modifyType === 'PRICE') {
                const p = parseFloat(newPrice);
                if (isNaN(p) || p <= 0) {
                    toast.error("Vui lòng nhập giá mới hợp lệ!");
                    return;
                }
                if (p * 1000 === parseFloat(selectedOrder.price)) {
                    toast.error("Giá mới phải khác giá hiện tại!");
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
                    toast.error(`Giá mới không hợp lệ! Với sàn ${currentExchange}, giá phải là bội số của ${tickInt} VNĐ.`);
                    return;
                }
            } else {
                const q = parseInt(newQuantity);
                const matchedQty = selectedOrder.quantity - selectedOrder.remaining_quantity;
                if (isNaN(q) || q <= 0) {
                    toast.error("Vui lòng nhập khối lượng mới hợp lệ!");
                    return;
                }
                if (q === selectedOrder.quantity) {
                    toast.error("Khối lượng mới phải khác khối lượng cũ!");
                    return;
                }
                if (q <= matchedQty) {
                    toast.error(`Khối lượng đặt mới phải lớn hơn khối lượng đã khớp (${matchedQty} CP)!`);
                    return;
                }
                if (q >= 100 && q % 100 !== 0) {
                    toast.error("Khối lượng đặt từ 100 CP trở lên phải là bội số của 100!");
                    return;
                }
            }

            setShowPinConfirm(true);
            return;
        }

        // Bước thực hiện gửi request kèm verify PIN
        const pin = pinDigits.join("");
        if (pin.length < 6) {
            toast.error("Vui lòng nhập đầy đủ mã PIN 6 số!");
            return;
        }

        setModifyingId(selectedOrder.id);
        try {
            // 1. Xác thực mã PIN trước
            const verifyRes = await verifyPin(pin);
            if (!verifyRes || verifyRes.EC !== 0) {
                toast.error(verifyRes?.EM || "Mã PIN không chính xác!");
                setModifyingId(null);
                return;
            }

            // 2. Gửi API sửa lệnh
            const dataToSubmit = {};
            if (modifyType === 'PRICE') {
                dataToSubmit.newPrice = newPrice * 1000;
            } else {
                dataToSubmit.newQuantity = newQuantity;
            }

            const modifyRes = await modifyOrderAPI(selectedOrder.id, dataToSubmit.newPrice, dataToSubmit.newQuantity);
            if (modifyRes && modifyRes.EC === 0) {
                toast.success("Sửa lệnh thành công!");
                setShowModifyModal(false);
                fetchOrders();
                refreshBalance();
            } else {
                toast.error(modifyRes?.EM || "Không thể sửa lệnh!");
            }
        } catch (error) {
            console.error("Error modifying order:", error);
            toast.error("Đã xảy ra lỗi khi sửa lệnh!");
        } finally {
            setModifyingId(null);
            setPinDigits(["", "", "", "", "", ""]);
        }
    };

    const formatPrice = (p) => Number(p).toLocaleString('vi-VN');
    const formatDate = (d) => new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

    const todayStr = getTodayDateString();
    const isFiltered = startDate !== todayStr || endDate !== todayStr;

    return (
        <div className="orderbook-page">
            <div className="ob-header">
                <div className="ob-title">
                    <i className="fa-solid fa-list-check"></i>
                    <div>
                        <h1>Sổ lệnh</h1>
                        <p>Theo dõi trạng thái và lịch sử các lệnh giao dịch</p>
                    </div>
                </div>
                <button className="btn-refresh" onClick={fetchOrders}>
                    <i className="fa-solid fa-rotate"></i> Làm mới
                </button>
            </div>

            {/* Filter bar */}
            <div className="ob-filters">
                <div className="status-filters">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f.value}
                            className={`filter-btn ${statusFilter === f.value ? 'active' : ''}`}
                            onClick={() => { setStatusFilter(f.value); setPage(1); }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="date-filters">
                    <div className="date-input-group">
                        <span>Từ:</span>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }} 
                        />
                    </div>
                    <span className="date-sep">|</span>
                    <div className="date-input-group">
                        <span>Đến:</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }} 
                        />
                    </div>
                    {isFiltered && (
                        <button 
                            className="btn-clear-date" 
                            onClick={() => { 
                                setStartDate(todayStr); 
                                setEndDate(todayStr); 
                                setPage(1); 
                            }}
                            title="Đặt lại về hôm nay"
                        >
                            <i className="fa-solid fa-xmark"></i> Xóa lọc
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="ob-table-wrapper">
                {loading ? (
                    <div className="ob-loading">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="ob-empty">
                        <i className="fa-solid fa-inbox"></i>
                        <p>Chưa có lệnh giao dịch nào</p>
                    </div>
                ) : (
                    <table className="ob-table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Mã CP</th>
                                <th>Loại</th>
                                <th>Giá lệnh</th>
                                <th>KL đặt</th>
                                <th>KL còn lại</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const status = STATUS_LABELS[order.status] || { label: order.status, color: '#888' };
                                const side = SIDE_LABELS[order.side] || { label: order.side, color: '#888' };
                                const canCancel = order.status === 'PENDING' || order.status === 'PARTIAL_MATCHED';
                                const filledQty = order.quantity - order.remaining_quantity;
                                const fillPct = order.quantity > 0 ? Math.round((filledQty / order.quantity) * 100) : 0;
                                const trades = order.trades || [];
                                return (
                                    <React.Fragment key={order.id}>
                                        <tr>
                                            <td className="col-time">{formatDate(order.createdAt)}</td>
                                            <td className="col-symbol">
                                                <div>{order.symbol}</div>
                                                {order.stock?.company_name && (
                                                    <div className="col-company">{order.stock.company_name}</div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="side-badge" style={{ color: side.color, borderColor: side.color }}>
                                                    {side.label}
                                                </span>
                                            </td>
                                            <td className="col-price">{formatPrice(order.price)}</td>
                                            <td>{order.quantity.toLocaleString()}</td>
                                            <td>
                                                <div className="fill-cell">
                                                    <span>{order.remaining_quantity.toLocaleString()}</span>
                                                    {(order.status === 'PARTIAL_MATCHED' || order.status === 'MATCHED') && order.quantity > 0 && (
                                                        <div className="fill-bar">
                                                            <div className="fill-progress" style={{ width: `${fillPct}%` }}></div>
                                                        </div>
                                                    )}
                                                    {filledQty > 0 && (
                                                        <span className="filled-label">{filledQty.toLocaleString()} đã khớp</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="status-badge" style={{ color: status.color, borderColor: status.color }}>
                                                    <span className="status-dot" style={{ background: status.color }}></span>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td>
                                                {canCancel && (
                                                    <div className="action-buttons-group">
                                                        <button
                                                            className="btn-modify-order"
                                                            onClick={() => handleOpenModify(order)}
                                                        >
                                                            <i className="fa-solid fa-pen-to-square"></i> Sửa
                                                        </button>
                                                        <button
                                                            className="btn-cancel-order"
                                                            onClick={() => handleCancel(order.id)}
                                                            disabled={cancellingId === order.id}
                                                        >
                                                            {cancellingId === order.id
                                                                ? <i className="fa-solid fa-spinner fa-spin"></i>
                                                                : <><i className="fa-solid fa-xmark"></i> Hủy</>
                                                            }
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {/* Trade history rows — hiển thị lịch sử khớp lệnh liên kết */}
                                        {trades.length > 0 && trades.map(trade => (
                                            <tr key={`trade-${trade.id}`} className="trade-detail-row">
                                                <td className="trade-indent" colSpan={2}>
                                                    <div className="trade-indent-inner">
                                                        <i className="fa-solid fa-arrow-turn-down-right"></i>
                                                        <span className="trade-label">Khớp lúc {formatDate(trade.matched_at)}</span>
                                                    </div>
                                                </td>
                                                <td></td>
                                                <td className="trade-price">{formatPrice(trade.price)}</td>
                                                <td>{trade.quantity.toLocaleString()}</td>
                                                <td></td>
                                                <td className="trade-fee">Phí: {formatPrice(trade.fee_amount)} ₫</td>
                                                <td></td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="ob-pagination">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span>Trang {page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            )}

            {/* Modal Xác nhận hủy lệnh premium */}
            {showCancelModal && (
                <div className="cancel-confirm-modal-overlay" onClick={() => setShowCancelModal(false)}>
                    <div className="cancel-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-custom">
                            <div className="modal-title-custom">
                                <i className="fa-solid fa-triangle-exclamation warning-icon"></i>
                                <h2>Xác nhận hủy lệnh</h2>
                            </div>
                            <button className="btn-close-modal" onClick={() => setShowCancelModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="modal-body-custom">
                            <p>Bạn có chắc chắn muốn hủy lệnh đang chờ khớp này không?</p>
                            {orders.find(o => o.id === selectedOrderId) && (() => {
                                const o = orders.find(o => o.id === selectedOrderId);
                                const side = SIDE_LABELS[o.side] || { label: o.side, color: '#888' };
                                return (
                                    <div className="order-summary-box">
                                        <div className="summary-row">
                                            <span>Mã cổ phiếu:</span>
                                            <strong className="val-symbol">{o.symbol}</strong>
                                        </div>
                                        <div className="summary-row">
                                            <span>Loại lệnh:</span>
                                            <strong style={{ color: side.color }}>{side.label}</strong>
                                        </div>
                                        <div className="summary-row">
                                            <span>Giá đặt:</span>
                                            <strong>{formatPrice(o.price)} ₫</strong>
                                        </div>
                                        <div className="summary-row">
                                            <span>Khối lượng còn lại:</span>
                                            <strong>{o.remaining_quantity.toLocaleString()} CP</strong>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="modal-footer-custom">
                            <button className="btn-modal-back" onClick={() => setShowCancelModal(false)}>
                                Quay lại
                            </button>
                            <button 
                                className="btn-modal-confirm" 
                                onClick={() => {
                                    setShowCancelModal(false);
                                    executeCancel(selectedOrderId);
                                }}
                            >
                                Xác nhận hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Sửa lệnh premium */}
            {showModifyModal && selectedOrder && (
                <div className="modify-confirm-modal-overlay" onClick={() => setShowModifyModal(false)}>
                    <div className="modify-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-custom">
                            <div className="modal-title-custom">
                                <i className="fa-solid fa-pen-to-square modify-icon"></i>
                                <h2>Sửa lệnh giao dịch</h2>
                            </div>
                            <button className="btn-close-modal" onClick={() => setShowModifyModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="modal-body-custom">
                            {/* Order Info Summary */}
                            <div className="order-summary-box">
                                <div className="summary-row">
                                    <span>Mã cổ phiếu:</span>
                                    <strong className="val-symbol">{selectedOrder.symbol}</strong>
                                </div>
                                <div className="summary-row">
                                    <span>Loại lệnh:</span>
                                    <strong style={{ color: selectedOrder.side === 'BUY' ? '#00c805' : '#ff4d4f' }}>
                                        {selectedOrder.side === 'BUY' ? 'MUA' : 'BÁN'}
                                    </strong>
                                </div>
                                <div className="summary-row">
                                    <span>Giá hiện tại:</span>
                                    <strong>{formatPrice(selectedOrder.price)} ₫</strong>
                                </div>
                                <div className="summary-row">
                                    <span>KL đặt cũ / Đã khớp:</span>
                                    <strong>{selectedOrder.quantity.toLocaleString()} / {(selectedOrder.quantity - selectedOrder.remaining_quantity).toLocaleString()} CP</strong>
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
                                    Sửa Giá
                                </button>
                                <button 
                                    className={`toggle-btn ${modifyType === 'QTY' ? 'active' : ''}`}
                                    onClick={() => {
                                        setModifyType('QTY');
                                        setNewPrice(selectedOrder.price / 1000);
                                    }}
                                >
                                    Sửa Khối lượng
                                </button>
                            </div>

                            {/* Dynamic Input Row */}
                            {modifyType === 'PRICE' ? (
                                <div className="modify-input-section">
                                    <label>Giá mới (x1000 VNĐ)</label>
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
                                        Bước giá hiện tại: {(getTickSize(newPrice, selectedOrder.stock?.exchange || 'HOSE') * 1000).toLocaleString()} ₫ (Sàn {selectedOrder.stock?.exchange || 'HOSE'})
                                    </span>
                                </div>
                            ) : (
                                <div className="modify-input-section">
                                    <label>Khối lượng đặt mới (CP)</label>
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
                                        Khối lượng đặt mới phải lớn hơn khối lượng đã khớp: {(selectedOrder.quantity - selectedOrder.remaining_quantity).toLocaleString()} CP
                                    </span>
                                </div>
                            )}

                            {/* PIN Code entry */}
                            {showPinConfirm && (
                                <div className="pin-confirmation-wrapper" style={{ marginTop: '20px' }}>
                                    <label className="pin-label">Nhập mã PIN để xác nhận sửa lệnh</label>
                                    <div className="pin-input-container">
                                        {pinDigits.map((digit, index) => (
                                            <input
                                                key={index}
                                                type="password"
                                                name={`confirm-modify-pin-${index}`}
                                                maxLength="1"
                                                value={digit}
                                                onChange={(e) => handlePinInput(index, e.target.value)}
                                                onKeyDown={(e) => handlePinKeyDown(e, index)}
                                                className="pin-box"
                                                autoFocus={index === 0}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer-custom">
                            <button className="btn-modal-back" onClick={() => {
                                if (showPinConfirm) {
                                    setShowPinConfirm(false);
                                    setPinDigits(["", "", "", "", "", ""]);
                                } else {
                                    setShowModifyModal(false);
                                }
                            }}>
                                {showPinConfirm ? "Quay lại" : "Hủy"}
                            </button>
                            <button 
                                className="btn-modal-confirm btn-modify-submit" 
                                onClick={handleExecuteModify}
                                disabled={modifyingId !== null}
                            >
                                {modifyingId !== null ? (
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                ) : showPinConfirm ? (
                                    "Xác nhận Sửa"
                                ) : (
                                    "Tiếp tục"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderBook;
