import * as companyService from "./companyService";

/**
 * Lấy thông tin chi tiết hồ sơ công ty
 * @param {string} symbol - Mã CK
 */
const fetchCompanyProfile = async (symbol) => {
  try {
    const res = await companyService.fetchCompanyProfile(symbol);
    return res; // Thường backend trả về { success: true, data: {...} }
  } catch (err) {
    console.error(`[companyApi] fetchCompanyProfile ${symbol} lỗi:`, err.message);
    return { success: false, data: null };
  }
};

const fetchShareholders = async (symbol) => {
  try {
    const res = await companyService.fetchShareholders(symbol);
    return res;
  } catch (err) {
    console.error(`[companyApi] fetchShareholders ${symbol} lỗi:`, err.message);
    return { success: false, data: [] };
  }
};

const fetchOwnership = async (symbol) => {
  try {
    const res = await companyService.fetchOwnership(symbol);
    return res;
  } catch (err) {
    console.error(`[companyApi] fetchOwnership ${symbol} lỗi:`, err.message);
    return { success: false, data: {} };
  }
};

export {
  fetchCompanyProfile,
  fetchShareholders,
  fetchOwnership,
};
