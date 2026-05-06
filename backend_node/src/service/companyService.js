import pythonService from "./pythonService.js";

const CACHE_CONFIG = {
  PROFILE_TTL: 300_000,      // Cache cho hồ sơ công ty (5 phút)
  SHAREHOLDERS_TTL: 600_000, // Cache cho cổ đông (10 phút)
};

let profileCache = {};
let shareholdersCache = {};
let ownershipCache = {};
let eventsCache = {};
let pendingProfileRequests = {};
let pendingShareholdersRequests = {};
let pendingOwnershipRequests = {};
let pendingEventsRequests = {};

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

/**
 * Lấy danh sách cổ đông lớn
 */
const getShareholders = async (symbol) => {
  const now = Date.now();
  const upperSymbol = symbol.toUpperCase();

  if (
    shareholdersCache[upperSymbol] && 
    now - shareholdersCache[upperSymbol].lastFetched < CACHE_CONFIG.SHAREHOLDERS_TTL
  ) {
    return { ...shareholdersCache[upperSymbol].data, fromCache: true };
  }

  if (pendingShareholdersRequests[upperSymbol]) {
    return pendingShareholdersRequests[upperSymbol];
  }

  pendingShareholdersRequests[upperSymbol] = (async () => {
    try {
      const res = await pythonService.fetchStockShareholders(upperSymbol);
      const data = res.data;

      shareholdersCache[upperSymbol] = {
        data: data,
        lastFetched: Date.now()
      };
      return { ...data, fromCache: false };
    } catch (err) {
      console.error(`[companyService] Lỗi lấy shareholders ${upperSymbol}:`, err.message);
      return { success: false, data: [] };
    } finally {
      delete pendingShareholdersRequests[upperSymbol];
    }
  })();

  return pendingShareholdersRequests[upperSymbol];
};

/**
 * Lấy cơ cấu sở hữu
 */
const getOwnership = async (symbol) => {
  const now = Date.now();
  const upperSymbol = symbol.toUpperCase();

  if (
    ownershipCache[upperSymbol] && 
    now - ownershipCache[upperSymbol].lastFetched < CACHE_CONFIG.SHAREHOLDERS_TTL
  ) {
    return { ...ownershipCache[upperSymbol].data, fromCache: true };
  }

  if (pendingOwnershipRequests[upperSymbol]) {
    return pendingOwnershipRequests[upperSymbol];
  }

  pendingOwnershipRequests[upperSymbol] = (async () => {
    try {
      const res = await pythonService.fetchStockOwnership(upperSymbol);
      const data = res.data;

      ownershipCache[upperSymbol] = {
        data: data,
        lastFetched: Date.now()
      };
      return { ...data, fromCache: false };
    } catch (err) {
      console.error(`[companyService] Lỗi lấy ownership ${upperSymbol}:`, err.message);
      return { success: false, data: {} };
    } finally {
      delete pendingOwnershipRequests[upperSymbol];
    }
  })();

  return pendingOwnershipRequests[upperSymbol];
};

/**
 * Lấy lịch sự kiện doanh nghiệp
 */
const getStockEvents = async (symbol) => {
  const now = Date.now();
  const upperSymbol = symbol.toUpperCase();

  if (
    eventsCache[upperSymbol] && 
    now - eventsCache[upperSymbol].lastFetched < CACHE_CONFIG.SHAREHOLDERS_TTL
  ) {
    return { ...eventsCache[upperSymbol].data, fromCache: true };
  }

  if (pendingEventsRequests[upperSymbol]) {
    return pendingEventsRequests[upperSymbol];
  }

  pendingEventsRequests[upperSymbol] = (async () => {
    try {
      const res = await pythonService.fetchStockEvents(upperSymbol);
      const data = res.data;
      
      eventsCache[upperSymbol] = {
        data: data,
        lastFetched: Date.now()
      };
      return { ...data, fromCache: false };
    } catch (error) {
      console.error(`[companyService] Lỗi lấy events ${upperSymbol}:`, error.message);
      return { success: false, data: [] };
    } finally {
      delete pendingEventsRequests[upperSymbol];
    }
  })();

  return pendingEventsRequests[upperSymbol];
};

export default {
  getStockProfile,
  getShareholders,
  getOwnership,
  getStockEvents
};
