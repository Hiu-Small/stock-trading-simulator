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
import { UserProvider } from "./context/UserContext";
import { SearchProvider } from "./context/SearchContext";
import MainLayout from "./components/Layout/MainLayout";

function App() {
  return (
    <UserProvider>
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
        <Route path="/asset" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/news" element={<MainLayout><HomePage /></MainLayout>} />

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
      </Router>
      </SearchProvider>
    </UserProvider>
  );
}

export default App;
