import { Navigate, Outlet } from "react-router-dom";

const PrivateRoutes = () => {
  const session = sessionStorage.getItem("account");
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoutes;
