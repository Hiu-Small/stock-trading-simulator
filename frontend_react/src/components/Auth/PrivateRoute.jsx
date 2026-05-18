import { useContext, useEffect } from 'react';
import { UserContext } from '../../context/UserContext';

/**
 * PrivateRoute — bảo vệ các route cần đăng nhập.
 * Nếu chưa đăng nhập: hiển thị trang chặn + mở modal đăng nhập tự động.
 * Nếu đã đăng nhập: render children bình thường.
 */
const PrivateRoute = ({ children }) => {
    const { user, setShowLoginModal } = useContext(UserContext);

    // Đang khởi tạo (loading) — chưa biết đã đăng nhập chưa
    if (user?.isLoading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '60vh', color: '#6b7280', flexDirection: 'column', gap: 12
            }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
                <span>Đang kiểm tra phiên đăng nhập...</span>
            </div>
        );
    }

    // Chưa đăng nhập — hiển thị màn hình chặn + tự động mở modal login
    if (!user?.isAuthenticated) {
        return <AuthWall openLogin={() => setShowLoginModal(true)} />;
    }

    return children;
};

const AuthWall = ({ openLogin }) => {
    // Tự mở modal login ngay khi render trang này
    useEffect(() => {
        openLogin();
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '65vh',
            gap: 20,
            color: '#e0e0f0',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                width: 72, height: 72,
                background: 'rgba(74, 157, 255, 0.1)',
                border: '1px solid rgba(74, 157, 255, 0.3)',
                borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <i className="fa-solid fa-lock" style={{ fontSize: 30, color: 'rgb(74, 157, 255)' }}></i>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Yêu cầu đăng nhập</h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 340 }}>
                Bạn cần đăng nhập để truy cập tính năng này. Vui lòng đăng nhập để tiếp tục.
            </p>
            <button
                onClick={openLogin}
                style={{
                    padding: '11px 28px',
                    background: 'linear-gradient(135deg, rgb(74, 157, 255), #3b82f6)',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(74, 157, 255, 0.3)',
                    transition: 'all 0.2s'
                }}
            >
                <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 8 }}></i>
                Đăng nhập ngay
            </button>
        </div>
    );
};

export default PrivateRoute;
