/**
 * marketService.js
 * Gọi Python FastAPI (port 8000) để lấy dữ liệu chỉ số thị trường.
 * Node.js (port 8080) đóng vai trò proxy + caching giữa Python backend và React frontend.
 */

import pythonService from "./pythonService.js";

// Cache đơn giản trong memory (tránh gọi liên tục)
let indexCache = {
  data: null,
  lastFetched: null,
  TTL_MS: 30_000, // Cache 30 giây
};

/**
 * Lấy tất cả chỉ số thị trường từ Python API
 * Có fallback về mock data nếu Python chưa chạy
 */
const getAllIndices = async () => {
  // Trả cache nếu còn hạn
  const now = Date.now();
  if (
    indexCache.data &&
    indexCache.lastFetched &&
    now - indexCache.lastFetched < indexCache.TTL_MS
  ) {
    return { ...indexCache.data, fromCache: true };
  }

  try {
    const res = await pythonService.fetchAllIndices();
    const data = res.data;

    // Cập nhật cache
    indexCache.data = data;
    indexCache.lastFetched = now;

    return { ...data, fromCache: false };
  } catch (err) {
    console.error("[marketService] Lỗi gọi Python API:", err.message);

    // Trả mock data khi Python chưa chạy
    return {
      success: false,
      count: 4,
      fromCache: false,
      pythonError: err.message,
      data: getMockIndices(),
      updatedAt: new Date().toISOString(),
    };
  }
};

/**
 * Lấy 1 chỉ số cụ thể
 */
const getIndexBySymbol = async (symbol) => {
  try {
    const res = await pythonService.fetchIndexBySymbol(symbol);
    return res.data;
  } catch (err) {
    console.error(`[marketService] Lỗi lấy ${symbol}:`, err.message);
    const mocks = getMockIndices();
    const found = mocks.find(
      (m) => m.name.toLowerCase() === symbol.toLowerCase()
    );
    return {
      success: false,
      pythonError: err.message,
      data: found || null,
    };
  }
};

/**
 * Lấy lịch sử giá của chỉ số
 */
const getIndexHistory = async (symbol, days = 30, interval = "1D") => {
  try {
    const res = await pythonService.fetchIndexHistory(symbol, days, interval);
    return res.data;
  } catch (err) {
    console.error(`[marketService] Lỗi lịch sử ${symbol}:`, err.message);
    return {
      success: false,
      pythonError: err.message,
      data: [],
    };
  }
};

/**
 * Lấy dữ liệu bảng giá theo nhóm (VN30, HNX30, etc.)
 */
const getBoardByGroup = async (group) => {
  try {
    const res = await pythonService.fetchBoardByGroup(group);
    return res.data;
  } catch (err) {
    console.error(`[marketService] Lỗi lấy bảng giá ${group}:`, err.message);
    return {
      success: false,
      pythonError: err.message,
      data: [],
    };
  }
};

/**
 * Kiểm tra Python API có đang chạy không
 */
const checkPythonHealth = async () => {
  try {
    const res = await pythonService.fetchHealth();
    return { online: true, ...res.data };
  } catch (err) {
    return { online: false, error: err.message };
  }
};

/**
 * Mock data — dùng khi Python chưa khởi động
 */
function getMockIndices() {
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
      source: "MOCK",
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
      source: "MOCK",
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
      source: "MOCK",
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
      source: "MOCK",
      isMock: true,
    },
  ];
}

export default {
  getAllIndices,
  getIndexBySymbol,
  getIndexHistory,
  getBoardByGroup,
  checkPythonHealth,
};
