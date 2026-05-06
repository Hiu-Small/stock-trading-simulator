import express from "express";
import companyController from "../controller/companyController.js";

const router = express.Router();

const initCompanyRoutes = (app) => {
  // GET /api/company/stock/:symbol/profile - Lấy hồ sơ công ty
  router.get("/stock/:symbol/profile", companyController.getStockProfile);

  // Lịch sự kiện
  router.get("/stock/:symbol/events", companyController.getStockEvents);

  // Cổ đông
  router.get("/stock/:symbol/shareholders", companyController.getShareholders);
  router.get("/stock/:symbol/ownership", companyController.getOwnership);

  return app.use("/api/company", router);
};

export default initCompanyRoutes;
