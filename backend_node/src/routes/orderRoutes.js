import express from "express";
import orderController from "../controller/orderController.js";
import { checkUserJWT } from "../middleware/jwtMiddleware.js";

const router = express.Router();

const initOrderRoutes = (app) => {
    // POST /api/order/place-order — Đặt lệnh mới
    router.post("/place-order", checkUserJWT, orderController.handlePlaceOrder);

    // GET /api/order/my-orders — Xem danh sách lệnh của user
    router.get("/my-orders", checkUserJWT, orderController.handleGetMyOrders);

    // DELETE /api/order/:id/cancel — Hủy lệnh
    router.delete("/:id/cancel", checkUserJWT, orderController.handleCancelOrder);

    // GET /api/order/my-holdings — Xem danh mục cổ phiếu
    router.get("/my-holdings", checkUserJWT, orderController.handleGetMyHoldings);

    return app.use("/api/order", router);
};

export default initOrderRoutes;
