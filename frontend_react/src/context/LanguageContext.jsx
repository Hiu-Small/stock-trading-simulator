// =============================================
// context/LanguageContext.jsx
// Quản lý ngôn ngữ toàn hệ thống
// =============================================
import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../locales/translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Lấy ngôn ngữ từ localStorage, mặc định ban đầu là 'vi'
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem("iboard_lang");
      if (saved === "vi" || saved === "en") return saved;
    } catch {
      // Bỏ qua lỗi localStorage
    }
    return "vi";
  });

  const setLang = (newLang) => {
    if (newLang === "vi" || newLang === "en") {
      setLangState(newLang);
      try {
        localStorage.setItem("iboard_lang", newLang);
      } catch {
        // Bỏ qua lỗi localStorage
      }
    }
  };

  /**
   * Hàm dịch chính t()
   * @param {string} path - Đường dẫn key, ví dụ: 'nav.market' hoặc 'board.showingStocks'
   * @param {object} params - Đối tượng chứa các biến động để thay thế, ví dụ: { totalCount: 10 }
   */
  const t = (path, params = {}) => {
    const keys = path.split(".");
    let result = translations[lang];

    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        return path; // Fallback: Trả về chính đường dẫn nếu không tìm thấy key dịch
      }
    }

    if (typeof result !== "string") {
      return path;
    }

    // Thực hiện thay thế các biến động dạng {varName} trong chuỗi dịch
    let translatedText = result;
    Object.keys(params).forEach((key) => {
      translatedText = translatedText.replace(new RegExp(`{${key}}`, "g"), params[key]);
    });

    return translatedText;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
