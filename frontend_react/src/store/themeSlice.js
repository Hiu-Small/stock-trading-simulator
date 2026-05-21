// =============================================
// themeSlice.js
// Redux slice quản lý theme: 'dark' | 'light'
// Lưu vào localStorage để nhớ qua các lần tải lại trang
// =============================================
import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "iboard_theme";

// Đọc theme đã lưu từ localStorage, mặc định là 'dark'
const loadThemeFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Bỏ qua lỗi nếu localStorage không khả dụng
  }
  return "dark";
};

const initialState = {
  theme: loadThemeFromStorage(), // 'dark' | 'light'
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action) => {
      const newTheme = action.payload;
      state.theme = newTheme;
      // Lưu vào localStorage ngay khi thay đổi
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {
        // Bỏ qua lỗi localStorage
      }
    },
    toggleTheme: (state) => {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      state.theme = newTheme;
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {
        // Bỏ qua lỗi localStorage
      }
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;

// Selectors
export const selectTheme = (state) => state.theme.theme;
export const selectIsDark = (state) => state.theme.theme === "dark";

export default themeSlice.reducer;
