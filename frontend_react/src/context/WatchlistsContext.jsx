import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { UserContext } from "./UserContext";
import { toast } from "react-toastify";
import { useTranslation } from "./LanguageContext";

const WatchlistsContext = createContext();

const DEFAULT_WATCHLISTS = {
  banking: ["VCB", "BID", "CTG", "TCB", "MBB", "ACB", "VPB"],
  technology: ["FPT", "CMG", "ELC", "SAM", "ITD", "FOX", "VGI"],
  realEstate: ["VIC", "VHM", "VRE", "NVL", "PDR", "DXG", "KDH"],
  energy: ["GAS", "PLX", "POW", "PVD", "PVS", "NT2", "GEG"]
};

export const WatchlistsProvider = (props) => {
  const { user } = useContext(UserContext);
  const { t } = useTranslation();
  const username = user?.isAuthenticated && user?.account?.username ? user.account.username : null;

  const [watchlists, setWatchlists] = useState(DEFAULT_WATCHLISTS);
  const [customNames, setCustomNames] = useState({});

  // Load custom watchlists for the logged-in user when username changes
  useEffect(() => {
    if (username) {
      const key = `iboard_watchlists_${username}`;
      try {
        const saved = localStorage.getItem(key);
        setWatchlists(saved ? JSON.parse(saved) : DEFAULT_WATCHLISTS);
      } catch {
        setWatchlists(DEFAULT_WATCHLISTS);
      }
    } else {
      setWatchlists(DEFAULT_WATCHLISTS);
    }
  }, [username]);

  // Load custom watchlist names when username changes
  useEffect(() => {
    if (username) {
      const key = `iboard_watchlist_names_${username}`;
      try {
        const saved = localStorage.getItem(key);
        setCustomNames(saved ? JSON.parse(saved) : {});
      } catch {
        setCustomNames({});
      }
    } else {
      setCustomNames({});
    }
  }, [username]);

  // Automatically save watchlists to localStorage when they change
  useEffect(() => {
    if (username) {
      const key = `iboard_watchlists_${username}`;
      localStorage.setItem(key, JSON.stringify(watchlists));
    }
  }, [watchlists, username]);

  // Automatically save custom names to localStorage when they change
  useEffect(() => {
    if (username) {
      const key = `iboard_watchlist_names_${username}`;
      localStorage.setItem(key, JSON.stringify(customNames));
    }
  }, [customNames, username]);

  const addStockToWatchlist = useCallback((group, symbol) => {
    if (!username) {
      toast.warning(t("sidebar.favoritesLoginWarning"));
      return;
    }
    const groupKey = group.startsWith("custom_") ? group : (group === "realEstate" || group === "real estate" || group === "Real Estate" ? "realEstate" : group.toLowerCase());
    
    // Check if valid group key
    if (!watchlists[groupKey]) {
      console.error("[WatchlistsContext] Nhóm không hợp lệ:", groupKey);
      return;
    }

    const groupName = customNames[groupKey] || t(`sidebar.${groupKey}`);

    if (watchlists[groupKey].includes(symbol)) {
      toast.warning(
        t("sidebar.watchlistAddDuplicate")
          .replace("{symbol}", symbol)
          .replace("{group}", groupName)
      );
      return;
    }

    setWatchlists((prev) => {
      const updated = {
        ...prev,
        [groupKey]: [...prev[groupKey], symbol]
      };
      toast.success(
        t("sidebar.watchlistAddSuccess")
          .replace("{symbol}", symbol)
          .replace("{group}", groupName)
      );
      return updated;
    });
  }, [watchlists, username, customNames, t]);

  const removeStockFromWatchlist = useCallback((group, symbol) => {
    if (!username) return;
    const groupKey = group.startsWith("custom_") ? group : (group === "realEstate" || group === "real estate" || group === "Real Estate" ? "realEstate" : group.toLowerCase());
    
    if (!watchlists[groupKey]) {
      console.error("[WatchlistsContext] Nhóm không hợp lệ:", groupKey);
      return;
    }

    setWatchlists((prev) => {
      const updated = {
        ...prev,
        [groupKey]: prev[groupKey].filter((s) => s !== symbol)
      };
      return updated;
    });

    const groupName = customNames[groupKey] || t(`sidebar.${groupKey}`);
    toast.success(
      t("sidebar.watchlistRemoveSuccess")
        .replace("{symbol}", symbol)
        .replace("{group}", groupName)
    );
  }, [watchlists, username, customNames, t]);

  const getWatchlist = useCallback((group) => {
    const groupKey = group.startsWith("custom_") ? group : (group === "realEstate" || group === "real estate" || group === "Real Estate" ? "realEstate" : group.toLowerCase());
    return watchlists[groupKey] || [];
  }, [watchlists]);

  const getWatchlistCount = useCallback((group) => {
    const groupKey = group.startsWith("custom_") ? group : (group === "realEstate" || group === "real estate" || group === "Real Estate" ? "realEstate" : group.toLowerCase());
    return watchlists[groupKey] ? watchlists[groupKey].length : 0;
  }, [watchlists]);

  const createWatchlist = useCallback((name) => {
    if (!username) {
      toast.warning(t("sidebar.favoritesLoginWarning"));
      return null;
    }
    // Check duplicate name
    const exists = Object.values(customNames).some(n => n.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.warning(t("sidebar.createWatchlistDuplicateWarning").replace("{name}", name));
      return null;
    }

    const groupKey = `custom_${Date.now()}`;
    
    // Initialize custom names and group array in state
    setCustomNames(prev => ({ ...prev, [groupKey]: name }));
    setWatchlists(prev => ({ ...prev, [groupKey]: [] }));

    toast.success(t("sidebar.createWatchlistSuccess").replace("{name}", name));
    return groupKey;
  }, [username, customNames, t]);

  const renameWatchlist = useCallback((groupKey, newName) => {
    if (!username) return false;
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.warning(t("sidebar.createWatchlistEmptyWarning"));
      return false;
    }
    // Check duplicate name among other groups
    const exists = Object.entries(customNames).some(([key, val]) => key !== groupKey && val.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.warning(t("sidebar.createWatchlistDuplicateWarning").replace("{name}", trimmed));
      return false;
    }

    setCustomNames(prev => ({
      ...prev,
      [groupKey]: trimmed
    }));
    toast.success(t("lang") === "vi" ? `Đã đổi tên nhóm thành "${trimmed}"!` : `Successfully renamed group to "${trimmed}"!`);
    return true;
  }, [username, customNames, t]);

  const deleteWatchlist = useCallback((groupKey) => {
    if (!username) return false;
    
    // Remove name mapping
    setCustomNames(prev => {
      const updated = { ...prev };
      delete updated[groupKey];
      return updated;
    });

    // Remove watchlist items
    setWatchlists(prev => {
      const updated = { ...prev };
      delete updated[groupKey];
      return updated;
    });

    toast.success(t("lang") === "vi" ? "Đã xóa nhóm danh mục thành công!" : "Successfully deleted watchlist group!");
    return true;
  }, [username, t]);

  return (
    <WatchlistsContext.Provider
      value={{ watchlists, customNames, addStockToWatchlist, removeStockFromWatchlist, getWatchlist, getWatchlistCount, createWatchlist, renameWatchlist, deleteWatchlist }}
    >
      {props.children}
    </WatchlistsContext.Provider>
  );
};

export default WatchlistsContext;
export const useWatchlists = () => useContext(WatchlistsContext);
