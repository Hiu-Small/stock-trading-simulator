import React, { useState, useEffect, useContext } from "react";
import "./OrderEntry.scss";
import { getUserProfile, verifyPin } from "../../../services/userService";
import { placeOrder } from "../../../services/orderService";
import { toast } from "react-toastify";
import { UserContext } from "../../../context/UserContext";

const OrderEntry = ({ symbol, data }) => {
  const { refreshBalance } = useContext(UserContext);
  const [userData, setUserData] = useState(null);
  const [account, setAccount] = useState("");

  const [quantity, setQuantity] = useState(100); // Mặc định 100 cổ
  const [price, setPrice] = useState(data?.matchPrice ? data.matchPrice / 1000 : 0);
  const [isAutoPrice, setIsAutoPrice] = useState(false);
  const [saveAuth, setSaveAuth] = useState(true);

  const [prevSymbol, setPrevSymbol] = useState(symbol);
  const [side, setSide] = useState("BUY"); // Mặc định là BUY
  const [showTooltip, setShowTooltip] = useState(false);

  // Trạng thái các mốc thời gian trong phiên giao dịch
  const [session, setSession] = useState({ ato: false, mtl: false, atc: false });

  // Lấy thời gian Việt Nam (UTC+7) chuẩn xác không phụ thuộc giờ hệ thống địa phương của Client
  const getVietnamTime = () => {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 7);
  };

  // Kiểm tra phiên giao dịch theo thời gian thực tế mỗi 10 giây
  useEffect(() => {
    const checkSession = () => {
      const vnNow = getVietnamTime();
      const day = vnNow.getDay(); // 0 = Chủ nhật, 6 = Thứ bảy
      const hours = vnNow.getHours();
      const minutes = vnNow.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // Không trong phiên giao dịch vào ngày cuối tuần (Thứ 7 & CN)
      if (day === 0 || day === 6) {
        setSession({ ato: false, mtl: false, atc: false });
        return;
      }

      // Phiên mở cửa ATO: 09:00 - 09:15 (540 đến 555 phút)
      const isATO = totalMinutes >= 540 && totalMinutes < 555;

      // Phiên MTL (Khớp lệnh liên tục): 09:15 - 11:30 (555 đến 690 phút) và 13:00 - 14:30 (780 đến 870 phút)
      const isMTL = (totalMinutes >= 555 && totalMinutes < 690) || (totalMinutes >= 780 && totalMinutes < 870);

      // Phiên đóng cửa ATC: Cho phép đặt lệnh từ khi phiên liên tục bắt đầu (9:15) cho tới hết phiên ATC (14:45) dưới dạng lệnh chờ
      const isATC = totalMinutes >= 555 && totalMinutes < 885;

      setSession({ ato: isATO, mtl: isMTL, atc: isATC });
    };

    checkSession();
    const interval = setInterval(checkSession, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    // Nếu chế độ giá tự động đang BẬT
    if (isAutoPrice && data) {
      if (side === "BUY" && data.ask1Price) {
        setPrice(data.ask1Price / 1000);
      } else if (side === "SELL" && data.bid1Price) {
        setPrice(data.bid1Price / 1000);
      }
    }
  }, [isAutoPrice, data, side]);

  useEffect(() => {
    // Nếu đổi mã chứng khoán hoặc giá hiện tại đang bằng 0, cập nhật giá theo thị trường
    // (Chỉ chạy khi KHÔNG bật giá tự động, vì giá tự động đã có useEffect riêng ở trên)
    if (!isAutoPrice && data?.matchPrice && (symbol !== prevSymbol || price === 0)) {
      setPrice(data.matchPrice / 1000);
      setPrevSymbol(symbol);
    }
  }, [data, symbol, isAutoPrice]);

  const fetchUserData = async () => {
    try {
      let response = await getUserProfile();
      if (response && response.EC === 0) {
        setUserData(response.DT);
        setAccount(response.DT.account_number);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const formatNumber = (num) => {
    return Math.floor(Number(num || 0)).toLocaleString('vi-VN');
  };

  // Tính toán sức mua và giá trị (Hỗ trợ cả trường hợp chọn ATO/ATC/MTL dạng chữ bằng cách dùng matchPrice hiện tại làm ước lượng)
  const balance = Number(userData?.wallet?.balance || 0) - Number(userData?.wallet?.frozen_balance || 0);
  const currentPrice = typeof price === "string" 
    ? (data?.matchPrice || 0) 
    : (Number(price || 0) > 0 ? Number(price) * 1000 : 0);
  const maxBuyQty = currentPrice > 0 ? Math.floor(balance / currentPrice) : 0;
  const totalValue = Number(quantity || 0) * currentPrice;

  // Xử lý khi bấm nút Trừ (-)
  const handleDecreaseQty = () => {
    setQuantity(prev => {
      const current = Number(prev);
      if (current > 100) {
        // Nếu đang > 100 (ví dụ 200), trừ đi 100
        // Tự động làm tròn về bội số 100
        return current - 100;
      }
      // Nếu đang <= 100, trừ đi 1 (nhỏ nhất là 1)
      return Math.max(1, current - 1);
    });
  };

  // Xử lý khi bấm nút Cộng (+)
  const handleIncreaseQty = () => {
    setQuantity(prev => {
      const current = Number(prev);
      if (current >= 100) {
        // Nếu chạm mốc 100 trở lên, cộng theo lô 100
        return current + 100;
      }
      // Nếu đang là lô lẻ (< 100), cộng thêm 1
      return current + 1;
    });
  };

  // Xử lý khi người dùng gõ tay và click ra ngoài ô input (Chống nhập sai luật)
  const handleQtyBlur = (e) => {
    let val = parseInt(e.target.value) || 1; // Nếu bỏ trống thì mặc định về 1
    
    if (val > 100 && val % 100 !== 0) {
      // Nếu nhập > 100 mà không phải bội số của 100 (VD: 150, 234)
      // Tự động làm tròn xuống lô chẵn gần nhất (VD: 150 -> 100)
      val = Math.floor(val / 100) * 100;
    }
    
    setQuantity(Math.max(1, val));
  };

  const [submitting, setSubmitting] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);

  const handlePinInput = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinDigits];
    newPin[index] = value.slice(-1);
    setPinDigits(newPin);

    // Tự động focus ô tiếp theo
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name="confirm-order-pin-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      const newPin = [...pinDigits];
      if (!newPin[index] && index > 0) {
        const prevInput = document.querySelector(`input[name="confirm-order-pin-${index - 1}"]`);
        if (prevInput) {
          prevInput.focus();
          const prevPin = [...newPin];
          prevPin[index - 1] = "";
          setPinDigits(prevPin);
        }
      } else {
        newPin[index] = "";
        setPinDigits(newPin);
      }
    }
  };

  const handleCancelPinConfirm = () => {
    setShowPinConfirm(false);
    setPendingOrder(null);
    setPinDigits(["", "", "", "", "", ""]);
  };

  const handleConfirmPinAndPlaceOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const pinCode = pinDigits.join("");
    if (pinCode.length < 6) {
      toast.error("Vui lòng nhập đầy đủ 6 số PIN!");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Xác thực mã PIN thông qua API backend
      const pinRes = await verifyPin(pinCode);
      if (!pinRes || pinRes.EC !== 0) {
        toast.error(pinRes?.EM || "Mã PIN giao dịch không chính xác!");
        // Làm trống mã PIN để nhập lại
        setPinDigits(["", "", "", "", "", ""]);
        // Focus lại ô đầu tiên
        const firstInput = document.querySelector(`input[name="confirm-order-pin-0"]`);
        if (firstInput) firstInput.focus();
        setSubmitting(false);
        return;
      }

      // 2. Thực hiện đặt lệnh thực tế nếu mã PIN hợp lệ
      const { symbol, qty, numericPrice, orderSide, orderType } = pendingOrder;
      const res = await placeOrder(symbol, qty, numericPrice, orderSide, orderType);
      
      if (res && res.EC === 0) {
        toast.success(res.EM || "Đặt lệnh thành công!");
        // Làm mới thông tin ví, số dư ở cả ô OrderEntry và Header (Vốn ảo)
        fetchUserData();
        refreshBalance();
        // Đóng modal
        setShowPinConfirm(false);
        setPendingOrder(null);
        setPinDigits(["", "", "", "", "", ""]);
      } else {
        toast.error(res?.EM || "Đặt lệnh thất bại!");
      }
    } catch (err) {
      console.error("[OrderEntry] Lỗi đặt lệnh hoặc mã PIN:", err);
      toast.error(err?.response?.data?.EM || "Lỗi hệ thống khi đặt lệnh!");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceNewOrder = async (orderSide) => {
    if (submitting) return;

    // 1. Kiểm tra khối lượng
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Vui lòng nhập khối lượng hợp lệ!");
      return;
    }

    // 2. Xác định kiểu lệnh (type) và giá số thực (numericPrice)
    let orderType = "LO";
    let numericPrice = 0;

    if (price === "ATO") {
      orderType = "ATO";
      numericPrice = data?.matchPrice || 0;
    } else if (price === "ATC") {
      orderType = "ATC";
      numericPrice = data?.matchPrice || 0;
    } else if (price === "MTL") {
      orderType = "MTL";
      numericPrice = data?.matchPrice || 0;
    } else {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0) {
        toast.error("Vui lòng nhập giá hợp lệ!");
        return;
      }
      numericPrice = p * 1000; // Quy đổi từ nghìn đồng sang VNĐ
    }

    if (numericPrice <= 0) {
      toast.error("Không thể xác định giá của cổ phiếu!");
      return;
    }

    // Thay vì gửi lệnh trực tiếp, chúng ta lưu thông tin và yêu cầu nhập mã PIN
    setPendingOrder({
      symbol,
      qty,
      numericPrice,
      orderSide,
      orderType
    });
    setPinDigits(["", "", "", "", "", ""]);
    setShowPinConfirm(true);

    // Focus vào ô mã PIN đầu tiên sau khi modal xuất hiện
    setTimeout(() => {
      const firstInput = document.querySelector(`input[name="confirm-order-pin-0"]`);
      if (firstInput) firstInput.focus();
    }, 50);
  };



  return (
    <div className="order-entry-panel">
      <div className="order-entry-header">
        <div className="title">Đặt lệnh</div>
      </div>

      <div className="order-entry-body">
        {/* Symbol Info */}
        <div className="symbol-info">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <span className="symbol-name">{symbol}</span>
          <span className="exchange-name">(HOSE)</span>
        </div>

        {/* Account Selection */}
        <div className="form-row">
          <label>Tài khoản đặt lệnh</label>
          <div className="account-select-wrapper">
            <select value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value={userData?.account_number}>{userData?.account_number}</option>
            </select>
            <i className="fa-solid fa-gear settings-icon"></i>
          </div>
        </div>

        {/* Buying Power */}
        <div className="form-row buying-power">
          <label>Sức mua <i className="fa-regular fa-circle-question"></i></label>
          <div className="value-group">
            <span className="balance">{formatNumber(balance)} VNĐ</span>
            <span className="limits-wrapper">
              (<span className="buy-limit">{formatNumber(maxBuyQty)}</span>
              <span className="divider"> / </span>
              <span className="sell-limit">0</span>)
            </span>
          </div>
        </div>

        {/* Auto Price */}
        <div className="form-row auto-price">
          <label>
            Giá tự động 
            <div 
              className="tooltip-wrapper"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <i className="fa-regular fa-circle-question"></i>
              {showTooltip && (
                <div className="tooltip-box">
                  <p>Giá mua = Giá Dư bán tốt nhất + Biên trượt</p>
                  <p>Giá bán = Giá Dư mua tốt nhất - Biên trượt</p>
                </div>
              )}
            </div>
          </label>
          <div className={`toggle-switch ${isAutoPrice ? 'active' : ''}`} onClick={() => setIsAutoPrice(!isAutoPrice)}>
            <span className="toggle-circle"></span>
          </div>
        </div>

        {/* Quantity */}
        <div className="form-row">
          <label>Khối lượng</label>
          <div className="number-input">
            <button onClick={handleDecreaseQty}>-</button>
            <input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              onBlur={handleQtyBlur}
            />
            <button onClick={handleIncreaseQty}>+</button>
          </div>
        </div>

        {/* Price */}
        <div className="form-row">
          <label>Giá (x1000 VNĐ)</label>
          <div className={`number-input ${isAutoPrice || typeof price === "string" ? 'disabled' : ''}`}>
            <button 
              onClick={() => !isAutoPrice && typeof price !== "string" && setPrice(Math.max(0, (Number(price) - 0.05).toFixed(2)))}
              disabled={isAutoPrice || typeof price === "string"}
            >
              -
            </button>
            <input 
              type={typeof price === "string" ? "text" : "number"}
              step="0.01" 
              value={price} 
              onChange={(e) => {
                if (isAutoPrice) return;
                const val = e.target.value;
                if (["ATO", "ATC", "MTL"].includes(val)) {
                  setPrice(val);
                } else {
                  const num = parseFloat(val);
                  setPrice(isNaN(num) ? "" : num);
                }
              }} 
              disabled={isAutoPrice}
            />
            <button 
              onClick={() => !isAutoPrice && typeof price !== "string" && setPrice(parseFloat((Number(price) + 0.05).toFixed(2)))}
              disabled={isAutoPrice || typeof price === "string"}
            >
              +
            </button>
          </div>
        </div>

        {/* Quick Price Buttons */}
        <div className="quick-price-buttons">
          <button 
            className={`outline-btn ${session.mtl && !isAutoPrice ? "usable" : ""} ${price === "MTL" ? "selected" : ""}`}
            onClick={() => {
              if (session.mtl && !isAutoPrice) {
                setPrice(price === "MTL" ? (data?.matchPrice ? data.matchPrice / 1000 : 0) : "MTL");
              }
            }}
            title={session.mtl ? "Đặt lệnh thị trường MTL" : "Phiên liên tục (9:15-11:30, 13:00-14:30) mới dùng được"}
          >
            MTL
          </button>
          <button 
            className={`outline-btn ${session.ato && !isAutoPrice ? "usable" : ""} ${price === "ATO" ? "selected" : ""}`}
            onClick={() => {
              if (session.ato && !isAutoPrice) {
                setPrice(price === "ATO" ? (data?.matchPrice ? data.matchPrice / 1000 : 0) : "ATO");
              }
            }}
            title={session.ato ? "Đặt lệnh ATO mở cửa" : "Phiên ATO mở cửa (9:00-9:15) mới dùng được"}
          >
            ATO
          </button>
          <button 
            className={`outline-btn ${session.atc && !isAutoPrice ? "usable" : ""} ${price === "ATC" ? "selected" : ""}`}
            onClick={() => {
              if (session.atc && !isAutoPrice) {
                setPrice(price === "ATC" ? (data?.matchPrice ? data.matchPrice / 1000 : 0) : "ATC");
              }
            }}
            title={session.atc ? "Đặt lệnh ATC đóng cửa (Đặt trước dưới dạng lệnh chờ)" : "Phiên ATC đóng cửa (Đặt lệnh chờ khả dụng từ 9:15 đến 14:45)"}
          >
            ATC
          </button>
        </div>


        {/* Value Display */}
        <div className="form-row total-value">
          <label>Giá trị</label>
          <span className="value">{formatNumber(totalValue)} VNĐ</span>
        </div>



        {/* Authentication */}
        <div className="form-row auth-section">
          <label>Kiểu xác thực</label>
          <div className="auth-controls">
            <span className="otp-label">Mã Smart OTP</span>
            <label className="checkbox-container">
              <input type="checkbox" checked={saveAuth} onChange={() => setSaveAuth(!saveAuth)} />
              <span className="checkmark"></span>
              Lưu xác thực
            </label>
            <select className="otp-select">
              <option>8...</option>
            </select>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="action-buttons">
          <button className="btn-buy" onClick={() => handlePlaceNewOrder("BUY")} disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Mua"}
          </button>
          <button className="btn-sell" onClick={() => handlePlaceNewOrder("SELL")} disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Bán"}
          </button>
        </div>

      </div>

      {/* PIN Confirmation Modal */}
      {showPinConfirm && (
        <div className="pin-confirm-overlay">
          <div className="pin-confirm-modal">
            <div className="pin-confirm-header">
              <i className="fa-solid fa-shield-halved secure-icon"></i>
              <h3>Xác thực PIN giao dịch</h3>
              <p>Vui lòng nhập mã PIN gồm 6 chữ số để xác nhận lệnh của bạn.</p>
            </div>
            
            <div className="order-summary-box">
              <div className="summary-row">
                <span className="lbl">Mã lệnh:</span>
                <span className={`val side-${pendingOrder?.orderSide?.toLowerCase()}`}>
                  {pendingOrder?.orderSide === "BUY" ? "MUA" : "BÁN"} {pendingOrder?.symbol}
                </span>
              </div>
              <div className="summary-row">
                <span className="lbl">Khối lượng:</span>
                <span className="val">{formatNumber(pendingOrder?.qty)} CP</span>
              </div>
              <div className="summary-row">
                <span className="lbl">Giá đặt:</span>
                <span className="val">
                  {pendingOrder?.orderType !== "LO" 
                    ? pendingOrder?.orderType 
                    : `${(pendingOrder?.numericPrice / 1000).toFixed(2)} (${formatNumber(pendingOrder?.numericPrice)} ₫)`}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPinAndPlaceOrder}>
              <div className="pin-code-inputs">
                {pinDigits.map((digit, idx) => (
                  <input
                    key={`pin-${idx}`}
                    name={`confirm-order-pin-${idx}`}
                    type="password"
                    maxLength="1"
                    pattern="\d*"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handlePinInput(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(e, idx)}
                    required
                  />
                ))}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCancelPinConfirm} disabled={submitting}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? "Đang xử lý..." : "Xác nhận & Đặt lệnh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderEntry;
