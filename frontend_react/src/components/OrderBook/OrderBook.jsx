import React, { useState, useEffect, useCallback, useContext } from 'react';
import { toast } from 'react-toastify';
import { getMyOrders, cancelOrder } from '../../services/orderService';
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
                                                    <button
                                                        className="btn-cancel-order"
                                                        onClick={() => handleCancel(order.id)}
                                                        disabled={cancellingId === order.id}
                                                    >
                                                        {cancellingId === order.id
                                                            ? <i className="fa-solid fa-spinner fa-spin"></i>
                                                            : <><i className="fa-solid fa-xmark"></i> Hủy lệnh</>
                                                        }
                                                    </button>
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
        </div>
    );
};

export default OrderBook;
