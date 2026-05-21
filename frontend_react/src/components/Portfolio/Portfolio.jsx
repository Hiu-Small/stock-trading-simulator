import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { getMyHoldings } from '../../services/orderService';
import { getUserProfile } from '../../services/userService';
import { UserContext } from '../../context/UserContext';
import StockDetailModal from '../StockModal/StockDetailModal';
import { useTranslation } from '../../context/LanguageContext';
import './Portfolio.scss';

const Portfolio = () => {
    const { t, lang } = useTranslation();
    const { balance, refreshBalance } = useContext(UserContext);
    const [holdings, setHoldings] = useState([]);
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sellModal, setSellModal] = useState(null); // { symbol }  khi mở modal bán

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
                        <h1>{t("portfolio.title")}</h1>
                        <p>{t("portfolio.subtitle")}</p>
                    </div>
                </div>
                <button className="btn-refresh" onClick={() => { fetchData(true); refreshBalance(); }}>
                    <i className="fa-solid fa-rotate"></i> {t("portfolio.refresh")}
                </button>
            </div>

            <div className="pf-summary-cards">
                <div className="summary-card total-assets">
                    <div className="card-label">{t("portfolio.summary.totalAssets")}</div>
                    <div className="card-value">{fmt(totalAssets)} <span className="unit">₫</span></div>
                </div>
                <div className="summary-card cash">
                    <div className="card-label">{t("portfolio.summary.availableCash")}</div>
                    <div className="card-value green">{fmt(availableBalance)} <span className="unit">₫</span></div>
                    {parseFloat(wallet?.pending_cash || 0) > 0 && (
                        <div className="card-sub pending" style={{ color: '#ffc107', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <i className="fa-regular fa-clock"></i> {t("portfolio.summary.pendingCash").replace("{amount}", fmt(wallet.pending_cash))}
                        </div>
                    )}
                    {parseFloat(wallet?.frozen_balance || 0) > 0 && (
                        <div className="card-sub">
                            {t("portfolio.summary.frozenCash").replace("{amount}", fmt(wallet.frozen_balance))}
                        </div>
                    )}
                </div>
                <div className="summary-card invested">
                    <div className="card-label">{t("portfolio.summary.totalInvested")}</div>
                    <div className="card-value orange">{fmt(totalInvested)} <span className="unit">₫</span></div>
                </div>
                <div className="summary-card stocks">
                    <div className="card-label">{t("portfolio.summary.stockValue")}</div>
                    <div className="card-value blue">{fmt(totalHoldingValue)} <span className="unit">₫</span></div>
                </div>
                <div className={`summary-card pnl ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                    <div className="card-label">{t("portfolio.summary.estimatedPnL")}</div>
                    <div className="card-value">{totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)} <span className="unit">₫</span></div>
                    <div className="card-pct">{fmtPct(totalPnLPct)}</div>
                </div>
            </div>

            {/* Holdings table */}
            <div className="pf-table-wrapper">
                <div className="pf-table-title">{t("portfolio.table.title").replace("{count}", holdings.length)}</div>
                {loading ? (
                    <div className="pf-loading">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>{t("portfolio.table.loading")}</span>
                    </div>
                ) : holdings.length === 0 ? (
                    <div className="pf-empty">
                        <i className="fa-solid fa-chart-line"></i>
                        <p>{t("portfolio.table.emptyTitle")}</p>
                        <span>{t("portfolio.table.emptySubtitle")}</span>
                    </div>
                ) : (
                    <table className="pf-table">
                        <thead>
                            <tr>
                                <th>{t("portfolio.table.headers.symbol")}</th>
                                <th>{t("portfolio.table.headers.company")}</th>
                                <th>{t("portfolio.table.headers.exchange")}</th>
                                <th>{t("portfolio.table.headers.quantity")}</th>
                                <th>{t("portfolio.table.headers.avgPrice")}</th>
                                <th>{t("portfolio.table.headers.curPrice")}</th>
                                <th>{t("portfolio.table.headers.marketValue")}</th>
                                <th>{t("portfolio.table.headers.pnl")}</th>
                                <th>{t("portfolio.table.headers.pnlPct")}</th>
                                <th className="col-action-head">{t("portfolio.table.headers.action")}</th>
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
                                        <td className="col-action">
                                            {(h.sellableQuantity ?? 0) > 0 ? (
                                                <button
                                                    className="btn-sell"
                                                    title={t("portfolio.table.actions.sellTitle").replace("{symbol}", h.stock?.symbol || '').replace("{qty}", (h.sellableQuantity || 0).toLocaleString())}
                                                    onClick={() => setSellModal({ symbol: h.stock?.symbol })}
                                                >
                                                    <i className="fa-solid fa-arrow-trend-down" />
                                                    {t("portfolio.table.actions.sell")}
                                                </button>
                                            ) : (
                                                <span className="badge-pending" title={t("portfolio.table.actions.pendingT25Title")}>
                                                    <i className="fa-regular fa-clock" />
                                                    {t("portfolio.table.actions.pendingT25")}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal đặt lệnh bán */}
            {sellModal && (
                <StockDetailModal
                    symbol={sellModal.symbol}
                    onlyOrder={true}
                    defaultSide="SELL"
                    onClose={() => setSellModal(null)}
                    onChangeSymbol={(s) => setSellModal({ symbol: s })}
                />
            )}
        </div>
    );
};

export default Portfolio;
