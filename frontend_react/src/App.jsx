import "./App.scss";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HomePage from "./components/HomePage/HomePage";
import AdminLayout from "./components/Admin/AdminLayout";
import RegisterPage from "./components/Onboarding/RegisterPage";
import OnboardingProcess from "./components/Onboarding/OnboardingProcess";
import Profile from "./components/User/Profile";
import AccountSettings from "./components/User/AccountSettings";
import OrderBook from "./components/OrderBook/OrderBook";
import Portfolio from "./components/Portfolio/Portfolio";
import PrivateRoute from "./components/Auth/PrivateRoute";
import { UserProvider } from "./context/UserContext";
import { SearchProvider } from "./context/SearchContext";
import MainLayout from "./components/Layout/MainLayout";
import { UserContext } from "./context/UserContext";
import LoginModal from "./components/Auth/LoginModal";
import { useContext } from "react";

function AppContent() {
  const { showLoginModal, setShowLoginModal } = useContext(UserContext);

  return (
    <SearchProvider>
      <Router>
        <Routes>
          {/* Route cho quản trị viên (Admin) */}
          <Route path="/admin/*" element={<AdminLayout />} />

          {/* Route cho người dùng (Customer) */}
          <Route path="/" element={<Navigate to="/market" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingProcess />} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/account" element={<MainLayout><AccountSettings /></MainLayout>} />
          
          {/* Các route khác của HomePage */}
          <Route path="/market" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/analysis" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/news" element={<MainLayout><HomePage /></MainLayout>} />

          {/* Asset Management routes — yêu cầu đăng nhập */}
          <Route path="/orders" element={
            <MainLayout>
              <PrivateRoute><OrderBook /></PrivateRoute>
            </MainLayout>
          } />
          <Route path="/portfolio" element={
            <MainLayout>
              <PrivateRoute><Portfolio /></PrivateRoute>
            </MainLayout>
          } />

          {/* Fallback cho các link không tồn tại */}
          <Route path="*" element={<HomePage />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />

        <LoginModal 
          show={showLoginModal} 
          handleClose={() => setShowLoginModal(false)} 
        />
      </Router>
    </SearchProvider>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
