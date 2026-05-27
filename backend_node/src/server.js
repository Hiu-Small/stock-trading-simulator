import express from "express";
import { createServer } from 'http';
import { Server } from 'socket.io';
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
import { syncTotalInvested } from "./service/walletService.js";

import { initSocket } from "./config/socket.js";

const app = express();
const httpServer = createServer(app);
app.set('trust proxy', true);
const PORT = process.env.PORT || 8080;

// ==========================================
// 1. CẤU HÌNH SOCKET.IO
// ==========================================
const io = initSocket(httpServer, ["http://localhost:5173", "https://stock-trading-simulator-silk.vercel.app/"]);

// Chia sẻ đối tượng `io` ra toàn hệ thống qua Express app
app.set('io', io);

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

httpServer.listen(PORT, () => {
  console.log("backend_node is running on the port = ", PORT);
  // Khởi động Matching Engine sau khi server đã sẵn sàng
  startMatchingEngine();
  // Khởi chạy đồng bộ hóa vốn đầu tư hiện tại cho ví
  syncTotalInvested();
});
