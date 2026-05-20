import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { getMyHoldings } from '../../services/orderService';
import { getUserProfile } from '../../services/userService';
import { UserContext } from '../../context/UserContext';
import './Portfolio.scss';

const Portfolio = () => {
    const { balance, refreshBalance } = useContext(UserContext);
    const [holdings, setHoldings] = useState([]);
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const [holdingsRes, profileRes] = await Promise.all([
                getMyHoldings(),
                getUserProfile()
            ]);
            if (holdingsRes && holdingsRes.EC === 0) setHoldings(holdingsRes.DT);
            if (profileRes && profileRes.EC === 0) setWallet(profileRes.DT?.wallet);
        } catch (e) {
            console.error('Không tải được danh mục:', e);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        // Tải lần đầu hiển thị màn hình chờ
        fetchData(true);

        // Tự động tải lại ngầm mỗi 5 giây
        const interval = setInterval(() => {
            fetchData(false);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
    const fmtPct = (n) => (n >= 0 ? '+' : '') + Number(n || 0).toFixed(2) + '%';

    const totalHoldingValue = holdings.reduce((sum, h) => sum + parseFloat(h.totalValue || 0), 0);
    const totalInvested = holdings.reduce((sum, h) => sum + parseFloat(h.average_price || 0) * h.quantity, 0);
    const totalPnL = totalHoldingValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    const availableBalance = wallet ? parseFloat(wallet.balance) - parseFloat(wallet.frozen_balance || 0) : 0;
    const totalAssets = (wallet ? parseFloat(wallet.balance) : 0) + parseFloat(wallet?.pending_cash || 0) + totalHoldingValue;

    return (
        <div className="portfolio-page">
            {/* Summary cards */}
            <div className="portfolio-header">
                <div className="pf-title">
                    <i className="fa-solid fa-briefcase"></i>
                    <div>
                        <h1>Danh mục đầu tư</h1>
                        <p>Tổng quan tài sản và hiệu suất đầu tư</p>
                    </div>
                </div>
                <button className="btn-refresh" onClick={() => { fetchData(true); refreshBalance(); }}>
                    <i className="fa-solid fa-rotate"></i> Làm mới
                </button>
            </div>

            <div className="pf-summary-cards">
                <div className="summary-card total-assets">
                    <div className="card-label">Tổng tài sản ước tính</div>
                    <div className="card-value">{fmt(totalAssets)} <span className="unit">₫</span></div>
                </div>
                <div className="summary-card cash">
                    <div className="card-label">Tiền mặt khả dụng</div>
                    <div className="card-value green">{fmt(availableBalance)} <span className="unit">₫</span></div>
                    {parseFloat(wallet?.pending_cash || 0) > 0 && (
                        <div className="card-sub pending" style={{ color: '#ffc107', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <i className="fa-regular fa-clock"></i> Chờ về T+2.5: {fmt(wallet.pending_cash)} ₫
                        </div>
                    )}
                    {parseFloat(wallet?.frozen_balance || 0) > 0 && (
                        <div className="card-sub">Đang đóng băng: {fmt(wallet.frozen_balance)} ₫</div>
                    )}
                </div>
                <div className="summary-card invested">
                    <div className="card-label">Tổng vốn đầu tư</div>
                    <div className="card-value orange">{fmt(totalInvested)} <span className="unit">₫</span></div>
                </div>
                <div className="summary-card stocks">
                    <div className="card-label">Giá trị cổ phiếu</div>
                    <div className="card-value blue">{fmt(totalHoldingValue)} <span className="unit">₫</span></div>
                </div>
                <div className={`summary-card pnl ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                    <div className="card-label">Lãi / Lỗ tạm tính</div>
                    <div className="card-value">{totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)} <span className="unit">₫</span></div>
                    <div className="card-pct">{fmtPct(totalPnLPct)}</div>
                </div>
            </div>

            {/* Holdings table */}
            <div className="pf-table-wrapper">
                <div className="pf-table-title">Danh sách cổ phiếu nắm giữ ({holdings.length} mã)</div>
                {loading ? (
                    <div className="pf-loading">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Đang tải danh mục...</span>
                    </div>
                ) : holdings.length === 0 ? (
                    <div className="pf-empty">
                        <i className="fa-solid fa-chart-line"></i>
                        <p>Bạn chưa có cổ phiếu nào trong danh mục</p>
                        <span>Hãy đặt lệnh mua để bắt đầu đầu tư!</span>
                    </div>
                ) : (
                    <table className="pf-table">
                        <thead>
                            <tr>
                                <th>Mã CP</th>
                                <th>Tên công ty</th>
                                <th>Sàn</th>
                                <th>Số lượng</th>
                                <th>Giá TB mua</th>
                                <th>Giá hiện tại</th>
                                <th>Giá trị thị trường</th>
                                <th>Lãi / Lỗ</th>
                                <th>% Lãi / Lỗ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map(h => {
                                const avgPrice = parseFloat(h.average_price);
                                const curPrice = parseFloat(h.currentPrice || avgPrice);
                                const marketValue = h.quantity * curPrice;
                                const costBasis = h.quantity * avgPrice;
                                const pnl = marketValue - costBasis;
                                const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                                const isPosColor = pnl >= 0 ? '#00c805' : '#ff4d4f';

                                return (
                                    <tr key={h.id}>
                                        <td className="col-symbol">{h.stock?.symbol || '—'}</td>
                                        <td className="col-name">{h.stock?.company_name || '—'}</td>
                                        <td className="col-exchange"><span>{h.stock?.exchange || '—'}</span></td>
                                        <td>{h.quantity.toLocaleString()}</td>
                                        <td className="mono">{fmt(avgPrice)}</td>
                                        <td className="mono">{fmt(curPrice)}</td>
                                        <td className="mono col-value">{fmt(marketValue)}</td>
                                        <td className="mono" style={{ color: isPosColor }}>
                                            {pnl >= 0 ? '+' : ''}{fmt(pnl)}
                                        </td>
                                        <td>
                                            <span className="pnl-badge" style={{ color: isPosColor, borderColor: isPosColor }}>
                                                {fmtPct(pnlPct)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Portfolio;
