/**
 * Kiểm tra xem thị trường chứng khoán Việt Nam có đang mở cửa không.
 * Quy định: 
 * - Thứ 2 đến Thứ 6
 * - Sáng: 09:00 - 11:30
 * - Nghỉ trưa: 11:30 - 13:00 (CLOSED)
 * - Chiều: 13:00 - 15:00
 */
export const checkIsMarketOpen = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  
  const day = now.getDay(); // 0=CN, 6=T7
  if (day === 0 || day === 6) return false;

  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  const morningOpen = 9 * 60; // 09:00
  const morningClose = 11 * 60 + 30; // 11:30
  const afternoonOpen = 13 * 60; // 13:00
  const afternoonClose = 15 * 60; // 15:00

  // Phiên sáng
  if (totalMinutes >= morningOpen && totalMinutes < morningClose) {
    return true;
  }
  
  // Phiên chiều
  if (totalMinutes >= afternoonOpen && totalMinutes < afternoonClose) {
    return true;
  }

  return false;
};

/**
 * Trả về trạng thái chi tiết của thị trường (Dùng để hiển thị Text)
 */
export const getMarketStatus = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  
  const day = now.getDay();
  if (day === 0 || day === 6) return "CLOSED";

  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  const morningOpen = 9 * 60; 
  const morningClose = 11 * 60 + 30; 
  const afternoonOpen = 13 * 60; 
  const afternoonClose = 15 * 60; 

  if (totalMinutes >= morningOpen && totalMinutes < morningClose) return "OPEN";
  if (totalMinutes >= morningClose && totalMinutes < afternoonOpen) return "BREAK";
  if (totalMinutes >= afternoonOpen && totalMinutes < afternoonClose) return "OPEN";

  return "CLOSED";
};

/**
 * Tính toán thống kê Tăng/Giảm/Trần/Sàn từ danh sách cổ phiếu
 */
export const calculateMarketStats = (stocks) => {
  let increase = 0,
    decrease = 0,
    ref = 0,
    ceiling = 0,
    floor = 0;

  if (!stocks || !Array.isArray(stocks)) {
    return { increase, decrease, ref, ceiling, floor };
  }

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];

    // CHỈ tính toán cho CỔ PHIẾU (3 ký tự) và CÓ GIAO DỊCH
    if (stock.symbol && stock.symbol.length === 3 && (stock.totalVolume || 0) > 0) {
      if (stock.matchPrice === stock.refPrice) {
        ref++;
      } else if (stock.matchPrice > stock.refPrice) {
        increase++;
        if (stock.matchPrice >= stock.ceiling) ceiling++;
      } else if (stock.matchPrice < stock.refPrice) {
        decrease++;
        if (stock.matchPrice <= stock.floor) floor++;
      }
    }
  }

  return { increase, decrease, ref, ceiling, floor };
};
