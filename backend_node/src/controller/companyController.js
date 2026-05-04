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

export default {
  getStockProfile,
};
