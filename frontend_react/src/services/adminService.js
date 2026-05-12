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

export {
    fetchAllUsers,
    updateUserBalance,
    updateUserStatus,
    updateUser,
    resetPassword,
    resetPin
};
