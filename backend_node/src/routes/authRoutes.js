import express from "express";
import authController from "../controller/authController";
import { checkUserJWT } from "../middleware/jwtMiddleware";

const router = express.Router();

const initAuthRoutes = (app) => {
    router.post("/register", authController.handleRegister);
    router.post("/login", authController.handleLogin);
    
    // Các route bảo mật cần token
    router.post("/complete-kyc", checkUserJWT, authController.handleCompleteKYC);
    router.post("/setup-pin", checkUserJWT, authController.handleSetupPIN);
    router.get("/profile", checkUserJWT, authController.handleGetProfile);
    router.post("/update-profile", checkUserJWT, authController.handleUpdateProfile);
    router.post("/change-password", checkUserJWT, authController.handleChangePassword);
    router.post("/change-pin", checkUserJWT, authController.handleChangePin);
    router.post("/verify-pin", checkUserJWT, authController.handleVerifyPin);
    router.post("/notifications/read-all", checkUserJWT, authController.handleMarkAllNotificationsRead);
    router.post("/notifications/:id/read", checkUserJWT, authController.handleMarkNotificationRead);


    // Example protected route
    router.get("/me", checkUserJWT, (req, res) => {
        return res.status(200).json({
            EC: 0,
            DT: req.user,
            EM: 'OK'
        });
    });

    return app.use("/api", router);
};

export default initAuthRoutes;
