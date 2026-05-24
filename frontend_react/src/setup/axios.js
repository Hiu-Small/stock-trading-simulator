import axios from "axios";
import { toast } from "react-toastify";

// Set config defaults when creating the instance
const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || "https://stock-trading-simulator-1-b8in.onrender.com",
});

// Add a request interceptor
instance.interceptors.request.use(
  function (config) {
    // Attach token from sessionStorage if available
    const account = sessionStorage.getItem("account");
    if (account) {
      try {
        const parsed = JSON.parse(account);
        if (parsed?.token) {
          config.headers["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch (e) {
        console.error("Error parsing account from sessionStorage", e);
      }
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

// Add a response interceptor
instance.interceptors.response.use(
  function (response) {
    // Return only response.data to simplify service calls
    return response.data;
  },
  function (error) {
    const status = error?.response?.status || 500;
    
    switch (status) {
      case 400:
        toast.error("Yêu cầu không hợp lệ. Vui lòng kiểm tra lại tham số.(400)");
        break;
      case 401:
        toast.error("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.(401)");
        // window.location.href = '/login'; // Tùy chọn chuyển hướng
        break;
      case 403:
        toast.error("Bạn không có quyền truy cập tài nguyên này.(403)");
        break;
      case 404:
        toast.error("Không tìm thấy dữ liệu yêu cầu.(404)");
        break;
      case 500:
        toast.error("Lỗi hệ thống từ server. Vui lòng thử lại sau.(500)");
        break;
      case 502:
        toast.error("Lỗi kết nối giữa các máy chủ (Gateway Error).(502)");
        break;
      default:
        toast.error(
          error?.response?.data?.message || "Đã xảy ra lỗi không xác định."
        );
        break;
    }
    
    return Promise.reject(error);
  },
);

export default instance;
