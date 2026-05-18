import express from "express";
import adminController from "../controller/adminController";
import { checkUserJWT, checkAdminRole } from "../middleware/jwtMiddleware";

const router = express.Router();

const initAdminRoutes = (app) => {
    // Route này chỉ dành cho Admin
    router.get("/users", checkUserJWT, checkAdminRole, adminController.handleGetAllUsers);
    router.get("/orders", checkUserJWT, checkAdminRole, adminController.handleGetAllOrders);
    router.post("/orders/cancel", checkUserJWT, checkAdminRole, adminController.handleForceCancelOrder);
    router.post("/orders/match", checkUserJWT, checkAdminRole, adminController.handleForceMatchOrder);
    router.post("/update-balance", checkUserJWT, checkAdminRole, adminController.handleUpdateBalance);
    router.post("/update-status", checkUserJWT, checkAdminRole, adminController.handleUpdateStatus);
    router.post("/update-user", checkUserJWT, checkAdminRole, adminController.handleUpdateUser);
    router.post("/reset-password", checkUserJWT, checkAdminRole, adminController.handleResetPassword);
    router.post("/reset-pin", checkUserJWT, checkAdminRole, adminController.handleResetPin);
    router.get("/system-logs", checkUserJWT, checkAdminRole, adminController.handleGetSystemLogs);
    router.get("/market-data", checkUserJWT, checkAdminRole, adminController.handleGetMarketData);
    router.post("/update-stock-status", checkUserJWT, checkAdminRole, adminController.handleUpdateStockStatus);
    router.post("/sync-stocks", checkUserJWT, checkAdminRole, adminController.handleSyncStocks);
    router.get("/market-status", checkUserJWT, checkAdminRole, adminController.handleGetMarketStatus);
    router.post("/market-status", checkUserJWT, checkAdminRole, adminController.handleUpdateMarketStatus);
    router.get("/settings", checkUserJWT, checkAdminRole, adminController.handleGetSettings);
    router.post("/settings", checkUserJWT, checkAdminRole, adminController.handleUpdateSettings);

    return app.use("/api/admin", router);
};

export default initAdminRoutes;
