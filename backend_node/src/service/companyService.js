import pythonService from "./pythonService.js";

const CACHE_CONFIG = {
  PROFILE_TTL: 300_000, // Cache cho hồ sơ công ty (5 phút)
};

let profileCache = {};
let pendingProfileRequests = {};

/**
 * Lấy hồ sơ công ty
 */
const getStockProfile = async (symbol) => {
  const now = Date.now();
  const upperSymbol = symbol.toUpperCase();

  if (
    profileCache[upperSymbol] && 
    now - profileCache[upperSymbol].lastFetched < CACHE_CONFIG.PROFILE_TTL
  ) {
    return { ...profileCache[upperSymbol].data, fromCache: true };
  }

  if (pendingProfileRequests[upperSymbol]) {
    return pendingProfileRequests[upperSymbol];
  }

  pendingProfileRequests[upperSymbol] = (async () => {
    try {
      const res = await pythonService.fetchStockProfile(upperSymbol);
      const data = res.data;

      profileCache[upperSymbol] = {
        data: data,
        lastFetched: Date.now()
      };
      return { ...data, fromCache: false };
    } catch (err) {
      console.error(`[companyService] Lỗi lấy profile ${upperSymbol}:`, err.message);
      return { success: false, data: null };
    } finally {
      delete pendingProfileRequests[upperSymbol];
    }
  })();

  return pendingProfileRequests[upperSymbol];
};

export default {
  getStockProfile,
};
