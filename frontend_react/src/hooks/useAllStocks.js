import { useState, useEffect } from "react";
import { getBoardData } from "../services/marketApi";

// Cache toàn bộ danh sách để không gọi API lặp lại
let cachedStocks = null;
let cachePromise = null;

/**
 * Load tất cả cổ phiếu từ mọi sàn: HOSE, HNX, UPCOM, VN30, HNX30, VN100
 * Gộp lại và dedup theo symbol → dùng làm bộ dữ liệu gợi ý tìm kiếm
 */
const loadAllStocksFromAllExchanges = async () => {
  // Nếu đã có cache thì dùng luôn
  if (cachedStocks) return cachedStocks;

  // Nếu đang fetch thì chờ promise đó
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const groups = ["HOSE", "HNX", "UPCOM", "VN30", "HNX30", "VN100"];
      const results = await Promise.allSettled(
        groups.map((g) => getBoardData(g))
      );

      const symbolSet = new Set();
      const merged = [];

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.success && Array.isArray(result.value.data)) {
          result.value.data.forEach((stock) => {
            if (stock.symbol && !symbolSet.has(stock.symbol)) {
              symbolSet.add(stock.symbol);
              merged.push(stock);
            }
          });
        }
      });

      // Sắp xếp theo alphabet
      merged.sort((a, b) => a.symbol.localeCompare(b.symbol));

      cachedStocks = merged;
      return merged;
    } catch (err) {
      console.error("[useAllStocks] Lỗi load danh sách cổ phiếu:", err);
      return [];
    }
  })();

  return cachePromise;
};

/**
 * Custom hook: trả về toàn bộ danh sách cổ phiếu từ tất cả sàn
 * Có cache module-level nên chỉ gọi API 1 lần duy nhất trong vòng đời app
 */
const useAllStocks = () => {
  const [allStocks, setAllStocks] = useState(cachedStocks || []);
  const [loading, setLoading] = useState(!cachedStocks);

  useEffect(() => {
    if (cachedStocks) {
      setAllStocks(cachedStocks);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadAllStocksFromAllExchanges().then((stocks) => {
      setAllStocks(stocks);
      setLoading(false);
    });
  }, []);

  return { allStocks, loading };
};

export default useAllStocks;
