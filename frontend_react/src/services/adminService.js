import axios from "../setup/axios";

/**
 * Lấy danh sách tất cả người dùng (Admin)
 */
const fetchAllUsers = () => {
    return axios.get("/api/admin/users");
};

/**
 * Cập nhật trạng thái người dùng (Admin)
 * @param {object} data - { userId, status }
 */
const updateUserStatus = (data) => {
    return axios.post("/api/admin/update-status", data);
};

/**
 * Cập nhật số dư người dùng thủ công (Admin)
 * @param {object} data - { userId, amount, type, reason }
 */
const updateUserBalance = (data) => {
    return axios.post("/api/admin/update-balance", data);
};

/**
 * Cập nhật thông tin chi tiết người dùng (Admin)
 */
const updateUser = (data) => {
    return axios.post("/api/admin/update-user", data);
};

/**
 * Reset mật khẩu người dùng về mặc định (Admin)
 */
const resetPassword = (userId) => {
    return axios.post("/api/admin/reset-password", { userId });
};

/**
 * Reset mã PIN người dùng về mặc định (Admin)
 */
const resetPin = (userId) => {
    return axios.post("/api/admin/reset-pin", { userId });
};

/**
 * Lấy danh sách nhật ký hệ thống (Admin)
 */
const fetchSystemLogs = (page = 1, limit = 20) => {
    return axios.get(`/api/admin/system-logs?page=${page}&limit=${limit}`);
};

/**
 * Lấy dữ liệu thị trường (Admin)
 * @param {string} group - 'HOSE', 'VN30', 'HNX', 'UPCOM'
 */
const fetchMarketData = (group = "HOSE") => {
    return axios.get(`/api/admin/market-data?group=${group}`);
};

/**
 * Cập nhật trạng thái niêm yết/giao dịch của cổ phiếu (Admin)
 */
const updateStockStatus = (data) => {
    return axios.post("/api/admin/update-stock-status", data);
};

/**
 * Đồng bộ danh sách mã cổ phiếu từ thị trường vào DB (Admin)
 */
const syncStocks = () => {
    return axios.post("/api/admin/sync-stocks", {}, { timeout: 60000 });
};

/**
 * Lấy trạng thái cửa sàn (Admin)
 */
const fetchMarketStatus = () => {
    return axios.get("/api/admin/market-status");
};

/**
 * Cập nhật trạng thái cửa sàn (Admin)
 */
const updateMarketStatus = (status) => {
    return axios.post("/api/admin/market-status", { status });
};

/**
 * Lấy cấu hình hệ thống và phí (Admin)
 */
const fetchSettings = () => {
    return axios.get("/api/admin/settings");
};

/**
 * Cập nhật cấu hình hệ thống và phí (Admin)
 */
const updateSettings = (data) => {
    return axios.post("/api/admin/settings", data);
};

/**
 * Lấy danh sách tất cả lệnh của hệ thống (Admin)
 */
const fetchAllOrders = (startDate, endDate) => {
    let url = "/api/admin/orders";
    if (startDate || endDate) {
        url += `?startDate=${startDate || ""}&endDate=${endDate || ""}`;
    }
    return axios.get(url);
};

/**
 * Admin hủy cưỡng bức lệnh bị kẹt
 */
const forceCancelOrder = (orderId) => {
    return axios.post("/api/admin/orders/cancel", { orderId });
};

/**
 * Admin khớp cưỡng bức lệnh bị kẹt
 */
const forceMatchOrder = (orderId) => {
    return axios.post("/api/admin/orders/match", { orderId });
};

export {
    fetchAllUsers,
    fetchAllOrders,
    forceCancelOrder,
    forceMatchOrder,
    updateUserBalance,
    updateUserStatus,
    updateUser,
    resetPassword,
    resetPin,
    fetchSystemLogs,
    fetchMarketData,
    updateStockStatus,
    syncStocks,
    fetchMarketStatus,
    updateMarketStatus,
    fetchSettings,
    updateSettings
};
