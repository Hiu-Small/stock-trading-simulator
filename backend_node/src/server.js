import express from "express";
import configViewEngine from "./config/viewEngine";
import configCors from "./config/cors";
require("dotenv").config();
import bodyParser from "body-parser";
import initMarketRoutes from "./routes/marketRoutes";
import initCompanyRoutes from "./routes/companyRoutes";
import initAuthRoutes from "./routes/authRoutes";

const app = express();
const PORT = process.env.PORT || 8080;

//config cors
configCors(app);

//config view engine
configViewEngine(app);

//config body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//init web routes
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

app.listen(PORT, () => {
  console.log("backend_node is running on the port = ", PORT);
});
