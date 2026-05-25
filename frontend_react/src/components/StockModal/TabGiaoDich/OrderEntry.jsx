import React, { useState, useEffect, useContext } from "react";
import "./OrderEntry.scss";
import { getUserProfile, verifyPin } from "../../../services/userService";
import { placeOrder, getMyHoldings } from "../../../services/orderService";
import { placeOrderOnBehalf } from "../../../services/adminService";
import { toast } from "react-toastify";
import { UserContext } from "../../../context/UserContext";
import { useTranslation } from "../../../context/LanguageContext";

const OrderEntry = ({ symbol, data, defaultSide, targetUser, isAdmin, onSuccess, onClose }) => {
  const { t, lang } = useTranslation();
  const { refreshBalance } = useContext(UserContext);
  const [userData, setUserData] = useState(null);
  const [account, setAccount] = useState("");

  const getLocalizedMsg = (apiMsg, defaultKey, params = {}) => {
    if (!apiMsg) return t(defaultKey, params);
    const trimmed = apiMsg.trim();
    if (trimmed.includes("không chính xác") || trimmed.includes("Mã PIN")) {
      return t("trading.orderEntry.toasts.incorrectPin", params);
    }
    if (trimmed.includes("thành công")) {
      return t("trading.orderEntry.toasts.orderSuccess", params);
    }
    if (trimmed.includes("thất bại") || trimmed.includes("Không thể đặt lệnh") || trimmed.includes("đang đóng cửa")) {
      return t("trading.orderEntry.toasts.orderFailed", params);
    }
    if (trimmed.includes("Lỗi hệ thống")) {
      return t("trading.orderEntry.toasts.systemError", params);
    }
    return apiMsg;
  };

  const [quantity, setQuantity] = useState(100); // Mặc định 100 cổ
  const [price, setPrice] = useState(data?.matchPrice ? data.matchPrice / 1000 : 0);
  const [isAutoPrice, setIsAutoPrice] = useState(false);
  const [saveAuth, setSaveAuth] = useState(true);

  const [prevSymbol, setPrevSymbol] = useState(symbol);
  const [side, setSide] = useState(defaultSide || "BUY"); // Mặc định là BUY, hoặc theo prop
  const [showTooltip, setShowTooltip] = useState(false);

  const [sellableQty, setSellableQty] = useState(0);

  // Trạng thái các mốc thời gian trong phiên giao dịch
  const [session, setSession] = useState({ ato: false, mtl: false, atc: false });

  const fetchSellableQuantity = async () => {
    if (isAdmin && targetUser) {
      const holdings = targetUser.holdings || [];
      const currentHolding = holdings.find(
        (h) => h.stock?.symbol?.toUpperCase() === symbol?.toUpperCase()
      );
      setSellableQty(currentHolding ? (currentHolding.sellableQuantity ?? currentHolding.quantity) : 0);
      return;
    }
    try {
      const response = await getMyHoldings();
      if (response && response.EC === 0) {
        const holdings = response.DT || [];
        const currentHolding = holdings.find(
          (h) => h.stock?.symbol?.toUpperCase() === symbol?.toUpperCase()
        );
        setSellableQty(currentHolding ? (currentHolding.sellableQuantity ?? currentHolding.quantity) : 0);
      } else {
        setSellableQty(0);
      }
    } catch (error) {
      console.error("Error fetching sellable quantity:", error);
      setSellableQty(0);
    }
  };

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
    fetchSellableQuantity();
  }, [symbol, userData]);

  // Lấy phiên hiện tại dựa trên giờ Việt Nam thực tế
  const getCurrentPeriod = () => {
    const vnNow = getVietnamTime();
    const day = vnNow.getDay();
    const hours = vnNow.getHours();
    const minutes = vnNow.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Thứ 7, Chủ Nhật: Ngoài phiên => ATO phiên tiếp theo
    if (day === 0 || day === 6) {
      return "ATO";
    }

    // Phiên ATO: 09:00 - 09:15
    if (totalMinutes >= 540 && totalMinutes < 555) {
      return "ATO";
    }

    // Phiên liên tục MTL: 09:15 - 11:30 và 13:00 - 14:30
    if ((totalMinutes >= 555 && totalMinutes < 690) || (totalMinutes >= 780 && totalMinutes < 870)) {
      return "MTL";
    }

    // Phiên đóng cửa ATC: 14:30 - 14:45
    if (totalMinutes >= 870 && totalMinutes < 885) {
      return "ATC";
    }

    // Trước giờ giao dịch (00:00 - 09:00): ATO
    if (totalMinutes < 540) {
      return "ATO";
    }

    // Nghỉ trưa (11:30 - 13:00): MTL (chuẩn bị cho phiên chiều)
    if (totalMinutes >= 690 && totalMinutes < 780) {
      return "MTL";
    }

    // Sau giờ đóng cửa (14:45 - 24:00): ATO (cho ngày hôm sau)
    if (totalMinutes >= 885) {
      return "ATO";
    }

    return "ATO";
  };

  useEffect(() => {
    // Nếu chế độ giá tự động đang BẬT
    if (isAutoPrice) {
      const period = getCurrentPeriod();
      setPrice(period);
    }
  }, [isAutoPrice, session, side]);

  useEffect(() => {
    // Nếu đổi mã chứng khoán hoặc giá hiện tại đang bằng 0, cập nhật giá theo thị trường
    // (Chỉ chạy khi KHÔNG bật giá tự động, và đợi đến khi dữ liệu mới của mã này được tải về khớp với symbol)
    if (!isAutoPrice && data && data.symbol && data.symbol.toUpperCase() === symbol.toUpperCase()) {
      if (symbol !== prevSymbol || price === 0) {
        const targetPrice = data.matchPrice ? data.matchPrice : data.refPrice;
        if (targetPrice > 0) {
          setPrice(targetPrice / 1000);
          setPrevSymbol(symbol);
        }
      }
    }
  }, [data, symbol, isAutoPrice, prevSymbol, price]);

  const fetchUserData = async () => {
    if (isAdmin && targetUser) {
      const mappedUserData = {
        ...targetUser,
        wallet: {
          balance: targetUser.virtual_balance,
          frozen_balance: targetUser.frozen_balance || 0,
          pending_cash: 0
        }
      };
      setUserData(mappedUserData);
      setAccount(targetUser.account_number);
      return;
    }
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

  const getTickSize = (priceVal, exchange = 'HOSE') => {
    const currentExchange = (exchange || 'HOSE').toUpperCase();
    const p = Number(priceVal || 0);
    
    if (currentExchange === 'HNX' || currentExchange === 'UPCOM') {
      return 0.10;
    }
    
    // Sàn HOSE
    if (p < 10.00) {
      return 0.01;
    } else if (p < 50.00) {
      return 0.05;
    } else {
      return 0.10;
    }
  };

  const handlePriceBlur = () => {
    if (isAutoPrice || typeof price === "string" || !price) return;
    const currentExchange = data?.exchange || 'HOSE';
    const numPrice = Number(price);
    const tick = getTickSize(numPrice, currentExchange);
    const rounded = Math.round(numPrice / tick) * tick;
    setPrice(parseFloat(rounded.toFixed(2)));
  };

  const formatNumber = (num) => {
    return Math.floor(Number(num || 0)).toLocaleString('vi-VN');
  };

  const getButtonLabel = (orderSide) => {
    if (submitting) return t("trading.orderEntry.processing");
    const baseLabel = orderSide === "BUY" ? t("trading.orderEntry.buy") : t("trading.orderEntry.sell");
    
    if (["ATO", "ATC", "MTL"].includes(price)) {
      return `${baseLabel} (${price})`;
    }
    return baseLabel;
  };

  const handleToggleAutoPrice = () => {
    const nextVal = !isAutoPrice;
    setIsAutoPrice(nextVal);
    if (!nextVal) {
      // Đưa về giá khớp gần nhất hoặc giá tham chiếu khi tắt đi
      const targetPrice = data?.matchPrice || data?.refPrice || 0;
      if (targetPrice > 0) {
        setPrice(targetPrice / 1000);
      } else {
        setPrice(0);
      }
    }
  };

  // Tính toán sức mua và giá trị (Hỗ trợ cả trường hợp chọn ATO/ATC/MTL dạng chữ bằng cách dùng matchPrice hiện tại làm ước lượng)
  const availableCash = Number(userData?.wallet?.balance || 0) - Number(userData?.wallet?.frozen_balance || 0);
  const pendingCash = Number(userData?.wallet?.pending_cash || 0);
  const buyingPower = availableCash + pendingCash;

  const currentPrice = typeof price === "string" 
    ? (data?.matchPrice || data?.refPrice || 0) 
    : (Number(price || 0) > 0 ? Number(price) * 1000 : 0);
  const maxBuyQty = currentPrice > 0 ? Math.floor(buyingPower / currentPrice) : 0;
  const totalValue = Number(quantity || 0) * currentPrice;

  // Ước tính phí ứng trước nếu mua vượt quá tiền mặt hiện có
  const needAdvance = side === "BUY" && totalValue > availableCash && totalValue <= buyingPower;
  const estimatedAdvanceAmount = needAdvance ? totalValue - availableCash : 0;
  const estimatedAdvanceFee = needAdvance ? estimatedAdvanceAmount * (0.038 / 100) * 2 : 0;

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
      toast.error(t("trading.orderEntry.toasts.enterPin"));
      return;
    }

    setSubmitting(true);
    try {
      // 1. Xác thực mã PIN thông qua API backend
      const pinRes = await verifyPin(pinCode);
      if (!pinRes || pinRes.EC !== 0) {
        toast.error(getLocalizedMsg(pinRes?.EM, "trading.orderEntry.toasts.incorrectPin"));
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
        const displaySide = orderSide === "BUY" ? (lang === "vi" ? "MUA" : "BUY") : (lang === "vi" ? "BÁN" : "SELL");
        const displayPrice = (numericPrice * 1000).toLocaleString(lang === "vi" ? "vi-VN" : "en-US");
        const displayQty = qty.toLocaleString(lang === "vi" ? "vi-VN" : "en-US");

        toast.success(
          getLocalizedMsg(res.EM, "trading.orderEntry.toasts.orderSuccess", {
            side: displaySide,
            price: displayPrice,
            qty: displayQty,
          })
        );
        // Làm mới thông tin ví, số dư ở cả ô OrderEntry và Header (Vốn ảo)
        fetchUserData();
        refreshBalance();
        fetchSellableQuantity();
        // Đóng modal
        setShowPinConfirm(false);
        setPendingOrder(null);
        setPinDigits(["", "", "", "", "", ""]);
      } else {
        toast.error(getLocalizedMsg(res?.EM, "trading.orderEntry.toasts.orderFailed"));
      }
    } catch (err) {
      console.error("[OrderEntry] Lỗi đặt lệnh hoặc mã PIN:", err);
      toast.error(getLocalizedMsg(err?.response?.data?.EM, "trading.orderEntry.toasts.systemError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceNewOrder = async (orderSide) => {
    if (submitting) return;

    // 1. Kiểm tra khối lượng
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error(t("trading.orderEntry.toasts.invalidQty"));
      return;
    }

    // Kiểm tra số lượng cổ phiếu khả dụng để bán
    if (orderSide === "SELL") {
      if (qty > sellableQty) {
        toast.error(t("trading.orderEntry.toasts.insufficientQty").replace("{qty}", sellableQty));
        return;
      }
    }

    // 2. Xác định kiểu lệnh (type) và giá số thực (numericPrice)
    let orderType = "LO";
    let numericPrice = 0;

    if (price === "ATO") {
      orderType = "ATO";
      numericPrice = data?.matchPrice || data?.refPrice || 0;
    } else if (price === "ATC") {
      orderType = "ATC";
      numericPrice = data?.matchPrice || data?.refPrice || 0;
    } else if (price === "MTL") {
      orderType = "MTL";
      numericPrice = data?.matchPrice || data?.refPrice || 0;
    } else {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0) {
        toast.error(t("trading.orderEntry.toasts.invalidPrice"));
        return;
      }
      numericPrice = p * 1000; // Quy đổi từ nghìn đồng sang VNĐ
    }

    if (numericPrice <= 0) {
      toast.error(t("trading.orderEntry.toasts.invalidStockPrice"));
      return;
    }

    // Kiểm tra bước giá (Tick Size) đối với lệnh LO
    if (orderType === "LO") {
      const currentExchange = (data?.exchange || 'HOSE').toUpperCase();
      const tick = getTickSize(price, currentExchange);
      const priceInVnd = numericPrice;
      const tickInVnd = tick * 1000;
      
      const priceInt = Math.round(priceInVnd);
      const tickInt = Math.round(tickInVnd);
      
      if (priceInt % tickInt !== 0) {
        toast.error(t("trading.orderEntry.toasts.invalidTick").replace("{exchange}", currentExchange).replace("{tick}", tickInt));
        return;
      }
    }

    // Kiểm tra sức mua đối với lệnh mua
    if (orderSide === "BUY") {
      const baseFeePct = 0.15; // Phí giao dịch tạm tính
      const totalRequired = qty * numericPrice * (1 + baseFeePct / 100);
      if (totalRequired > buyingPower) {
        toast.error(t("trading.orderEntry.toasts.insufficientCash").replace("{required}", formatNumber(totalRequired)).replace("{max}", formatNumber(buyingPower)));
        return;
      }
    }

    if (isAdmin && targetUser) {
      setSubmitting(true);
      try {
        const res = await placeOrderOnBehalf(targetUser.id, symbol, qty, numericPrice, orderSide, orderType);
        if (res && res.data?.EC === 0) {
          const displaySide = orderSide === "BUY" ? (lang === "vi" ? "MUA" : "BUY") : (lang === "vi" ? "BÁN" : "SELL");
          const displayPrice = (numericPrice * 1000).toLocaleString(lang === "vi" ? "vi-VN" : "en-US");
          const displayQty = qty.toLocaleString(lang === "vi" ? "vi-VN" : "en-US");

          toast.success(
            getLocalizedMsg(res.data?.EM || res.EM, "trading.orderEntry.toasts.orderSuccess", {
              side: displaySide,
              price: displayPrice,
              qty: displayQty,
            })
          );
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        } else {
          toast.error(getLocalizedMsg(res?.data?.EM || res?.EM, "trading.orderEntry.toasts.orderFailed"));
        }
      } catch (err) {
        console.error("Order behalf error:", err);
        toast.error(getLocalizedMsg(err?.response?.data?.EM, "trading.orderEntry.toasts.systemError"));
      } finally {
        setSubmitting(false);
      }
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
        <div className="title">{t("trading.orderEntry.title")}</div>
      </div>

      <div className="order-entry-body">
        {/* Account Selection */}
        <div className="form-row">
          <label>{t("trading.orderEntry.accountLabel")}</label>
          <div className="account-select-wrapper">
            <select value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value={userData?.account_number}>{userData?.account_number}</option>
            </select>
            <i className="fa-solid fa-gear settings-icon"></i>
          </div>
        </div>

        {/* Buying Power */}
        <div className="form-row buying-power">
          <label>{t("trading.orderEntry.buyingPower")} <i className="fa-regular fa-circle-question"></i></label>
          <div className="value-group">
            <span className="balance">{formatNumber(buyingPower)} VNĐ</span>
            <span className="limits-wrapper">
              (<span className="buy-limit">{formatNumber(maxBuyQty)}</span>
              <span className="divider"> / </span>
              <span className="sell-limit">{formatNumber(sellableQty)}</span>)
            </span>
          </div>
        </div>
        {pendingCash > 0 && (
          <div className="form-row pending-cash-info" style={{ fontSize: '11px', color: '#aaa', marginTop: '-10px', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <span>{t("trading.orderEntry.buyingPowerHint").replace("{availableCash}", formatNumber(availableCash)).replace("{pendingCash}", formatNumber(pendingCash))}</span>
          </div>
        )}

        {/* Auto Price */}
        <div className="form-row auto-price">
          <label>
            {t("trading.orderEntry.autoPrice")}
            <div 
              className="tooltip-wrapper"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <i className="fa-regular fa-circle-question"></i>
              {showTooltip && (
                <div className="tooltip-box">
                  <p>{t("trading.orderEntry.autoPriceBuyHint")}</p>
                  <p>{t("trading.orderEntry.autoPriceSellHint")}</p>
                </div>
              )}
            </div>
          </label>
          <div className={`toggle-switch ${isAutoPrice ? 'active' : ''}`} onClick={handleToggleAutoPrice}>
            <span className="toggle-circle"></span>
          </div>
        </div>

        {/* Quantity */}
        <div className="form-row">
          <label>{t("trading.orderEntry.quantity")}</label>
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
          <label>{t("trading.orderEntry.price")}</label>
          <div className={`number-input ${isAutoPrice || typeof price === "string" ? 'disabled' : ''}`}>
            <button 
              onClick={() => {
                if (isAutoPrice || typeof price === "string") return;
                const currentExchange = data?.exchange || 'HOSE';
                const tick = getTickSize(price, currentExchange);
                const nextVal = Math.max(0, Number(price) - tick);
                setPrice(parseFloat(nextVal.toFixed(2)));
              }}
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
              onBlur={handlePriceBlur}
              disabled={isAutoPrice}
            />
            <button 
              onClick={() => {
                if (isAutoPrice || typeof price === "string") return;
                const currentExchange = data?.exchange || 'HOSE';
                const tick = getTickSize(price, currentExchange);
                const nextVal = Number(price) + tick;
                setPrice(parseFloat(nextVal.toFixed(2)));
              }}
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
            title={session.mtl ? t("trading.orderEntry.mtlContinuous") : t("trading.orderEntry.mtlContinuousOnly")}
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
            title={session.ato ? t("trading.orderEntry.atoOpening") : t("trading.orderEntry.atoOpeningOnly")}
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
            title={session.atc ? t("trading.orderEntry.atcClosing") : t("trading.orderEntry.atcClosingOnly")}
          >
            ATC
          </button>
        </div>


        {/* Value Display */}
        <div className="form-row total-value">
          <label>{t("trading.orderEntry.value")}</label>
          <span className="value">{formatNumber(totalValue)} VNĐ</span>
        </div>
        {needAdvance && (
          <div className="form-row advance-warning" style={{ fontSize: '12px', color: '#ffc107', marginTop: '-10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', width: '100%' }}>
            <span>{t("trading.orderEntry.autoAdvance").replace("{amount}", formatNumber(estimatedAdvanceAmount))}</span>
            <span>{t("trading.orderEntry.estimatedAdvanceFee").replace("{amount}", formatNumber(estimatedAdvanceFee))}</span>
          </div>
        )}



        {/* Authentication */}
        <div className="form-row auth-section">
          <label>{t("trading.orderEntry.verification")}</label>
          <div className="auth-controls">
            <span className="otp-label">{t("trading.orderEntry.smartOtp")}</span>
            <label className="checkbox-container">
              <input type="checkbox" checked={saveAuth} onChange={() => setSaveAuth(!saveAuth)} />
              <span className="checkmark"></span>
              {t("trading.orderEntry.rememberAuth")}
            </label>
            <select className="otp-select">
              <option>8...</option>
            </select>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="action-buttons">
          <button className="btn-buy" onClick={() => handlePlaceNewOrder("BUY")} disabled={submitting}>
            {getButtonLabel("BUY")}
          </button>
          <button className="btn-sell" onClick={() => handlePlaceNewOrder("SELL")} disabled={submitting}>
            {getButtonLabel("SELL")}
          </button>
        </div>

      </div>

      {/* PIN Confirmation Modal */}
      {showPinConfirm && (
        <div className="pin-confirm-overlay">
          <div className="pin-confirm-modal">
            <div className="pin-confirm-header">
              <i className="fa-solid fa-shield-halved secure-icon"></i>
              <h3>{t("trading.orderEntry.pinModal.title")}</h3>
              <p>{t("trading.orderEntry.pinModal.subtitle")}</p>
            </div>
            
            <div className="order-summary-box">
              <div className="summary-row">
                <span className="lbl">{t("trading.orderEntry.pinModal.order")}</span>
                <span className={`val side-${pendingOrder?.orderSide?.toLowerCase()}`}>
                  {pendingOrder?.orderSide === "BUY" ? t("trading.orderEntry.pinModal.buySide") : t("trading.orderEntry.pinModal.sellSide")} {pendingOrder?.symbol}
                </span>
              </div>
              <div className="summary-row">
                <span className="lbl">{t("trading.orderEntry.pinModal.quantity")}</span>
                <span className="val">{formatNumber(pendingOrder?.qty)} {lang === "vi" ? t("trading.orderEntry.pinModal.qtyUnit") : t("trading.orderEntry.pinModal.sharesUnit")}</span>
              </div>
              <div className="summary-row">
                <span className="lbl">{t("trading.orderEntry.pinModal.price")}</span>
                <span className="val">
                  {pendingOrder?.orderType !== "LO" 
                    ? pendingOrder?.orderType 
                    : `${(pendingOrder?.numericPrice / 1000).toFixed(2)} (${formatNumber(pendingOrder?.numericPrice)} ₫)`}
                </span>
              </div>
              {pendingOrder?.orderSide === "BUY" && (pendingOrder?.qty * pendingOrder?.numericPrice) > availableCash && (
                <div className="summary-row" style={{ color: '#ffc107', fontSize: '12px' }}>
                  <span className="lbl">{t("trading.orderEntry.pinModal.advanceFee")}</span>
                  <span className="val">
                    {formatNumber(((pendingOrder?.qty * pendingOrder?.numericPrice) - availableCash) * (0.038 / 100) * 2)} ₫
                  </span>
                </div>
              )}
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
                  {t("trading.orderEntry.pinModal.cancel")}
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? t("trading.orderEntry.processing") : t("trading.orderEntry.pinModal.confirm")}
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
