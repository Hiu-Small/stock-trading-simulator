import React, { useState, useEffect } from "react";
import { fetchSystemLogs } from "../../../services/adminService";
import "./SystemLogs.scss";
import { useTranslation } from "../../../context/LanguageContext";

const SystemLogs = () => {
    const { t, lang } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [levelFilter, setLevelFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    
    // Default: From 7 days ago to Today
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [stats, setStats] = useState({
        all: 0,
        info: 0,
        warn: 0,
        error: 0,
        crit: 0
    });

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit, setLimit] = useState(20);
    const [totalRows, setTotalRows] = useState(0);

    useEffect(() => {
        loadLogs(currentPage, limit);
    }, [currentPage, limit]);

    const loadLogs = async (page = 1, currentLimit = 20) => {
        setLoading(true);
        try {
            const res = await fetchSystemLogs(page, currentLimit);
            if (res && res.EC === 0) {
                const { logs: data, totalPages: totalP, totalRows: totalR } = res.DT;
                setLogs(data);
                setFilteredLogs(data);
                setTotalPages(totalP);
                setTotalRows(totalR);
                calculateStats(data);
            }
        } catch (error) {
            console.error("Error loading logs:", error);
        }
        setLoading(false);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const calculateStats = (data) => {
        const counts = {
            all: data.length,
            info: data.filter(l => l.level === 'INFO').length,
            warn: data.filter(l => l.level === 'WARN').length,
            error: data.filter(l => l.level === 'ERROR').length,
            crit: data.filter(l => l.level === 'CRIT' || l.level === 'CRITICAL').length
        };
        setStats(counts);
    };

    useEffect(() => {
        let result = logs;

        // Filter by Date Range
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= start;
            });
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate <= end;
            });
        }

        // Filter by Level
        if (levelFilter !== "all") {
            result = result.filter(log => {
                if (levelFilter === "crit") return log.level === "CRIT" || log.level === "CRITICAL";
                return log.level.toLowerCase() === levelFilter;
            });
        }

        // Search by Action, Actor or IP
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(log => {
                const translated = translateLog(log);
                return (
                    log.action.toLowerCase().includes(term) || 
                    log.actor.toLowerCase().includes(term) || 
                    (log.details && log.details.toLowerCase().includes(term)) ||
                    translated.action.toLowerCase().includes(term) ||
                    translated.details.toLowerCase().includes(term)
                );
            });
        }

        setFilteredLogs(result);
    }, [levelFilter, searchTerm, startDate, endDate, logs, lang]);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleString('vi-VN');
    };

    function translateLog(log) {
        const { action, details } = log;
        let transAction = action;
        let transDetails = details || "";

        const isVi = lang === "vi";
        const actionUpper = (action || "").toUpperCase();

        // 1. Translate the Action name
        let actionKey = "";
        if (actionUpper === "ADMIN_CANCEL_ORDER") {
            actionKey = "adminCancelOrder";
        } else if (actionUpper === "ADMIN_MODIFY_ORDER") {
            actionKey = "adminModifyOrder";
        } else if (actionUpper === "ADMIN_PLACE_ORDER_BEHALF") {
            actionKey = "adminPlaceOrderBehalf";
        } else if (actionUpper === "OPEN_MARKET") {
            actionKey = "openMarket";
        } else if (actionUpper === "CLOSE_MARKET") {
            actionKey = "closeMarket";
        } else if (actionUpper === "ACTIVATE_STOCK") {
            actionKey = "activateStock";
        } else if (actionUpper === "HALT_STOCK") {
            actionKey = "haltStock";
        } else if (actionUpper === "UPDATE_SETTINGS") {
            actionKey = "updateSettings";
        } else if (actionUpper === "RESET_PASSWORD" || actionUpper.includes("RESET PASSWORD") || actionUpper.includes("RESET_PASSWORD")) {
            actionKey = "resetPassword";
        } else if (actionUpper === "RESET_PIN" || actionUpper.includes("RESET PIN") || actionUpper.includes("RESET_PIN")) {
            actionKey = "resetPin";
        } else if (actionUpper === "UPDATE_USER_INFO" || actionUpper.includes("PROFILE_UPDATE")) {
            actionKey = "updateUserInfo";
        } else if (actionUpper.startsWith("UPDATE_USER_STATUS") || actionUpper.includes("STATUS")) {
            actionKey = "updateUserStatus";
        } else if (actionUpper.startsWith("ADJUST_BALANCE") || actionUpper.includes("BALANCE")) {
            actionKey = "adjustBalance";
        } else if (actionUpper.includes("PASSWORD")) {
            actionKey = "changePassword";
        } else if (actionUpper.includes("PIN")) {
            actionKey = "changePin";
        } else if (actionUpper.includes("PLACED") || actionUpper.includes("PLACE")) {
            actionKey = "placeOrder";
        } else if (actionUpper.includes("CANCELLED") || actionUpper.includes("CANCEL")) {
            actionKey = "cancelOrder";
        } else if (actionUpper.includes("MATCHED") || actionUpper.includes("MATCH")) {
            const isPartial = actionUpper.includes("PARTIAL");
            actionKey = isPartial ? "orderPartiallyMatched" : "orderMatched";
        } else if (actionUpper.includes("EXPIRED")) {
            actionKey = "orderExpired";
        } else if (actionUpper.includes("MODIFIED") || actionUpper.includes("MODIFY")) {
            actionKey = "modifyOrder";
        }

        if (actionKey) {
            transAction = t(`admin.logs.actions.${actionKey}`);
        }

        // 2. Apply structural details translations based on language
        if (isVi) {
            // --- PATTERN 1: Admin reset password/PIN ---
            const resetPassMatch = transDetails.match(/Admin reset password for user (\w+) to default (\w+)/i);
            if (resetPassMatch) {
                transDetails = `Admin đã đặt lại mật khẩu cho người dùng ${resetPassMatch[1]} về mặc định ${resetPassMatch[2]}`;
            }
            const resetPinMatch = transDetails.match(/Admin reset PIN for user (\w+) to default (\w+)/i);
            if (resetPinMatch) {
                transDetails = `Admin đã đặt lại mã PIN cho người dùng ${resetPinMatch[1]} về mặc định ${resetPinMatch[2]}`;
            }

            // --- PATTERN 2: Adjusted balance for user by amount. Reason: ---
            const adjustMatch = transDetails.match(/Adjusted balance for user (\d+)\s*\(([^)]+)\) by (-?[\d,.]+)(?:\.\s*Reason:\s*(.*))?/i);
            if (adjustMatch) {
                const isSub = adjustMatch[3].startsWith("-");
                const formatted = Math.abs(Number(adjustMatch[3].replace(/,/g, ""))).toLocaleString('vi-VN');
                const word = isSub ? "khấu trừ" : "cộng thêm";
                const reason = adjustMatch[4] || "";
                transDetails = `Đã điều chỉnh số dư cho người dùng ${adjustMatch[1]} (${adjustMatch[2]}), ${word} ${formatted} ₫.${reason ? ` Lý do: ${reason}` : ""}`;
            }

            // --- PATTERN 3: Profile field update ---
            const profileMatch = transDetails.match(/Field "(.*)" changed from "(.*)" to "(.*)" for user (.*)/i);
            if (profileMatch) {
                transDetails = `Trường thông tin "${profileMatch[1]}" đã thay đổi từ "${profileMatch[2]}" sang "${profileMatch[3]}" cho người dùng ${profileMatch[4]}`;
            }

            // --- PATTERN 4: Admin place order behalf ---
            const behalfMatch = transDetails.match(/Admin placed (BUY|SELL) order behalf of user #(\d+):\s*(\d+)\s*(\w+)\s*@\s*([\d.]+)/i);
            if (behalfMatch) {
                const sideText = behalfMatch[1] === "BUY" ? "MUA" : "BÁN";
                transDetails = `Admin đã đặt lệnh ${sideText} hộ tài khoản #${behalfMatch[2]}: ${behalfMatch[3]} CP ${behalfMatch[4]} @ ${behalfMatch[5]}`;
            }

            // --- PATTERN 5: User changed profile info ---
            const userInfoMatch = transDetails.match(/Updated info for user (\d+)\s*\(([^)]+)\)/i);
            if (userInfoMatch) {
                transDetails = `Đã cập nhật thông tin cho người dùng ${userInfoMatch[1]} (${userInfoMatch[2]})`;
            }

            // --- PATTERN 6: Updated status for user to ---
            const statusMatch = transDetails.match(/Updated status for user (\d+)\s*\(([^)]+)\) to (\w+)/i);
            if (statusMatch) {
                const statusText = statusMatch[3].toLowerCase() === "active" ? "Hoạt động (Active)" : "Khóa (Locked)";
                transDetails = `Đã cập nhật trạng thái tài khoản cho người dùng ${statusMatch[1]} (${statusMatch[2]}) thành ${statusText}`;
            }

            // --- PATTERN 7: Mixed/English Match Log to perfect Vietnamese ---
            const matchLogRegex = /^(Khớp một phần|Khớp hoàn toàn|Partially matched|Fully matched) lệnh của (?:account|tài khoản) (.*?) \((.*?)\) (BUY|SELL|MUA|BÁN):\s*(?:Matched|Đã khớp)\s*(\d+)\s*(?:shares|CP)\s*(\w+)\s*(?:at\s*price|với\s*giá)\s*([\d,.]+)(?:\s*₫)?(?:\s*(?:at|vào\s*lúc)\s*([\d:]+))?/i;
            const matchLogMatch = transDetails.match(matchLogRegex);
            if (matchLogMatch) {
                const isPartial = matchLogMatch[1].toLowerCase().includes("một phần") || matchLogMatch[1].toLowerCase().includes("partial");
                const typeText = isPartial ? "Khớp một phần" : "Khớp hoàn toàn";
                const sideText = (matchLogMatch[4] === "BUY" || matchLogMatch[4] === "MUA") ? "MUA" : "BÁN";
                const formattedQty = Number(matchLogMatch[5]).toLocaleString('vi-VN');
                const formattedPrice = matchLogMatch[7].trim();
                const timeText = matchLogMatch[8] ? ` vào lúc ${matchLogMatch[8]}` : "";
                transDetails = `${typeText} lệnh ${sideText} của tài khoản ${matchLogMatch[2]} (${matchLogMatch[3]}): Đã khớp ${formattedQty} CP ${matchLogMatch[6]} với giá ${formattedPrice} ₫${timeText}`;
            }

            // --- PATTERN 8: Settings change (EN format to VN) ---
            if (transDetails.includes("Admin updated system configurations:")) {
                transDetails = transDetails
                    .replace("Admin updated system configurations:", "Admin cập nhật cấu hình hệ thống:")
                    .replace(/Created/g, "Tạo");
            }

            // --- PATTERN 9: Activate stock / Halt stock ---
            const activateMatch = transDetails.match(/Admin activated trading for symbol (\w+)/i);
            if (activateMatch) {
                transDetails = `Admin đã kích hoạt giao dịch cho mã CK ${activateMatch[1]}`;
            }
            const haltMatch = transDetails.match(/Admin halted trading for symbol (\w+)/i);
            if (haltMatch) {
                transDetails = `Admin đã tạm dừng giao dịch cho mã CK ${haltMatch[1]}`;
            }

            // --- GENERAL DICTIONARY REPLACEMENTS FOR VIETNAMESE ---
            transDetails = transDetails
                .replace(/Account of/gi, "Tài khoản của")
                .replace(/Successfully placed BUY order of (\d+) shares (\w+) at price ([\d,.]+)/gi, "Đặt thành công lệnh MUA $1 CP $2 với giá $3")
                .replace(/Successfully placed SELL order of (\d+) shares (\w+) at price ([\d,.]+)/gi, "Đặt thành công lệnh BÁN $1 CP $2 với giá $3")
                .replace(/Successfully placed/gi, "Đặt thành công")
                .replace(/Admin cancelled pending\/partial order #(\d+)/gi, "Admin đã hủy lệnh chờ khớp/khớp một phần #$1")
                .replace(/Admin cancelled/gi, "Admin đã hủy")
                .replace(/Admin intervened to cancel order of account/gi, "Admin đã can thiệp hủy lệnh của tài khoản")
                .replace(/End of day expired order: Automatically cancelled order of account/gi, "Lệnh hết hạn cuối ngày: Đã tự động hủy lệnh của tài khoản")
                .replace(/Automatically cancelled/gi, "Đã tự động hủy")
                .replace(/Partially matched order of account/gi, "Khớp một phần lệnh của tài khoản")
                .replace(/Fully matched order of account/gi, "Khớp hoàn toàn lệnh của tài khoản")
                .replace(/order of account/gi, "lệnh của tài khoản")
                .replace(/User changed account password successfully for user/gi, "Người dùng đổi mật khẩu thành công cho tài khoản")
                .replace(/User changed transaction PIN successfully for user/gi, "Người dùng đổi mã PIN thành công cho tài khoản")
                .replace(/credited with/gi, "cộng thêm")
                .replace(/debited by/gi, "khấu trừ")
                .replace(/virtual capital by Admin/gi, "vốn ảo bởi Admin")
                .replace(/Reason:/gi, "Lý do:")
                .replace(/Changed Price from ([\d.]+) to ([\d.]+)/gi, "Thay đổi giá từ $1 sang $2")
                .replace(/Changed Volume from (\d+) to (\d+)/gi, "Thay đổi khối lượng từ $1 sang $2")
                .replace(/modified BUY order/gi, "đã sửa lệnh MUA")
                .replace(/modified SELL order/gi, "đã sửa lệnh BÁN")
                .replace(/modified order/gi, "đã sửa lệnh")
                .replace(/\bshares\b/gi, "CP")
                .replace(/\bBUY\b/g, "MUA")
                .replace(/\bSELL\b/g, "BÁN")
                .replace(/\bat price\b/gi, "với giá")
                .replace(/\bat\b/gi, "vào lúc");

        } else {
            // --- PATTERNS FOR ENGLISH ---
            // --- PATTERN 1: Admin reset password/PIN (VN format) ---
            const resetPassVnMatch = transDetails.match(/Admin đã đặt lại mật khẩu cho người dùng (.*) về mặc định (.*)/i);
            if (resetPassVnMatch) {
                transDetails = `Admin reset password for user ${resetPassVnMatch[1]} to default ${resetPassVnMatch[2]}`;
            }
            const resetPinVnMatch = transDetails.match(/Admin đã đặt lại mã PIN cho người dùng (.*) về mặc định (.*)/i);
            if (resetPinVnMatch) {
                transDetails = `Admin reset PIN for user ${resetPinVnMatch[1]} to default ${resetPinVnMatch[2]}`;
            }

            // --- PATTERN 2: Adjusted balance for user (VN format) ---
            const adjustVnMatch = transDetails.match(/Tài khoản của (.*) \((.*)\) vừa được Admin (cộng thêm|khấu trừ) (-?[\d,.]+) ₫? vốn ảo(?:\.\s*Lý do:\s*(.*))?/i);
            if (adjustVnMatch) {
                const actionWord = adjustVnMatch[3] === "khấu trừ" ? "debited by" : "credited with";
                const amountVal = adjustVnMatch[4];
                const formatted = Number(amountVal.replace(/\./g, "").replace(/,/g, "")).toLocaleString('en-US');
                const reason = adjustVnMatch[5] || "";
                transDetails = `Account ${adjustVnMatch[1]} (${adjustVnMatch[2]}) was ${actionWord} ${formatted} virtual capital by Admin.${reason ? ` Reason: ${reason}` : ""}`;
            }

            // --- PATTERN 3: Profile field update (VN format) ---
            const profileVnMatch = transDetails.match(/Trường thông tin "(.*)" đã thay đổi từ "(.*)" sang "(.*)" cho người dùng (.*)/i);
            if (profileVnMatch) {
                transDetails = `Field "${profileVnMatch[1]}" changed from "${profileVnMatch[2]}" to "${profileVnMatch[3]}" for user ${profileVnMatch[4]}`;
            }

            // --- PATTERN 4: Admin place order behalf (VN format) ---
            const behalfVnMatch = transDetails.match(/Admin đã đặt lệnh (MUA|BÁN) hộ tài khoản #(.*):\s*(\d+)\s*CP\s*(\w+)\s*@\s*([\d.]+)/i);
            if (behalfVnMatch) {
                const sideText = behalfVnMatch[1] === "MUA" ? "BUY" : "SELL";
                transDetails = `Admin placed ${sideText} order behalf of user #${behalfVnMatch[2]}: ${behalfVnMatch[3]} shares ${behalfVnMatch[4]} @ ${behalfVnMatch[5]}`;
            }

            // --- PATTERN 5: Mixed/Vietnamese Match Log to perfect English ---
            const matchLogRegex = /^(Khớp một phần|Khớp hoàn toàn|Partially matched|Fully matched) lệnh của (?:account|tài khoản) (.*?) \((.*?)\) (BUY|SELL|MUA|BÁN):\s*(?:Matched|Đã khớp)\s*(\d+)\s*(?:shares|CP)\s*(\w+)\s*(?:at\s*price|với\s*giá)\s*([\d,.]+)(?:\s*₫)?(?:\s*(?:at|vào\s*lúc)\s*([\d:]+))?/i;
            const matchLogMatch = transDetails.match(matchLogRegex);
            if (matchLogMatch) {
                const isPartial = matchLogMatch[1].toLowerCase().includes("một phần") || matchLogMatch[1].toLowerCase().includes("partial");
                const typeText = isPartial ? "Partially matched" : "Fully matched";
                const sideText = (matchLogMatch[4] === "BUY" || matchLogMatch[4] === "MUA") ? "BUY" : "SELL";
                const formattedQty = Number(matchLogMatch[5]).toLocaleString('en-US');
                const rawPriceNum = Number(matchLogMatch[7].replace(/\./g, "").replace(/,/g, ""));
                const formattedPrice = isNaN(rawPriceNum) ? matchLogMatch[7] : rawPriceNum.toLocaleString('en-US');
                const timeText = matchLogMatch[8] ? ` at ${matchLogMatch[8]}` : "";
                transDetails = `${typeText} order of account ${matchLogMatch[2]} (${matchLogMatch[3]}) ${sideText}: Matched ${formattedQty} shares ${matchLogMatch[6]} at price ${formattedPrice}${timeText}`;
            }

            // --- PATTERN 6: Settings change ---
            if (transDetails.includes("Admin cập nhật cấu hình hệ thống:")) {
                transDetails = transDetails
                    .replace("Admin cập nhật cấu hình hệ thống:", "Admin updated system configurations:")
                    .replace(/Tạo/g, "Created");
            }

            // --- PATTERN 7: Password/PIN reset (VN format to English) ---
            const resetPassVnMatch2 = transDetails.match(/Mật khẩu đăng nhập Account of (.*?) \((.*?)\) vừa được Admin đặt lại về mặc định \((.*?)\)/i);
            if (resetPassVnMatch2) {
                transDetails = `Login password for Account of ${resetPassVnMatch2[1]} (${resetPassVnMatch2[2]}) was reset by Admin to default (${resetPassVnMatch2[3]}). Please change your password immediately to ensure security.`;
            }
            const resetPinVnMatch2 = transDetails.match(/Mã PIN giao dịch Account of (.*?) \((.*?)\) vừa được Admin đặt lại về mặc định \((.*?)\)/i);
            if (resetPinVnMatch2) {
                transDetails = `Transaction PIN for Account of ${resetPinVnMatch2[1]} (${resetPinVnMatch2[2]}) was reset by Admin to default (${resetPinVnMatch2[3]}). Please change your PIN immediately to ensure security.`;
            }

            // --- PATTERN 8: Activate stock / Halt stock (VN format to English) ---
            const activateVnMatch = transDetails.match(/Admin đã kích hoạt giao dịch cho mã CK (\w+)/i);
            if (activateVnMatch) {
                transDetails = `Admin activated trading for symbol ${activateVnMatch[1]}`;
            }
            const haltVnMatch = transDetails.match(/Admin đã tạm dừng giao dịch cho mã CK (\w+)/i);
            if (haltVnMatch) {
                transDetails = `Admin halted trading for symbol ${haltVnMatch[1]}`;
            }

            // --- GENERAL DICTIONARY REPLACEMENTS FOR ENGLISH ---
            transDetails = transDetails
                .replace(/Tài khoản của/gi, "Account of")
                .replace(/vừa được Admin cộng thêm/gi, "was credited with")
                .replace(/vừa được Admin khấu trừ/gi, "was debited by")
                .replace(/vốn ảo/gi, "virtual capital")
                .replace(/Lý do:/gi, "Reason:")
                .replace(/Admin đã hủy lệnh MUA/gi, "Admin cancelled BUY order of")
                .replace(/Admin đã hủy lệnh BÁN/gi, "Admin cancelled SELL order of")
                .replace(/Admin đã hủy lệnh/gi, "Admin cancelled order")
                .replace(/Đã tự động hủy lệnh của tài khoản/gi, "Automatically cancelled order of account")
                .replace(/Lệnh hết hạn cuối ngày:/gi, "End of day expired order:")
                .replace(/đã hủy thành công lệnh MUA/gi, "successfully cancelled BUY order of")
                .replace(/đã hủy thành công lệnh BÁN/gi, "successfully cancelled SELL order of")
                .replace(/đã hủy thành công lệnh/gi, "successfully cancelled order of")
                .replace(/tự động hủy/gi, "automatically cancelled")
                .replace(/đã can thiệp hủy lệnh của tài khoản/gi, "intervened to cancel order of account")
                .replace(/đã sửa lệnh MUA/gi, "modified BUY order")
                .replace(/đã sửa lệnh BÁN/gi, "modified SELL order")
                .replace(/đã sửa lệnh/gi, "modified order")
                .replace(/Thay đổi Giá từ/gi, "Changed Price from")
                .replace(/Thay đổi Khối lượng từ/gi, "Changed Volume from")
                .replace(/sang/gi, "to")
                .replace(/Đã khớp/gi, "Matched")
                .replace(/với giá/gi, "at price")
                .replace(/vào lúc/gi, "at")
                .replace(/tài khoản/gi, "account")
                .replace(/đặt thành công lệnh MUA/gi, "successfully placed BUY order of")
                .replace(/đặt thành công lệnh BÁN/gi, "successfully placed SELL order of")
                .replace(/đặt thành công lệnh/gi, "successfully placed order")
                .replace(/CP/g, "shares")
                .replace(/MUA/g, "BUY")
                .replace(/BÁN/g, "SELL");
        }

        return { action: transAction, details: transDetails };
    }

    return (
        <div className="admin-logs-page">
            <div className="page-header">
                <div className="header-left">
                    <h1>{t("admin.logs.title")}</h1>
                    <p>{t("admin.logs.subtitle")}</p>
                </div>
                <button className="btn-export" onClick={loadLogs}>
                    <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> {t("admin.logs.btnRefresh")}
                </button>
            </div>

            <div className="filter-section dashboard-section">
                <div className="filter-row">
                    <div className="filter-item search">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input 
                            type="text" 
                            placeholder={t("admin.logs.searchPlaceholder")} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-item date-group">
                        <label>{t("admin.logs.filterFrom")}</label>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item date-group">
                        <label>{t("admin.logs.filterTo")}</label>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="level-filter-container">
                    <label>{t("admin.logs.levelLabel")}</label>
                    <div className="level-select">
                        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                            <option value="all">{t("admin.logs.levelAll")} ({stats.all})</option>
                            <option value="info">{t("admin.logs.levelInfo")} ({stats.info})</option>
                            <option value="warn">{t("admin.logs.levelWarn")} ({stats.warn})</option>
                            <option value="error">{t("admin.logs.levelError")} ({stats.error})</option>
                            <option value="crit">{t("admin.logs.levelCrit")} ({stats.crit})</option>
                        </select>
                    </div>
                </div>

                <div className="summary-grid">
                    <div className={`summary-card ${levelFilter === 'info' ? 'active' : ''}`} onClick={() => setLevelFilter('info')}>
                        <div className="card-top">
                            <span className="dot info"></span>
                            <span className="label">{t("admin.logs.levelInfo")}</span>
                        </div>
                        <span className="value info">{stats.info}</span>
                    </div>
                    <div className={`summary-card ${levelFilter === 'warn' ? 'active' : ''}`} onClick={() => setLevelFilter('warn')}>
                        <div className="card-top">
                            <span className="dot warn"></span>
                            <span className="label">{t("admin.logs.levelWarn")}</span>
                        </div>
                        <span className="value warn">{stats.warn}</span>
                    </div>
                    <div className={`summary-card ${levelFilter === 'error' ? 'active' : ''}`} onClick={() => setLevelFilter('error')}>
                        <div className="card-top">
                            <span className="dot error"></span>
                            <span className="label">{t("admin.logs.levelError")}</span>
                        </div>
                        <span className="value error">{stats.error}</span>
                    </div>
                    <div className={`summary-card ${levelFilter === 'crit' ? 'active' : ''}`} onClick={() => setLevelFilter('crit')}>
                        <div className="card-top">
                            <span className="dot crit"></span>
                            <span className="label">{t("admin.logs.levelCrit")}</span>
                        </div>
                        <span className="value crit">{stats.crit}</span>
                    </div>
                </div>
            </div>

            <div className="table-container dashboard-section">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th className="col-time">{t("admin.logs.colTime")}</th>
                            <th className="col-type">{t("admin.logs.colType")}</th>
                            <th className="col-level">{t("admin.logs.colLevel")}</th>
                            <th className="col-actor">{t("admin.logs.colActor")}</th>
                            <th className="col-action">{t("admin.logs.colAction")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-4">{t("admin.logs.loading")}</td></tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4">{t("admin.logs.noData")}</td></tr>
                        ) : (
                            filteredLogs.map((log, index) => {
                                const { action: displayAction, details: displayDetails } = translateLog(log);
                                return (
                                    <tr key={index}>
                                        <td className="col-time">{formatTimestamp(log.timestamp)}</td>
                                        <td className="col-type">
                                            <span className={`type-badge ${log.type?.toLowerCase()}`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="col-level">
                                            <span className={`level-badge ${(log.level || 'INFO').toLowerCase()}`}>
                                                <span className="dot"></span>
                                                {log.level || 'INFO'}
                                            </span>
                                        </td>
                                        <td className="col-actor">
                                            <span className={log.actor === "System" ? "actor-system" : "actor-user"}>
                                                {log.actor}
                                            </span>
                                        </td>
                                        <td className="col-action-text">
                                            <div className="main-action">{displayAction}</div>
                                            {displayDetails && <div className="sub-details">{displayDetails}</div>}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                
                {/* Pagination Controls */}
                {!loading && totalPages > 0 && (
                    <div className="pagination-footer">
                        <div className="pagination-info">
                            {t("admin.logs.showingCount", { 
                                start: (currentPage - 1) * limit + 1, 
                                end: Math.min(currentPage * limit, totalRows), 
                                total: totalRows 
                            })}
                        </div>
                        <div className="pagination-controls">
                            <button 
                                className="btn-page" 
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                            
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                // Hiển thị 5 trang xung quanh trang hiện tại
                                if (
                                    pageNum === 1 || 
                                    pageNum === totalPages || 
                                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                                ) {
                                    return (
                                        <button 
                                            key={pageNum}
                                            className={`btn-page ${currentPage === pageNum ? 'active' : ''}`}
                                            onClick={() => handlePageChange(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                } else if (
                                    pageNum === currentPage - 3 || 
                                    pageNum === currentPage + 3
                                ) {
                                    return <span key={pageNum} className="pagination-ellipsis">...</span>;
                                }
                                return null;
                                return null;
                            })}

                            <button 
                                className="btn-page" 
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>

                            <select 
                                className="limit-select"
                                value={limit}
                                onChange={(e) => {
                                    setLimit(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={10}>10 / {lang === "vi" ? "trang" : "page"}</option>
                                <option value={20}>20 / {lang === "vi" ? "trang" : "page"}</option>
                                <option value={50}>50 / {lang === "vi" ? "trang" : "page"}</option>
                                <option value={100}>100 / {lang === "vi" ? "trang" : "page"}</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogs;
