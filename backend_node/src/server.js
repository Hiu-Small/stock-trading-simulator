import express from "express";
import configViewEngine from "./config/viewEngine";
import configCors from "./config/cors";
require("dotenv").config();
import bodyParser from "body-parser";
import initMarketRoutes from "./routes/marketRoutes";
import initCompanyRoutes from "./routes/companyRoutes";
import initAuthRoutes from "./routes/authRoutes";
import initAdminRoutes from "./routes/adminRoutes";
import initOrderRoutes from "./routes/orderRoutes";
import startMatchingEngine from "./service/matchingEngine.js";
import db from "./models";

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 8080;

//config cors
configCors(app);

//config view engine
configViewEngine(app);

//config body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//init web routes
app.get("/ping", (req, res) => {
  res.status(200).send("ok");
});

app.get("/api/ping", (req, res) => {
  res.status(200).send("ok");
});

app.get("/", (req, res) => {
  res.send("Server Node.js đã sẵn sàng!");
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "Kết nối thành công tới Backend Node.js",
    author: "Nguyễn Trung Hiếu",
  });
});

initMarketRoutes(app);
initCompanyRoutes(app);
initAuthRoutes(app);
initAdminRoutes(app);
initOrderRoutes(app);

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

app.listen(PORT, () => {
  console.log("backend_node is running on the port = ", PORT);
  // Khởi động Matching Engine sau khi server đã sẵn sàng
  startMatchingEngine();
  // Khởi chạy đồng bộ hóa vốn đầu tư hiện tại cho ví
  syncTotalInvested();
});
