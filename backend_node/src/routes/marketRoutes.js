/**
 * marketRoutes.js
 * Định nghĩa các routes cho API thị trường chứng khoán
 */

import express from "express";
import marketController from "../controller/marketController.js";

const router = express.Router();

const initMarketRoutes = (app) => {
  // GET /api/market/health - Kiểm tra trạng thái
  router.get("/health", marketController.checkHealth);

  // GET /api/market/indices - Lấy tất cả chỉ số
  router.get("/indices", marketController.getAllIndices);

  // GET /api/market/indices/:symbol - Lấy 1 chỉ số cụ thể
  // VD: /api/market/indices/VNINDEX
  router.get("/indices/:symbol", marketController.getIndexBySymbol);

  // GET /api/market/indices/:symbol/history - Lấy lịch sử giá
  // VD: /api/market/indices/VNINDEX/history?days=30&interval=1D
  router.get("/indices/:symbol/history", marketController.getIndexHistory);

  // GET /api/market/board/:group - Lấy bảng giá theo nhóm
  // VD: /api/market/board/VN30
  router.get("/board/:group", marketController.getBoardByGroup);

  // GET /api/market/stock/:symbol - Lấy chi tiết 1 cổ phiếu
  // VD: /api/market/stock/AAA
  router.get("/stock/:symbol", marketController.getStockDetail);

  return app.use("/api/market", router);
};

export default initMarketRoutes;
