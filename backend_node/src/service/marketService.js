/**
 * marketService.js
 * Gọi Python FastAPI (port 8000) để lấy dữ liệu chỉ số thị trường.
 * Node.js (port 8080) đóng vai trò proxy + caching giữa Python backend và React frontend.
 */

import pythonService from "./pythonService.js";

// ==========================================
// CẤU HÌNH CACHE TẬP TRUNG
// ==========================================
const CACHE_CONFIG = {
  INDEX_TTL: 30_000,   // Cache cho các chỉ số (VNINDEX, VN30...)
  INDEX_INTRADAY_TTL: 60_000, // Cache cho đồ thị phút chỉ số (1 phút)
  BOARD_TTL: 30_000,   // Cache cho bảng giá nhóm (HOSE, VN30...)
  STOCK_TTL: 30_000,   // Cache cho chi tiết mã cổ phiếu (AAA, FPT...)
};

// Bộ nhớ đệm (Cache)
let indexCache = { data: null, lastFetched: null };
let indexIntradayCache = {};
let boardCache = {}; 
let stockCache = {}; 

// Quản lý các yêu cầu đang chạy (Dùng để gộp các yêu cầu trùng nhau)
let pendingIndexIntradayRequests = {};
let pendingBoardRequests = {}; 
let pendingStockRequests = {}; 

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
    now - indexCache.lastFetched < CACHE_CONFIG.INDEX_TTL
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
 * Lấy dữ liệu đồ thị phút của chỉ số
 */
const getIndexIntraday = async (symbol) => {
  const now = Date.now();
  const upperSymbol = symbol.toUpperCase();

  if (
    indexIntradayCache[upperSymbol] && 
    now - indexIntradayCache[upperSymbol].lastFetched < CACHE_CONFIG.INDEX_INTRADAY_TTL
  ) {
    return { ...indexIntradayCache[upperSymbol].data, fromCache: true };
  }

  if (pendingIndexIntradayRequests[upperSymbol]) {
    return pendingIndexIntradayRequests[upperSymbol];
  }

  pendingIndexIntradayRequests[upperSymbol] = (async () => {
    try {
      const res = await pythonService.fetchIndexIntraday(upperSymbol);
      const data = res.data;

      indexIntradayCache[upperSymbol] = {
        data: data,
        lastFetched: Date.now()
      };
      return { ...data, fromCache: false };
    } catch (err) {
      console.error(`[marketService] Lỗi lấy intraday chỉ số ${upperSymbol}:`, err.message);
      return { success: false, data: [] };
    } finally {
      delete pendingIndexIntradayRequests[upperSymbol];
    }
  })();

  return pendingIndexIntradayRequests[upperSymbol];
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

// Xóa các biến khai báo rải rác cũ

/**
 * Lấy dữ liệu bảng giá theo nhóm (VN30, HNX30, etc.)
 */
const getBoardByGroup = async (group) => {
  const now = Date.now();
  const upperGroup = group.toUpperCase();
  
  // 1. Kiểm tra cache
  if (
    boardCache[upperGroup] && 
    now - boardCache[upperGroup].lastFetched < CACHE_CONFIG.BOARD_TTL
  ) {
    return { ...boardCache[upperGroup].data, fromCache: true };
  }

  // 2. Nếu ĐANG có yêu cầu trùng lặp đang chạy, hãy đợi nó
  if (pendingBoardRequests[upperGroup]) {
    return pendingBoardRequests[upperGroup];
  }

  // 3. Nếu chưa có, tạo yêu cầu mới
  pendingBoardRequests[upperGroup] = (async () => {
    try {
      const res = await pythonService.fetchBoardByGroup(upperGroup);
      const data = res.data;

      boardCache[upperGroup] = {
        data: data,
        lastFetched: Date.now()
      };
      return { ...data, fromCache: false };
    } catch (err) {
      console.error(`[marketService] Lỗi lấy bảng giá ${upperGroup}:`, err.message);
      return { success: false, data: [] };
    } finally {
      delete pendingBoardRequests[upperGroup];
    }
  })();

  return pendingBoardRequests[upperGroup];
};

// Xóa các biến khai báo rải rác cũ

/**
 * Lấy chi tiết 1 cổ phiếu
 */
const getStockDetail = async (symbol) => {
  const now = Date.now();
  const upperSymbol = symbol.toUpperCase();

  if (
    stockCache[upperSymbol] && 
    now - stockCache[upperSymbol].lastFetched < CACHE_CONFIG.STOCK_TTL
  ) {
    return { ...stockCache[upperSymbol].data, fromCache: true };
  }

  if (pendingStockRequests[upperSymbol]) {
    return pendingStockRequests[upperSymbol];
  }

  pendingStockRequests[upperSymbol] = (async () => {
    try {
      const res = await pythonService.fetchStockDetail(upperSymbol);
      const data = res.data;

      stockCache[upperSymbol] = {
        data: data,
        lastFetched: Date.now()
      };
      return { ...data, fromCache: false };
    } catch (err) {
      console.error(`[marketService] Lỗi lấy chi tiết ${upperSymbol}:`, err.message);
      return { success: false, data: null };
    } finally {
      delete pendingStockRequests[upperSymbol];
    }
  })();

  return pendingStockRequests[upperSymbol];
};

/**
 * Lấy lịch sử khớp lệnh trong ngày (Tick-by-tick)
 */
const getStockIntraday = async (symbol) => {
  try {
    const res = await pythonService.fetchStockIntraday(symbol.toUpperCase());
    return res.data;
  } catch (err) {
    console.error(`[marketService] Lỗi lấy intraday ${symbol}:`, err.message);
    return { 
      success: false, 
      data: [], 
      stats: { totalBuy: 0, totalSell: 0, total: 0 } 
    };
  }
};

/**
 * Lấy lịch sử OHLCV của mã cổ phiếu (dùng cho TradingView chart)
 */
const getStockHistory = async (symbol, days = 90, interval = "1D") => {
  try {
    const res = await pythonService.fetchStockHistory(symbol.toUpperCase(), days, interval);
    return res.data;
  } catch (err) {
    console.error(`[marketService] Lỗi lấy stock history ${symbol}:`, err.message);
    return { success: false, data: [] };
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
  getIndexIntraday,
  getIndexHistory,
  getBoardByGroup,
  getStockDetail,
  getStockIntraday,
  getStockHistory,
  checkPythonHealth,
};
