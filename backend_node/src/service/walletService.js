import db from "../models";

const syncTotalInvested = async () => {
  try {
    console.log("[System] 🔄 Khởi tạo đồng bộ total_invested cho ví...");
    const wallets = await db.Wallet.findAll();
    for (const wallet of wallets) {
      const holdings = await db.Holding.findAll({
        where: { user_id: wallet.user_id }
      });
      const total = holdings.reduce((sum, h) => {
        return sum + (parseFloat(h.quantity) * parseFloat(h.average_price));
      }, 0);
      
      // Chỉ cập nhật nếu giá trị lưu trong DB khác với thực tế tính được
      if (parseFloat(wallet.total_invested || 0) !== total) {
        await wallet.update({ total_invested: total });
        console.log(`[System] 🔧 Đã sửa total_invested cho user #${wallet.user_id} thành ${total.toLocaleString('vi-VN')} ₫`);
      }
    }
    console.log("[System] ✅ Đồng bộ total_invested hoàn tất!");
  } catch (err) {
    console.error("[System] ❌ Lỗi đồng bộ total_invested:", err);
  }
};

export { syncTotalInvested };
