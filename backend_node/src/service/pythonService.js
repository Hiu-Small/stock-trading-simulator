/**
 * pythonService.js
 * Các hàm gọi trực tiếp sang Python FastAPI bằng Axios.
 */

import axios from "axios";
import PYTHON_API from "../config/pythonApi.js";

/**
 * Gọi API lấy danh sách chỉ số
 */
const fetchAllIndices = () => {
  return axios.get(PYTHON_API.INDICES, { timeout: 60000 });
};

/**
 * Gọi API lấy chi tiết một chỉ số
 */
const fetchIndexBySymbol = (symbol) => {
  return axios.get(PYTHON_API.INDEX_DETAIL(symbol), { timeout: 60000 });
};

/**
 * Gọi API lấy intraday của chỉ số (dữ liệu phút)
 */
const fetchIndexIntraday = (symbol) => {
  return axios.get(PYTHON_API.INDEX_INTRADAY(symbol), { timeout: 60000 });
};

/**
 * Gọi API lấy lịch sử giá chỉ số
 */
const fetchIndexHistory = (symbol, days, interval) => {
  return axios.get(PYTHON_API.INDEX_HISTORY(symbol), {
    params: { days, interval },
    timeout: 60000,
  });
};

/**
 * Gọi API lấy bảng giá theo nhóm (VN30, HNX30...)
 */
const fetchBoardByGroup = (group) => {
  return axios.get(PYTHON_API.BOARD(group), { timeout: 60000 });
};

/**
 * Gọi API lấy thông tin chi tiết cổ phiếu
 */
const fetchStockDetail = (symbol) => {
  return axios.get(PYTHON_API.STOCK(symbol), { timeout: 60000 });
};

/**
 * Gọi API lấy lịch sử khớp lệnh trong ngày
 */
const fetchStockIntraday = (symbol) => {
  return axios.get(PYTHON_API.STOCK_INTRADAY(symbol), { timeout: 60000 });
};

/**
 * Gọi API lấy lịch sử OHLCV cổ phiếu
 */
const fetchStockHistory = (symbol, days, resolution) => {
  return axios.get(PYTHON_API.STOCK_HISTORY(symbol), {
    params: { days, resolution },
    timeout: 60000,
  });
};

/**
 * Gọi API lấy hồ sơ công ty
 */
const fetchStockProfile = (symbol) => {
  return axios.get(PYTHON_API.STOCK_PROFILE(symbol), { timeout: 60000 });
};

/**
 * Gọi API lấy danh sách cổ đông
 */
const fetchStockShareholders = (symbol) => {
  return axios.get(PYTHON_API.STOCK_SHAREHOLDERS(symbol), { timeout: 60000 });
};

/**
 * Gọi API lấy cơ cấu sở hữu
 */
const fetchStockOwnership = (symbol) => {
  return axios.get(PYTHON_API.STOCK_OWNERSHIP(symbol), { timeout: 60000 });
};

/**
 * Gọi API lấy lịch sự kiện doanh nghiệp
 */
const fetchStockEvents = (symbol) => {
  return axios.get(PYTHON_API.STOCK_EVENTS(symbol), { timeout: 60000 });
};

/**
 * Kiểm tra sức khỏe Python API
 */
const fetchHealth = () => {
  return axios.get(PYTHON_API.HEALTH, { timeout: 10000 });
};

export default {
  fetchAllIndices,
  fetchIndexBySymbol,
  fetchIndexIntraday,
  fetchIndexHistory,
  fetchBoardByGroup,
  fetchStockDetail,
  fetchStockIntraday,
  fetchStockHistory,
  fetchStockProfile,
  fetchStockShareholders,
  fetchStockOwnership,
  fetchStockEvents,
  fetchHealth,
};
