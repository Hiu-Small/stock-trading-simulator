/**
 * marketController.js
 * Controller xử lý các request về dữ liệu thị trường chứng khoán
 */

import marketService from "../service/marketService.js";

/**
 * GET /api/market/indices
 * Trả về tất cả chỉ số: VNINDEX, HNX-INDEX, VN30, UPCOM
 */
const getAllIndices = async (req, res) => {
  try {
    const data = await marketService.getAllIndices();
    if (data && data.success === false) {
      return res.status(502).json(data); // 502 Bad Gateway - Lỗi từ Python
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getAllIndices lỗi:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy dữ liệu chỉ số",
      error: err.message,
    });
  }
};

/**
 * GET /api/market/indices/:symbol
 * Trả về 1 chỉ số cụ thể (VNINDEX, HNX-INDEX, VN30, UPCOM)
 */
const getIndexBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số symbol",
      });
    }

    const data = await marketService.getIndexBySymbol(symbol.toUpperCase());
    if (data && data.success === false) {
      return res.status(502).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getIndexBySymbol lỗi:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
    });
  }
};

/**
 * GET /api/market/indices/:symbol/intraday
 * Lấy đồ thị phút của chỉ số
 */
const getIndexIntraday = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ success: false, message: "Thiếu symbol" });
    }
    const data = await marketService.getIndexIntraday(symbol.toUpperCase());
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getIndexIntraday lỗi:", err);
    return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/**
 * GET /api/market/indices/:symbol/history?days=30&interval=1D
 * Lấy lịch sử giá của chỉ số để vẽ chart
 */
const getIndexHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 30;
    const interval = req.query.interval || "1D";

    const data = await marketService.getIndexHistory(symbol, days, interval);
    if (data && data.success === false) {
      return res.status(502).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getIndexHistory lỗi:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
    });
  }
};

/**
 * GET /api/market/board/:group
 * Lấy dữ liệu bảng giá chứng khoán theo nhóm
 */
const getBoardByGroup = async (req, res) => {
  try {
    const { group } = req.params;
    if (!group) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số group (VN30, HNX30, VN100, VNALL)",
      });
    }

    const data = await marketService.getBoardByGroup(group.toUpperCase());
    if (data && data.success === false) {
      return res.status(404).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getBoardByGroup lỗi:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy bảng giá",
      error: err.message,
    });
  }
};

/**
 * GET /api/market/health
 * Kiểm tra trạng thái kết nối tới Python backend
 */
const checkHealth = async (req, res) => {
  try {
    const pythonStatus = await marketService.checkPythonHealth();
    return res.status(200).json({
      nodeServer: "ok",
      pythonBackend: pythonStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      nodeServer: "error",
      error: err.message,
    });
  }
};

/**
 * GET /api/market/stock/:symbol
 * Lấy chi tiết 1 cổ phiếu
 */
const getStockDetail = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số symbol",
      });
    }

    const data = await marketService.getStockDetail(symbol.toUpperCase());
    if (data && data.success === false) {
      return res.status(404).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getStockDetail lỗi:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết cổ phiếu",
      error: err.message,
    });
  }
};

/**
 * GET /api/market/stock/:symbol/intraday
 * Lấy lịch sử khớp lệnh trong ngày
 */
const getStockIntraday = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số symbol",
      });
    }

    const data = await marketService.getStockIntraday(symbol.toUpperCase());
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getStockIntraday lỗi:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy lịch sử khớp lệnh",
      error: err.message,
    });
  }
};

/**
 * GET /api/market/stock/:symbol/history?days=90&interval=1D
 * Lấy lịch sử OHLCV để vẽ TradingView chart
 */
const getStockHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 90;
    const interval = req.query.interval || "1D";
    if (!symbol) {
      return res.status(400).json({ success: false, message: "Thiếu tham số symbol" });
    }
    const data = await marketService.getStockHistory(symbol.toUpperCase(), days, interval);
    return res.status(200).json(data);
  } catch (err) {
    console.error("[marketController] getStockHistory lỗi:", err);
    return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

export default {
  getAllIndices,
  getIndexBySymbol,
  getIndexIntraday,
  getIndexHistory,
  getBoardByGroup,
  getStockDetail,
  getStockIntraday,
  getStockHistory,
  checkHealth,
};
