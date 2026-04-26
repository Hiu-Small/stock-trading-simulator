import axios from "../setup/axios";

/**
 * Các hàm gọi API thuần túy (Raw API calls)
 */

const fetchAllIndices = () => {
  return axios.get("/api/market/indices");
};

const fetchIndexBySymbol = (symbol) => {
  return axios.get(`/api/market/indices/${symbol}`);
};

const fetchIndexHistory = (symbol, days, interval) => {
  return axios.get(`/api/market/indices/${symbol}/history`, {
    params: { days, interval },
  });
};

const checkBackendHealth = () => {
  return axios.get("/api/market/health");
};

const fetchBoardByGroup = (group) => {
  return axios.get(`/api/market/board/${group}`);
};

const fetchStockDetail = (symbol) => {
  return axios.get(`/api/market/stock/${symbol}`);
};

export {
  fetchAllIndices,
  fetchIndexBySymbol,
  fetchIndexHistory,
  fetchBoardByGroup,
  checkBackendHealth,
  fetchStockDetail,
};
