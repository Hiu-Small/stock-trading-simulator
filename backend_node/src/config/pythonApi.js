/**
 * pythonApi.js
 * Quản lý các endpoint gọi sang Python FastAPI
 */

const PYTHON_API_BASE = process.env.PYTHON_API_URL || "http://localhost:8000";

const PYTHON_API = {
  INDICES: `${PYTHON_API_BASE}/api/indices`,
  INDEX_DETAIL: (symbol) => `${PYTHON_API_BASE}/api/indices/${symbol}`,
  INDEX_INTRADAY: (symbol) => `${PYTHON_API_BASE}/api/indices/${symbol}/intraday`,
  INDEX_HISTORY: (symbol) => `${PYTHON_API_BASE}/api/indices/${symbol}/history`,
  HEALTH: `${PYTHON_API_BASE}/api/health`,
  BOARD: (group) => `${PYTHON_API_BASE}/api/board/${group}`,
  STOCK: (symbol) => `${PYTHON_API_BASE}/api/stock/${symbol}`,
  STOCK_INTRADAY: (symbol) => `${PYTHON_API_BASE}/api/stock/${symbol}/intraday`,
  STOCK_HISTORY: (symbol) => `${PYTHON_API_BASE}/api/stock/${symbol}/history`,
  STOCK_PROFILE: (symbol) => `${PYTHON_API_BASE}/api/stock/${symbol}/profile`,
};

export default PYTHON_API;
