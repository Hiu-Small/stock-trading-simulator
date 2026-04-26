import { Routes, Route } from "react-router-dom";
import PrivateRoutes from "./PrivateRoutes";

// TODO: Import các component khi đã tạo
// import Login from "../components/Login/Login";
// import Register from "../components/Register/Register";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Private Routes - yêu cầu đăng nhập */}
      <Route element={<PrivateRoutes />}>
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      </Route>

      {/* Public Routes */}
      {/* <Route path="/login" element={<Login />} /> */}
      {/* <Route path="/register" element={<Register />} /> */}

      <Route path="/" element={<span>Home</span>} />
      <Route path="*" element={<span>404 - Not Found</span>} />
    </Routes>
  );
};

export default AppRoutes;
