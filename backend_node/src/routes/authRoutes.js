import express from "express";
import authController from "../controller/authController";
import { checkUserJWT } from "../middleware/jwtMiddleware";

const router = express.Router();

const initAuthRoutes = (app) => {
    router.post("/register", authController.handleRegister);
    router.post("/login", authController.handleLogin);
    
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
