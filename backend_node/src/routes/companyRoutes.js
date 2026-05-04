import express from "express";
import companyController from "../controller/companyController.js";

const router = express.Router();

const initCompanyRoutes = (app) => {
  // GET /api/company/stock/:symbol/profile - Lấy hồ sơ công ty
  router.get("/stock/:symbol/profile", companyController.getStockProfile);

  return app.use("/api/company", router);
};

export default initCompanyRoutes;
