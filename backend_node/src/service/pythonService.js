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
  return axios.get(PYTHON_API.INDICES, { timeout: 8000 });
};

/**
 * Gọi API lấy chi tiết một chỉ số
 */
const fetchIndexBySymbol = (symbol) => {
  return axios.get(PYTHON_API.INDEX_DETAIL(symbol), { timeout: 8000 });
};

/**
 * Gọi API lấy lịch sử giá chỉ số
 */
const fetchIndexHistory = (symbol, days, interval) => {
  return axios.get(PYTHON_API.INDEX_HISTORY(symbol), {
    params: { days, interval },
    timeout: 15000,
  });
};

/**
 * Gọi API lấy bảng giá theo nhóm (VN30, HNX30...)
 */
const fetchBoardByGroup = (group) => {
  return axios.get(PYTHON_API.BOARD(group), { timeout: 15000 });
};

/**
 * Kiểm tra sức khỏe Python API
 */
const fetchHealth = () => {
  return axios.get(PYTHON_API.HEALTH, { timeout: 3000 });
};

export default {
  fetchAllIndices,
  fetchIndexBySymbol,
  fetchIndexHistory,
  fetchBoardByGroup,
  fetchHealth,
};
