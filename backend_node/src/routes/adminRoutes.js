import express from "express";
import adminController from "../controller/adminController";
import { checkUserJWT, checkAdminRole } from "../middleware/jwtMiddleware";

const router = express.Router();

const initAdminRoutes = (app) => {
    // Route này chỉ dành cho Admin
    router.get("/users", checkUserJWT, checkAdminRole, adminController.handleGetAllUsers);
    router.post("/update-balance", checkUserJWT, checkAdminRole, adminController.handleUpdateBalance);
    router.post("/update-status", checkUserJWT, checkAdminRole, adminController.handleUpdateStatus);
    router.post("/update-user", checkUserJWT, checkAdminRole, adminController.handleUpdateUser);
    router.post("/reset-password", checkUserJWT, checkAdminRole, adminController.handleResetPassword);
    router.post("/reset-pin", checkUserJWT, checkAdminRole, adminController.handleResetPin);

    return app.use("/api/admin", router);
};

export default initAdminRoutes;
