import * as marketService from "./marketService";

/**
 * Lấy tất cả chỉ số thị trường (VNINDEX, HNX-INDEX, VN30, UPCOM)
 * @returns {Promise<Array>} Mảng các đối tượng chỉ số
 */
const fetchAllIndices = async () => {
  try {
    const res = await marketService.fetchAllIndices();
    return res;
  } catch (err) {
    console.error("[marketApi] fetchAllIndices lỗi:", err.message);
    return { success: false, data: getFallbackIndices() };
  }
};

/**
 * Lấy 1 chỉ số cụ thể
 * @param {string} symbol - "VNINDEX" | "HNX-INDEX" | "VN30" | "UPCOM"
 */
const fetchIndexBySymbol = async (symbol) => {
  try {
    const res = await marketService.fetchIndexBySymbol(symbol);
    return res.data;
  } catch (err) {
    console.error(`[marketApi] fetchIndex ${symbol} lỗi:`, err.message);
    return null;
  }
};

/**
 * Lấy lịch sử giá của chỉ số (dùng cho chart)
 * @param {string} symbol - "VNINDEX" | "HNX-INDEX" | ...
 * @param {number} days - Số ngày lịch sử
 * @param {string} interval - "1D" | "1W" | "1M"
 */
const fetchIndexHistory = async (symbol, days = 30, interval = "1D") => {
  try {
    const res = await marketService.fetchIndexHistory(symbol, days, interval);
    return res.data || [];
  } catch (err) {
    console.error(`[marketApi] fetchIndexHistory ${symbol} lỗi:`, err.message);
    return [];
  }
};

/**
 * Kiểm tra kết nối backend
 */
const checkBackendHealth = async () => {
  try {
    return await marketService.checkBackendHealth();
  } catch (err) {
    return { nodeServer: "offline", error: err.message };
  }
};

/**
 * Lấy dữ liệu bảng giá theo nhóm
 * @param {string} group - "VN30" | "HNX30" | "VN100" | "VNALL"
 */
const getBoardData = async (group = "VN30") => {
  try {
    const res = await marketService.fetchBoardByGroup(group);
    return res;
  } catch (err) {
    console.error(`[marketApi] getBoardData ${group} lỗi:`, err.message);
    return { success: false, data: [] };
  }
};

/**
 * Lấy thông tin chi tiết của 1 mã cổ phiếu
 * @param {string} symbol - Mã CK (VD: "AAA")
 */
const fetchStockDetail = async (symbol) => {
  try {
    const response = await marketService.fetchStockDetail(symbol);
    return response;
  } catch (err) {
    console.error(`[marketApi] fetchStockDetail ${symbol} lỗi:`, err.message);
    return { success: false, data: null };
  }
};

const fetchMatchingDetail = async (symbol) => {
  try {
    const response = await marketService.fetchMatchingDetail(symbol);
    return response;
  } catch (err) {
    console.error(
      `[marketApi] fetchMatchingDetail ${symbol} lỗi:`,
      err.message,
    );
    return { success: false, data: null };
  }
};

const fetchStockHistory = async (symbol, days = 90, interval = "1D") => {
  try {
    const response = await marketService.fetchStockHistory(symbol, days, interval);
    return response;
  } catch (err) {
    console.error(`[marketApi] fetchStockHistory ${symbol} lỗi:`, err.message);
    return { success: false, data: [] };
  }
};

/**
 * Fallback data khi không kết nối được backend
 * (Giá trị tĩnh để UI không bị trống)
 */
const getFallbackIndices = () => {
  return [
    {
      id: "vnindex",
      name: "VNINDEX",
      value: 1285.42,
      change: 15.32,
      changePercent: 1.21,
      chartUp: true,
      advances: 317,
      declines: 148,
      noChange: 52,
      ceilings: 12,
      floors: 5,
      source: "FALLBACK",
      isMock: true,
    },
    {
      id: "hnxindex",
      name: "HNX-INDEX",
      value: 228.15,
      change: -2.48,
      changePercent: -1.88,
      chartUp: false,
      advances: 98,
      declines: 134,
      noChange: 28,
      ceilings: 4,
      floors: 8,
      source: "FALLBACK",
      isMock: true,
    },
    {
      id: "vn30",
      name: "VN30",
      value: 1332.78,
      change: 18.65,
      changePercent: 1.42,
      chartUp: true,
      advances: 22,
      declines: 6,
      noChange: 2,
      ceilings: 2,
      floors: 0,
      source: "FALLBACK",
      isMock: true,
    },
    {
      id: "upindex",
      name: "UPINDEX",
      value: 93.24,
      change: 0.85,
      changePercent: 0.92,
      chartUp: true,
      advances: 145,
      declines: 102,
      noChange: 43,
      ceilings: 7,
      floors: 3,
      source: "FALLBACK",
      isMock: true,
    },
  ];
};

/**
 * Lấy dữ liệu đồ thị phút của chỉ số
 * @param {string} symbol - "VNINDEX", "HNX-INDEX", etc.
 */
const fetchIndexIntraday = async (symbol) => {
  try {
    const res = await marketService.fetchIndexIntraday(symbol);
    return res;
  } catch (err) {
    console.error(`[marketApi] fetchIndexIntraday ${symbol} lỗi:`, err.message);
    return { success: false, data: [] };
  }
};

// ==========================================
// EXPORT TẤT CẢ CÁC HÀM RA MỘT CHỖ
// ==========================================
export {
  fetchAllIndices,
  fetchIndexBySymbol,
  fetchIndexHistory,
  fetchIndexIntraday,
  checkBackendHealth,
  getBoardData,
  fetchStockDetail,
  fetchMatchingDetail,
  fetchStockHistory,
};
