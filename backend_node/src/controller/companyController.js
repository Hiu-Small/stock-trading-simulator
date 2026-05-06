import companyService from "../service/companyService.js";

/**
 * GET /api/company/stock/:symbol/profile
 * Lấy hồ sơ công ty
 */
const getStockProfile = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ success: false, message: "Thiếu tham số symbol" });
    }
    const data = await companyService.getStockProfile(symbol.toUpperCase());
    if (data && data.success === false) {
      return res.status(404).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error("[companyController] getStockProfile lỗi:", err);
    return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/**
 * GET /api/company/stock/:symbol/shareholders
 * Lấy danh sách cổ đông
 */
const getShareholders = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ success: false, message: "Thiếu tham số symbol" });
    }
    const data = await companyService.getShareholders(symbol.toUpperCase());
    return res.status(200).json(data);
  } catch (err) {
    console.error("[companyController] getShareholders lỗi:", err);
    return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/**
 * GET /api/company/stock/:symbol/ownership
 * Lấy cơ cấu sở hữu
 */
const getOwnership = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ success: false, message: "Thiếu tham số symbol" });
    }
    const data = await companyService.getOwnership(symbol.toUpperCase());
    return res.status(200).json(data);
  } catch (err) {
    console.error("[companyController] getOwnership lỗi:", err);
    return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/**
 * GET /api/company/stock/:symbol/events
 * Lấy lịch sự kiện doanh nghiệp
 */
const getStockEvents = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ success: false, message: "Thiếu tham số symbol" });
    }
    const data = await companyService.getStockEvents(symbol.toUpperCase());
    return res.status(200).json(data);
  } catch (err) {
    console.error("[companyController] getStockEvents lỗi:", err);
    return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

export default {
  getStockProfile,
  getShareholders,
  getOwnership,
  getStockEvents
};
