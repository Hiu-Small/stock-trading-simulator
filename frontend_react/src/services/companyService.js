import axios from "../setup/axios";

/**
 * Lấy thông tin hồ sơ công ty (Giới thiệu, TT cơ bản, TT niêm yết, công ty con, ban lãnh đạo)
 * @param {string} symbol - Mã CK (VD: "BID")
 */
const fetchCompanyProfile = (symbol) => {
  return axios.get(`/api/company/stock/${symbol}/profile`);
};

export {
  fetchCompanyProfile,
};
