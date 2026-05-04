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

export {
  fetchCompanyProfile,
};
