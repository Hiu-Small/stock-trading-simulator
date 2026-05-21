import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const FavoritesContext = createContext();

const STORAGE_KEY = "iboard_favorites";

export const FavoritesProvider = (props) => {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tự động lưu vào localStorage mỗi khi favorites thay đổi
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((symbol) => {
    setFavorites((prev) => {
      if (prev.includes(symbol)) return prev;
      return [...prev, symbol];
    });
  }, []);

  const removeFavorite = useCallback((symbol) => {
    setFavorites((prev) => prev.filter((s) => s !== symbol));
  }, []);

  const isFavorite = useCallback(
    (symbol) => favorites.includes(symbol),
    [favorites]
  );

  return (
    <FavoritesContext.Provider
      value={{ favorites, addFavorite, removeFavorite, isFavorite }}
    >
      {props.children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
