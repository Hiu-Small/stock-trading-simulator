import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { UserContext } from "./UserContext";

const FavoritesContext = createContext();

export const FavoritesProvider = (props) => {
  const { user } = useContext(UserContext);
  const username = user?.isAuthenticated && user?.account?.username ? user.account.username : null;

  const [favorites, setFavorites] = useState([]);

  // Load favorites for the logged-in user when username changes
  useEffect(() => {
    if (username) {
      const key = `iboard_favorites_${username}`;
      try {
        const saved = localStorage.getItem(key);
        setFavorites(saved ? JSON.parse(saved) : []);
      } catch {
        setFavorites([]);
      }
    } else {
      setFavorites([]);
    }
  }, [username]);

  // Automatically save to localStorage when favorites or username changes
  useEffect(() => {
    if (username) {
      const key = `iboard_favorites_${username}`;
      localStorage.setItem(key, JSON.stringify(favorites));
    }
  }, [favorites, username]);

  const addFavorite = useCallback((symbol) => {
    if (!username) return;
    setFavorites((prev) => {
      if (prev.includes(symbol)) return prev;
      return [...prev, symbol];
    });
  }, [username]);

  const removeFavorite = useCallback((symbol) => {
    if (!username) return;
    setFavorites((prev) => prev.filter((s) => s !== symbol));
  }, [username]);

  const isFavorite = useCallback(
    (symbol) => {
      if (!username) return false;
      return favorites.includes(symbol);
    },
    [favorites, username]
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
