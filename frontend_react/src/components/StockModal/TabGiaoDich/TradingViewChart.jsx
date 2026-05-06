import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import "./TradingViewChart.scss";
import { fetchStockHistory } from "../../../services/marketApi";

const INTERVALS = [
  { label: "1M", value: "1M", zoomDays: 22 },
  { label: "3M", value: "3M", zoomDays: 66 },
  { label: "6M", value: "6M", zoomDays: 132 },
  { label: "1Y", value: "1Y", zoomDays: 250 },
  { label: "5Y", value: "5Y", zoomDays: 1250 },
  { label: "All", value: "All", zoomDays: null },
];

// ============================================
// ERROR BOUNDARY - Ngăn crash toàn bộ Modal
// ============================================
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="chart-error-state">
          <i className="fa-solid fa-chart-line"></i>
          <p>Không thể hiển thị biểu đồ</p>
          <span>{this.state.errorMsg}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================
// COMPONENT CHART CHÍNH
// ============================================
const TradingViewChartInner = (props) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  const [activeInterval, setActiveInterval] = useState(null);
  const activeIntervalRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State lưu thông tin nến đang hover
  const [hoveredData, setHoveredData] = useState(null);

  // Số lượng nến đã tải (Mặc định tải 2000 nến ~ 8 năm để tiết kiệm API)
  const [currentLength, setCurrentLength] = useState(2000);
  const isInitialLoad = useRef(true);
  const isProgrammaticChange = useRef(false);
  const isHoveringRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Đồng hồ chạy ở footer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Khởi tạo Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#1a1b24" },
        textColor: "#8888aa",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: 0,
        vertLine: { labelBackgroundColor: "#4e5d6c" },
        horzLine: { labelBackgroundColor: "#4e5d6c" },
      },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: false,
      },
      width: chartContainerRef.current.clientWidth || 600,
      height: chartContainerRef.current.clientHeight || 380,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#089981",
      downColor: "#f23645",
      borderVisible: false,
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // ==========================================
    // LOGIC HOVER HIỆN THÔNG TIN (LEGEND)
    // ==========================================
    const updateLegend = (param) => {
      if (param && param.time) isHoveringRef.current = true;
      else if (param === null) isHoveringRef.current = false;

      const allData = candlestickSeries.data();
      if (!allData || allData.length === 0) return;

      let candle;
      let volume;

      if (!param || !param.time) {
        // Nếu không hover, lấy nến cuối cùng
        candle = allData[allData.length - 1];
        const allVol = volumeSeries.data();
        volume = allVol[allVol.length - 1];
      } else {
        candle = param.seriesData.get(candlestickSeries);
        volume = param.seriesData.get(volumeSeries);
      }

      if (candle) {
        const index = allData.findIndex(
          (d) => d.time === (param?.time || candle.time),
        );
        let change = 0;
        let changePercent = 0;

        if (index > 0) {
          const prevClose = allData[index - 1].close;
          change = candle.close - prevClose;
          changePercent = (change / prevClose) * 100;
        } else if (index === 0 && props.data?.refPrice) {
          // Nếu là nến đầu tiên, so với giá tham chiếu nếu có
          const ref =
            props.data.refPrice > 1000
              ? props.data.refPrice / 1000
              : props.data.refPrice;
          change = candle.close - ref;
          changePercent = (change / ref) * 100;
        }

        setHoveredData({
          ...candle,
          volume: volume ? volume.value : 0,
          change,
          changePercent,
          isUp: candle.close >= candle.open,
        });
      }
    };

    chartRef.current.updateLegend = updateLegend; // Gắn vào ref để dùng ở nơi khác
    chart.subscribeCrosshairMove(updateLegend);

    // LOGIC CUỘN VÔ HẠN + HỦY ACTIVE NÚT
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (!range || isInitialLoad.current) return;

      const currentActive = activeIntervalRef.current;

      // 1. Kiểm tra để hủy active nút nếu cuộn quá xa
      if (!isProgrammaticChange.current && currentActive) {
        const intervalConfig = INTERVALS.find((i) => i.value === currentActive);
        if (intervalConfig && intervalConfig.zoomDays) {
          const data = candleSeriesRef.current.data();
          if (data && data.length > 0) {
            const lastTime = data[data.length - 1].time;
            const expectedFrom =
              lastTime - intervalConfig.zoomDays * 24 * 60 * 60;
            const threshold = 15 * 24 * 60 * 60;
            if (Math.abs(range.from - expectedFrom) > threshold) {
              setActiveInterval(null);
              activeIntervalRef.current = null;
            }
          }
        }
      }

      isProgrammaticChange.current = false;

      // 2. Logic load thêm nếu kéo hết 2000 nến
      const data = candleSeriesRef.current.data();
      if (!data || data.length === 0) return;
      const firstDataTime = data[0].time;

      if (range.from < firstDataTime + 10 && currentLength < 5000) {
        setCurrentLength(5000); // Load tối đa 5000 nến (All)
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
      }
    };
  }, []);

  // Load dữ liệu
  useEffect(() => {
    if (!props.symbol || !candleSeriesRef.current || !chartRef.current) return;

    const loadData = async () => {
      if (isInitialLoad.current) setLoading(true);
      setError(null);

      try {
        const res = await fetchStockHistory(props.symbol, currentLength, "1D");

        if (
          !res ||
          !res.success ||
          !Array.isArray(res.data) ||
          res.data.length === 0
        ) {
          if (isInitialLoad.current) setError("Không có dữ liệu lịch sử");
          return;
        }

        const candleData = [];
        const volumeData = [];

        for (const item of res.data) {
          let timeVal;
          if (typeof item.time === "number" && item.time > 0) {
            timeVal = item.time;
          } else if (typeof item.time === "string") {
            // Đảm bảo lấy ngày chuẩn YYYY-MM-DD để Date hiểu là UTC midnight
            const dateOnly = item.time.split("T")[0];
            const parsed = new Date(dateOnly).getTime();
            if (isNaN(parsed)) continue;
            timeVal = Math.floor(parsed / 1000);
          } else continue;

          const scalePrice = (p) => {
            if (!p || isNaN(Number(p))) return null;
            const n = Number(p);
            return n > 1000 ? n / 1000 : n;
          };

          const open = scalePrice(item.open);
          const high = scalePrice(item.high);
          const low = scalePrice(item.low);
          const close = scalePrice(item.close);

          if (!open || !high || !low || !close) continue;
          candleData.push({ time: timeVal, open, high, low, close });
          volumeData.push({
            time: timeVal,
            value: item.volume || 0,
            color: close >= open ? "#1b625c" : "#873642",
          });
        }

        candleData.sort((a, b) => a.time - b.time);
        volumeData.sort((a, b) => a.time - b.time);

        const seen = new Set();
        const uniqueCandles = candleData.filter(
          (c) => !seen.has(c.time) && seen.add(c.time),
        );
        const seenV = new Set();
        const uniqueVolumes = volumeData.filter(
          (v) => !seenV.has(v.time) && seenV.add(v.time),
        );

        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(uniqueCandles);
          volumeSeriesRef.current.setData(uniqueVolumes);

          if (isInitialLoad.current) {
            isProgrammaticChange.current = true;
            const lastTime = uniqueCandles[uniqueCandles.length - 1].time;
            const fromTime = lastTime - 66 * 24 * 60 * 60; // View 3M mặc định
            chartRef.current.timeScale().setVisibleRange({
              from: fromTime,
              to: lastTime + 5 * 24 * 60 * 60,
            });
            isInitialLoad.current = false;
          }
        }
      } catch (err) {
        console.error("[TradingViewChart] Lỗi:", err);
        if (isInitialLoad.current) setError(`Lỗi tải biểu đồ: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [props.symbol, currentLength]);

  // ==========================================
  // LOGIC CẬP NHẬT REAL-TIME (KHÔNG TỐN API)
  // ==========================================
  useEffect(() => {
    if (
      !props.data ||
      !candleSeriesRef.current ||
      !volumeSeriesRef.current ||
      loading ||
      isInitialLoad.current
    )
      return;

    // 0. Kiểm tra giờ giao dịch: Chỉ cập nhật nến mới sau khi vào phiên sáng (9:00 AM VN)
    // Tránh việc hiện nến mới khi chưa có giao dịch thực tế
    const vnNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const currentMins = vnNow.getHours() * 60 + vnNow.getMinutes();
    const isWeekend = vnNow.getDay() === 0 || vnNow.getDay() === 6;
    if (isWeekend || currentMins < 540) return;

    // 1. Xác định timestamp ngày hôm nay (00:00:00 theo ngày VN)
    const vnDateStr = vnNow.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); // Định dạng YYYY-MM-DD
    const today = Math.floor(new Date(vnDateStr).getTime() / 1000);

    const scalePrice = (p) => {
      if (!p || isNaN(Number(p))) return null;
      const n = Number(p);
      return n > 1000 ? n / 1000 : n;
    };

    // 2. Trích xuất dữ liệu
    const currentPrice = scalePrice(props.data.matchPrice);
    const openPrice = scalePrice(props.data.openPrice) || currentPrice;
    const highPrice = scalePrice(props.data.high) || currentPrice;
    const lowPrice = scalePrice(props.data.low) || currentPrice;
    const totalVol = props.data.totalVolume || 0;

    if (!currentPrice) return;

    // 3. Kiểm tra để tránh lỗi "Cannot update oldest data"
    const currentData = candleSeriesRef.current.data();
    if (currentData.length > 0) {
      const lastTime = currentData[currentData.length - 1].time;
      if (today < lastTime) return; // Không cập nhật nếu today nhỏ hơn nến cuối cùng
    }

    // 4. Cập nhật nến hiện tại
    candleSeriesRef.current.update({
      time: today,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: currentPrice,
    });

    // 5. Cập nhật cột khối lượng
    volumeSeriesRef.current.update({
      time: today,
      value: totalVol,
      color: currentPrice >= openPrice ? "#1b625c" : "#873642",
    });

    // 6. Cập nhật Legend nếu không đang hover
    if (!isHoveringRef.current && chartRef.current?.updateLegend) {
      chartRef.current.updateLegend(null);
    }
  }, [props.data, loading]);

  // Xử lý chuyển mốc thời gian (Zoom client-side)
  const handleIntervalClick = (iv) => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    isProgrammaticChange.current = true;
    setActiveInterval(iv.value);
    activeIntervalRef.current = iv.value;

    const data = candleSeriesRef.current.data();
    if (!data || data.length === 0) return;
    const lastTime = data[data.length - 1].time;

    if (iv.value === "All") {
      if (currentLength < 5000) {
        setCurrentLength(5000);
      } else {
        chartRef.current.timeScale().fitContent();
      }
    } else {
      const fromTime = lastTime - iv.zoomDays * 24 * 60 * 60;
      chartRef.current.timeScale().setVisibleRange({
        from: fromTime,
        to: lastTime + 5 * 24 * 60 * 60,
      });
    }
  };

  const refPriceDisplay = props.data?.refPrice
    ? `TC: ${(props.data.refPrice > 1000 ? props.data.refPrice / 1000 : props.data.refPrice).toFixed(2)}`
    : "";

  return (
    <div className="trading-view-container">
      <div className="chart-toolbar">
        <div className="toolbar-left">
          <div className="symbol-section">
            <div className="symbol-row">
              <span className="symbol-label">{props.symbol}</span>
              <div className="price-legend">
                {refPriceDisplay && (
                  <span className="ref-price">{refPriceDisplay}</span>
                )}
                {hoveredData && (
                  <>
                    <span className="ohlc-item">
                      O{" "}
                      <span
                        className={`val ${hoveredData.isUp ? "up" : "down"}`}
                      >
                        {hoveredData.open.toFixed(2)}
                      </span>
                    </span>
                    <span className="ohlc-item">
                      H{" "}
                      <span
                        className={`val ${hoveredData.isUp ? "up" : "down"}`}
                      >
                        {hoveredData.high.toFixed(2)}
                      </span>
                    </span>
                    <span className="ohlc-item">
                      L{" "}
                      <span
                        className={`val ${hoveredData.isUp ? "up" : "down"}`}
                      >
                        {hoveredData.low.toFixed(2)}
                      </span>
                    </span>
                    <span className="ohlc-item">
                      C{" "}
                      <span
                        className={`val ${hoveredData.isUp ? "up" : "down"}`}
                      >
                        {hoveredData.close.toFixed(2)}
                      </span>
                    </span>
                    <span
                      className={`ohlc-change ${hoveredData.isUp ? "up" : "down"}`}
                    >
                      {hoveredData.change >= 0 ? "+" : ""}
                      {hoveredData.change.toFixed(2)}(
                      {hoveredData.changePercent >= 0 ? "+" : ""}
                      {hoveredData.changePercent.toFixed(2)}%)
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="volume-row">
              Volume - Khối lượng{" "}
              <span
                className={`vol-val ${hoveredData ? (hoveredData.isUp ? "up" : "down") : props.data?.matchPrice >= props.data?.openPrice ? "up" : "down"}`}
              >
                {(
                  hoveredData?.volume ||
                  props.data?.totalVolume ||
                  0
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-wrapper" ref={chartContainerRef}>
        {loading && (
          <div className="chart-overlay">
            <div className="chart-loading">Đang tải biểu đồ...</div>
          </div>
        )}
        {error && !loading && (
          <div className="chart-overlay">
            <div className="chart-error-msg">{error}</div>
          </div>
        )}
      </div>

      <div className="chart-footer">
        <div className="footer-left">
          <div className="interval-group">
            {INTERVALS.map((iv) => (
              <button
                key={iv.value}
                className={`interval-btn ${activeInterval === iv.value ? "active" : ""}`}
                onClick={() => handleIntervalClick(iv)}
              >
                {iv.label.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="footer-separator"></div>
          <button className="footer-icon-btn">
            <i className="fa-regular fa-calendar-days"></i>
          </button>
        </div>

        <div className="footer-right">
          <span className="footer-clock">
            {currentTime.toLocaleTimeString("vi-VN", { hour12: false })} (UTC+7)
          </span>
        </div>
      </div>
    </div>
  );
};

// Bọc Error Boundary để tránh crash toàn bộ Modal
const TradingViewChart = (props) => (
  <ChartErrorBoundary>
    <TradingViewChartInner {...props} />
  </ChartErrorBoundary>
);

export default TradingViewChart;
