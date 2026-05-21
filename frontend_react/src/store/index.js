// =============================================
// store/index.js
// Redux Store chính của ứng dụng iBoard
// Kết hợp tất cả reducers
// =============================================
import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./themeSlice";

const store = configureStore({
  reducer: {
    theme: themeReducer,
    // Thêm các slice khác tại đây trong tương lai:
    // auth: authReducer,
    // market: marketReducer,
  },
  // Middleware mặc định của Redux Toolkit đã bao gồm redux-thunk
  devTools: import.meta.env.DEV, // Chỉ bật Redux DevTools trong môi trường development
});

export default store;
