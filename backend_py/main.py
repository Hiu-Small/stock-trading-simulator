from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd
from datetime import datetime
import vnstock
from vnstock import Quote, Trading, Listing

app = FastAPI(title="VN Stock API Service")

# Cấu hình CORS để cho phép Node.js gọi sang
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình API Key cho vnstock (đã tích hợp từ trước)
vnstock.change_api_key("vnstock_6f91e0ac6e8c2723329a928451f8633a")

@app.get("/")
def read_root():
    return {"status": "healthy", "message": "VN Stock API Service is running"}

@app.get("/ping")
def ping():
    return "ok"

# Cache cho thông tin mã chứng khoán (tên và sàn)
SYMBOL_INFO_MAP = {}

# ==========================================
# CẤU HÌNH CACHE TẬP TRUNG (Tính bằng giây)
# ==========================================
CACHE_CONFIG = {
    "INDEX_TTL": 30,  # Cache cho các chỉ số thị trường
    "BOARD_TTL": 30,  # Cache cho bảng giá nhóm
    "STOCK_TTL": 30,  # Cache cho chi tiết mã cổ phiếu
    "HISTORY_TTL": 30, # Cache cho lịch sử giá (5 phút)
    "INTRADAY_TTL": 30, # Cache cho lịch sử khớp lệnh
}

# Bộ nhớ đệm (Cache)
INDICES_CACHE = {"data": None, "time": 0}
INDEX_DETAIL_CACHE = {}
HISTORY_CACHE = {}
BOARD_CACHE = {}
STOCK_CACHE = {}
INTRADAY_CACHE = {}

# Từ điển ánh xạ chức danh lãnh đạo sang tên tiếng Việt đầy đủ
POSITION_MAP = {
    "CTHĐQT": "Chủ tịch Hội đồng quản trị",
    "TGĐ": "Tổng Giám đốc",
    "Phó TGĐ": "Phó Tổng Giám đốc",
    "TVHĐQT": "Thành viên Hội đồng quản trị",
    "TV HĐQT": "Thành viên Hội đồng quản trị",
    "KTT": "Kế toán trưởng",
    "Trưởng BKS": "Trưởng Ban kiểm soát",
    "Thành viên BKS": "Thành viên Ban kiểm soát",
    "TV BKS": "Thành viên Ban kiểm soát",
    "Phó CTHĐQT": "Phó Chủ tịch Hội đồng quản trị",
    "TV Độc lập": "Thành viên độc lập Hội đồng quản trị",
    "Ban kiểm soát": "Ban kiểm soát",
    "Thành viên cao cấp ban điều hành": "Thành viên cao cấp Ban điều hành"
}

def map_position(pos):
    if not pos: return ""
    # Một số vị trí có dấu gạch chéo VD: TVHĐQT/Phó TGĐ
    parts = pos.split('/')
    mapped_parts = []
    for p in parts:
        p_clean = p.strip()
        mapped_parts.append(POSITION_MAP.get(p_clean, p_clean))
    return " / ".join(mapped_parts)

def get_symbol_info_map():
    global SYMBOL_INFO_MAP
    if not SYMBOL_INFO_MAP:
        try:
            # FIX: Chuyển sang nguồn KBS thay vì VCI bị hỏng
            ls = Listing(source='kbs')
            # 1. Lấy tên công ty
            df_symbols = ls.all_symbols()
            name_map = {}
            if 'organ_name' in df_symbols.columns:
                name_map = dict(zip(df_symbols['symbol'], df_symbols['organ_name']))

            # 2. Lấy sàn giao dịch
            exchange_map = {}
            for ex in ['HOSE', 'HNX', 'UPCOM']:
                try:
                    symbols_ser = ls.symbols_by_group(ex)
                    for s in symbols_ser:
                        exchange_map[s] = ex
                except:
                    continue

            # 3. Kết hợp lại
            all_tickers = set(name_map.keys()) | set(exchange_map.keys())
            for t in all_tickers:
                SYMBOL_INFO_MAP[t] = {
                    "name": name_map.get(t, ""),
                    "exchange": exchange_map.get(t, "")
                }
        except Exception as e:
            print(f"Lỗi khi lấy thông tin mã chứng khoán: {e}")
    return SYMBOL_INFO_MAP

def get_symbol_info(symbol):
    info = get_symbol_info_map().get(symbol.upper(), {"name": "", "exchange": ""})
    return info

def safe_float(val, default=0.0):
    """Chuyển đổi an toàn sang float"""
    try:
        if val is None or pd.isna(val):
            return default
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val, default=0):
    """Chuyển đổi an toàn sang int"""
    try:
        if val is None or pd.isna(val):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default

# =====================================================================
# NGUỒN DỮ LIỆU: vnstock (KBS)
# =====================================================================

SYMBOL_MAP = {
    "VNINDEX": "VNINDEX",
    "VN-INDEX": "VNINDEX",
    "HNX": "HNXIndex",
    "HNXINDEX": "HNXIndex",
    "HNX-INDEX": "HNXIndex",
    "VN30": "VN30",
    "UPCOM": "UPCOMIndex",
    "UPINDEX": "UPCOMIndex",
    "VN100": "VN100",
    "HNX30": "HNX30",
}

def fetch_index_vnstock(symbol: str) -> dict:
    """Lấy dữ liệu chỉ số đầy đủ bao gồm cả khối lượng và thống kê tăng/giảm"""
    try:
        actual_symbol = SYMBOL_MAP.get(symbol.upper(), symbol)

        # 1. Lấy dữ liệu lịch sử để tính change (Đổi sang kbs)
        quote = Quote(symbol=actual_symbol, source='kbs')
        df_hist = quote.history(length='10', interval='1D')

        # 2. Lấy dữ liệu snapshot từ bảng giá để lấy Volume (Đổi sang kbs)
        board_df = Trading(source='kbs').price_board([actual_symbol])

        val, change, change_percent = 0, 0, 0
        total_vol = 0

        if df_hist is not None and not df_hist.empty:
            # Sắp xếp theo thời gian mới nhất
            df_hist = df_hist.sort_values('time', ascending=False)
            last = df_hist.iloc[0]
            prev = df_hist.iloc[1] if len(df_hist) > 1 else last
            val = float(last['close'])
            change = val - float(prev['close'])
            change_percent = (change / float(prev['close']) * 100) if float(prev['close']) != 0 else 0
            # Lấy volume từ history nếu có (vì board của Index hay bị 0)
            total_vol = float(last.get('volume', 0))

        if board_df is not None and not board_df.empty:
            row = board_df.iloc[0]
            def gv(group, col):
                # KBS Map
                col_name = 'volume_accumulated' if col == 'accumulated_volume' else col
                if col_name not in board_df.columns:
                    return 0
                v = row.get(col_name, 0)
                return safe_float(v, 0)

            # Nếu total_vol từ history vẫn là 0 thì mới lấy từ board
            if total_vol == 0:
                total_vol = gv('match', 'accumulated_volume')

        total_val_money = 0
        if board_df is not None and not board_df.empty:
            row = board_df.iloc[0]
            # Thử nhiều tên cột phổ biến cho giá trị giao dịch của chỉ số
            for col in ['accumulated_value', 'total_value', 'value', 'accumulated_val', 'total_val']:
                if col in board_df.columns:
                    total_val_money = safe_float(row.get(col, 0), 0)
                    if total_val_money > 0: break

        # Fallback lấy totalValue từ history nếu board lỗi
        if total_val_money == 0 and df_hist is not None and not df_hist.empty:
            last = df_hist.iloc[0]
            # Một số nguồn trả về thanh khoản trong history
            total_val_money = safe_float(last.get('accumulated_value', last.get('value', last.get('total_value', 0))), 0)

        return {
            "id": symbol.lower().replace("-", ""),
            "name": symbol.upper().replace("-", ""),
            "value": round(val, 2),
            "refPrice": round(float(prev['close']), 2) if len(df_hist) > 1 else round(val, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "chartUp": change >= 0,
            "volume": total_vol,
            "accumulatedVolume": total_vol,
            "totalValue": total_val_money,
            "updatedAt": datetime.now().isoformat(),
            "source": "VNSTOCK-KBS"
        }
    except Exception as e:
        print(f"Lỗi fetch_index_vnstock {symbol}: {e}")
    return None

def fetch_index_data(symbol: str) -> dict:
    """Hàm wrapper để lấy dữ liệu chỉ số"""
    data = fetch_index_vnstock(symbol)
    if data:
        return data
    return None

# =====================================================================
# API ENDPOINTS
# =====================================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/indices")
def get_all_indices():
    # 1. Kiểm tra Cache
    now = datetime.now().timestamp()
    if INDICES_CACHE["data"] and (now - INDICES_CACHE["time"] < CACHE_CONFIG["INDEX_TTL"]):
        return INDICES_CACHE["data"]

    indices = ["VNINDEX", "HNX-INDEX", "VN30", "UPINDEX"]
    results = []
    for idx in indices:
        data = fetch_index_data(idx)
        if data:
            results.append(data)

    if not results:
        raise HTTPException(status_code=404, detail="Không thể lấy dữ liệu bất kỳ chỉ số nào")

    result = {
        "success": True,
        "count": len(results),
        "data": results,
        "updatedAt": datetime.now().isoformat(),
        "fromPythonCache": False
    }

    # Lưu vào Cache
    INDICES_CACHE["data"] = result
    INDICES_CACHE["time"] = now

    return result

@app.get("/api/indices/{symbol}")
def get_index_detail(symbol: str):
    symbol = symbol.upper()

    # Kiểm tra Cache
    now = datetime.now().timestamp()
    if symbol in INDEX_DETAIL_CACHE:
        cached = INDEX_DETAIL_CACHE[symbol]
        if now - cached["time"] < CACHE_CONFIG["INDEX_TTL"]:
            return cached["data"]

    data = fetch_index_data(symbol)
    if not data:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho {symbol}")

    result = {"success": True, "data": data}
    INDEX_DETAIL_CACHE[symbol] = {"data": result, "time": now}
    return result

@app.get("/api/indices/{symbol}/history")
def get_index_history(symbol: str, days: int = 30, interval: str = "1D"):
    try:
        symbol = symbol.upper()
        cache_key = f"{symbol}_{days}_{interval}"

        # Kiểm tra Cache
        now = datetime.now().timestamp()
        if cache_key in HISTORY_CACHE:
            cached = HISTORY_CACHE[cache_key]
            if now - cached["time"] < CACHE_CONFIG["HISTORY_TTL"]:
                return cached["data"]

        actual_symbol = SYMBOL_MAP.get(symbol, symbol)
        quote = Quote(symbol=actual_symbol, source='kbs') 
        df = quote.history(length=str(days), interval=interval)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="Không có dữ liệu lịch sử")

        records = []
        for _, row in df.iterrows():
            record = {}
            for col in df.columns:
                val = row[col]
                if hasattr(val, 'isoformat'):
                    record[col] = val.isoformat()
                elif hasattr(val, 'item'):
                    record[col] = val.item()
                else:
                    record[col] = val
            records.append(record)

        result = {"success": True, "data": records}
        HISTORY_CACHE[cache_key] = {"data": result, "time": now}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/indices/{symbol}/intraday")
async def get_index_intraday(symbol: str):
    """Lấy dữ liệu đồ thị phút (intraday) của chỉ số thị trường"""
    try:
        symbol_upper = symbol.upper()
        actual_symbol = SYMBOL_MAP.get(symbol_upper, symbol_upper)
        # Sử dụng nguồn KBS cho dữ liệu chỉ số
        quote = Quote(symbol=actual_symbol, source='kbs')
        
        # Tăng length lên 14 để đảm bảo lấy được ít nhất một phiên giao dịch (kể cả cuối tuần/lễ)
        df = quote.history(interval='1m', length='14')
        
        if df is None or df.empty:
            return {
                "success": False,
                "symbol": symbol,
                "message": f"Không tìm thấy dữ liệu intraday cho chỉ số {symbol}"
            }
            
        # Tìm ngày giao dịch gần nhất có trong dữ liệu
        all_dates = df['time'].dt.date.unique()
        if len(all_dates) == 0:
            return {"success": False, "message": "Không có dữ liệu thời gian"}
            
        # Lấy ngày lớn nhất (mới nhất) có dữ liệu
        latest_trading_date = max(all_dates)
        df_latest = df[df['time'].dt.date == latest_trading_date].copy()
        
        # Format dữ liệu cho đồ thị line chart trên frontend
        data_points = []
        for _, row in df_latest.iterrows():
            data_points.append({
                "time": row['time'].strftime("%H:%M"),
                "value": float(row['close']),
                "volume": int(row['volume'])
            })
            
        return {
            "success": True,
            "symbol": symbol,
            "tradingDate": latest_trading_date.strftime("%Y-%m-%d"),
            "count": len(data_points),
            "data": data_points,
            "note": "Dữ liệu phiên giao dịch gần nhất" if latest_trading_date != datetime.now().date() else "Dữ liệu phiên hôm nay"
        }
    except Exception as e:
        print(f"Lỗi lấy intraday index {symbol}: {e}")
        return {
            "success": False,
            "message": f"Lỗi hệ thống: {str(e)}"
        }
    except Exception as e:
        print(f"Lỗi lấy intraday index {symbol}: {e}")
        return {
            "success": False,
            "message": f"Lỗi hệ thống: {str(e)}"
        }

@app.get("/api/board/{group}")
def get_stock_board(group: str):
    """Lấy bảng giá theo nhóm (VN30, HNX30, HOSE...)"""
    group = group.upper()

    # 1. Kiểm tra Cache Python
    now = datetime.now().timestamp()
    if group in BOARD_CACHE:
        cached = BOARD_CACHE[group]
        if now - cached["time"] < CACHE_CONFIG["BOARD_TTL"]:
            print(f"--- [PYTHON CACHE HIT] --- {group}")
            return cached["data"]

    print(f"--- [PYTHON CACHE MISS] --- {group} - CALLING KBS")
    valid_groups = ['VN30', 'HNX30', 'VN100', 'HOSE', 'HNX', 'UPCOM']
    if group not in valid_groups:
        raise HTTPException(status_code=400, detail=f"Nhóm {group} không hợp lệ")

    try:
        # Lấy từ kbs thay vì vci bị lỗi
        symbols_df = None
        try:
            symbols_df = Listing(source='kbs').symbols_by_group(group)
        except Exception as e:
            print("Listing error:", e)

        if symbols_df is not None and not symbols_df.empty:
            symbols = symbols_df.tolist() if hasattr(symbols_df, 'tolist') else symbols_df['symbol'].tolist()
        else:
            symbols = []

        # Dùng danh sách chuẩn nếu API lỗi
        if not symbols:
            HARDCODED = {
                "VN30": ["ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG", "MBB", "MSN", "MWG", "PLX", "POW", "SAB", "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"],
                "HNX30": ["BVS", "CAP", "CEO", "CMS", "DDG", "DHT", "DTD", "DXP", "HLD", "HUT", "IDC", "L14", "LAS", "MBS", "NDN", "NTP", "NVB", "PVC", "PVS", "SHS", "SLS", "TAR", "TNG", "TVD", "VC3", "VCS", "VDL", "VGS", "VIF", "VNR"]
            }
            if group in HARDCODED:
                symbols = HARDCODED[group]

        # FIX: Dùng KBS thay vì VCI
        board_df = Trading(source='kbs').price_board(symbols)

        records = []
        for _, row in board_df.iterrows():
            def get_val(col_tuple, default=0):
                # KBS trả về Flat Columns, ta cần map ngược lại từ cấu trúc Tuple cũ của bạn
                kbs_map = {
                    ('listing', 'ref_price'): 'reference_price',
                    ('listing', 'ceiling'): 'ceiling_price',
                    ('listing', 'floor'): 'floor_price',
                    ('match', 'match_price'): 'close_price',
                    ('match', 'accumulated_volume'): 'volume_accumulated',
                    ('match', 'highest'): 'high_price',
                    ('match', 'lowest'): 'low_price',
                    ('bid_ask', 'bid_1_price'): 'bid_price_1',
                    ('bid_ask', 'bid_1_volume'): 'bid_vol_1',
                    ('bid_ask', 'bid_2_price'): 'bid_price_2',
                    ('bid_ask', 'bid_2_volume'): 'bid_vol_2',
                    ('bid_ask', 'bid_3_price'): 'bid_price_3',
                    ('bid_ask', 'bid_3_volume'): 'bid_vol_3',
                    ('bid_ask', 'ask_1_price'): 'ask_price_1',
                    ('bid_ask', 'ask_1_volume'): 'ask_vol_1',
                    ('bid_ask', 'ask_2_price'): 'ask_price_2',
                    ('bid_ask', 'ask_2_volume'): 'ask_vol_2',
                    ('bid_ask', 'ask_3_price'): 'ask_price_3',
                    ('bid_ask', 'ask_3_volume'): 'ask_vol_3',
                    ('match', 'foreign_buy_volume'): 'foreign_buy_volume',
                    ('match', 'foreign_sell_volume'): 'foreign_sell_volume',
                    ('match', 'current_room'): 'foreign_room',
                    ('listing', 'symbol'): 'symbol'
                }
                col_name = kbs_map.get(col_tuple, col_tuple)
                if col_name not in board_df.columns:
                    return default

                val = row.get(col_name, default)
                # Đảm bảo trả về số nếu không phải là symbol
                if col_name == 'symbol':
                    return val if val is not None else default
                return safe_float(val, default)

            symbol = get_val(('listing', 'symbol'), "")
            record = {
                "symbol": symbol,
                "refPrice": get_val(('listing', 'ref_price')),
                "ceiling": get_val(('listing', 'ceiling')),
                "floor": get_val(('listing', 'floor')),
                "matchPrice": get_val(('match', 'match_price')),
                "matchVolume": get_val(('match', 'match_vol')),
                "totalVolume": get_val(('match', 'accumulated_volume')),
                "high": get_val(('match', 'highest')),
                "low": get_val(('match', 'lowest')),
                "bid1Price": get_val(('bid_ask', 'bid_1_price')),
                "bid1Vol": get_val(('bid_ask', 'bid_1_volume')),
                "bid2Price": get_val(('bid_ask', 'bid_2_price')),
                "bid2Vol": get_val(('bid_ask', 'bid_2_volume')),
                "bid3Price": get_val(('bid_ask', 'bid_3_price')),
                "bid3Vol": get_val(('bid_ask', 'bid_3_volume')),
                "ask1Price": get_val(('bid_ask', 'ask_1_price')),
                "ask1Vol": get_val(('bid_ask', 'ask_1_volume')),
                "ask2Price": get_val(('bid_ask', 'ask_2_price')),
                "ask2Vol": get_val(('bid_ask', 'ask_2_volume')),
                "ask3Price": get_val(('bid_ask', 'ask_3_price')),
                "ask3Vol": get_val(('bid_ask', 'ask_3_volume')),
                "foreignBuy": get_val(('match', 'foreign_buy_volume')),
                "foreignSell": get_val(('match', 'foreign_sell_volume')),
                "currentRoom": get_val(('match', 'current_room')),
                "companyName": get_symbol_info(symbol).get("name", ""),
                "exchange": get_symbol_info(symbol).get("exchange", "")
            }
            records.append(record)

        result = {
            "success": True,
            "group": group,
            "data": records,
            "updatedAt": datetime.now().isoformat(),
            "fromPythonCache": False
        }

        # Lưu vào Cache Python
        BOARD_CACHE[group] = {"data": result, "time": now}
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/{symbol}")
def get_stock_detail(symbol: str):
    """
    Lấy thông tin chi tiết của một mã cổ phiếu (AAA, FPT, ACB...).
    """
    symbol = symbol.upper()

    # 1. Kiểm tra Cache Python
    now = datetime.now().timestamp()
    if symbol in STOCK_CACHE:
        cached = STOCK_CACHE[symbol]
        if now - cached["time"] < CACHE_CONFIG["STOCK_TTL"]:
            print(f"--- [PYTHON CACHE HIT] --- Stock: {symbol}")
            return cached["data"]

    print(f"--- [PYTHON CACHE MISS] --- Stock: {symbol} - CALLING KBS")
    try:
        from vnstock import Trading
        # Lấy dữ liệu bảng giá cho 1 mã duy nhất, Đổi sang KBS
        board_df = Trading(source='kbs').price_board([symbol])

        if board_df is None or board_df.empty:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho mã {symbol}")

        row = board_df.iloc[0]
        def get_val(col_tuple, default=0):
            # Tương tự như board, map cột
            kbs_map = {
                ('listing', 'ref_price'): 'reference_price',
                ('listing', 'ceiling'): 'ceiling_price',
                ('listing', 'floor'): 'floor_price',
                ('match', 'match_price'): 'close_price',
                ('match', 'accumulated_volume'): 'volume_accumulated',
                ('match', 'highest'): 'high_price',
                ('match', 'lowest'): 'low_price',
                ('match', 'open_price'): 'open_price',
                ('bid_ask', 'bid_1_price'): 'bid_price_1',
                ('bid_ask', 'bid_1_volume'): 'bid_vol_1',
                ('bid_ask', 'bid_2_price'): 'bid_price_2',
                ('bid_ask', 'bid_2_volume'): 'bid_vol_2',
                ('bid_ask', 'bid_3_price'): 'bid_price_3',
                ('bid_ask', 'bid_3_volume'): 'bid_vol_3',
                ('bid_ask', 'ask_1_price'): 'ask_price_1',
                ('bid_ask', 'ask_1_volume'): 'ask_vol_1',
                ('bid_ask', 'ask_2_price'): 'ask_price_2',
                ('bid_ask', 'ask_2_volume'): 'ask_vol_2',
                ('bid_ask', 'ask_3_price'): 'ask_price_3',
                ('bid_ask', 'ask_3_volume'): 'ask_vol_3',
                ('match', 'foreign_buy_volume'): 'foreign_buy_volume',
                ('match', 'foreign_sell_volume'): 'foreign_sell_volume',
                ('match', 'current_room'): 'foreign_room',
                ('listing', 'symbol'): 'symbol'
            }
            col_name = kbs_map.get(col_tuple, col_tuple)
            if col_name not in board_df.columns:
                return default
            val = row.get(col_name, default)
            # Đảm bảo trả về số nếu không phải là symbol
            if col_name == 'symbol':
                return val if val is not None else default
            return safe_float(val, default)

        record = {
            "symbol": symbol,
            "refPrice": get_val(('listing', 'ref_price')),
            "ceiling": get_val(('listing', 'ceiling')),
            "floor": get_val(('listing', 'floor')),
            "matchPrice": get_val(('match', 'match_price')),
            "matchVolume": get_val(('match', 'match_vol')),
            "totalVolume": get_val(('match', 'accumulated_volume')),
            "high": get_val(('match', 'highest')),
            "low": get_val(('match', 'lowest')),
            "openPrice": get_val(('match', 'open_price')),
            "bid1Price": get_val(('bid_ask', 'bid_1_price')),
            "bid1Vol": get_val(('bid_ask', 'bid_1_volume')),
            "bid2Price": get_val(('bid_ask', 'bid_2_price')),
            "bid2Vol": get_val(('bid_ask', 'bid_2_volume')),
            "bid3Price": get_val(('bid_ask', 'bid_3_price')),
            "bid3Vol": get_val(('bid_ask', 'bid_3_volume')),
            "ask1Price": get_val(('bid_ask', 'ask_1_price')),
            "ask1Vol": get_val(('bid_ask', 'ask_1_volume')),
            "ask2Price": get_val(('bid_ask', 'ask_2_price')),
            "ask2Vol": get_val(('bid_ask', 'ask_2_volume')),
            "ask3Price": get_val(('bid_ask', 'ask_3_price')),
            "ask3Vol": get_val(('bid_ask', 'ask_3_volume')),
            "foreignBuy": get_val(('match', 'foreign_buy_volume')),
            "foreignSell": get_val(('match', 'foreign_sell_volume')),
            "currentRoom": get_val(('match', 'current_room')),
            "companyName": get_symbol_info(symbol).get("name", ""),
            "exchange": get_symbol_info(symbol).get("exchange", ""),
        }

        result = {
            "success": True,
            "data": record,
            "updatedAt": datetime.now().isoformat(),
            "fromPythonCache": False
        }

        # Lưu vào Cache Python
        STOCK_CACHE[symbol] = {"data": result, "time": now}
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/{symbol}/history")
def get_stock_history(symbol: str, resolution: str = "1D", days: int = 30):
    """
    Lấy lịch sử OHLCV của một mã cổ phiếu.
    resolution: "1", "5", "15", "30", "1H", "1D", "1W", "1M"
    days: Số lượng nến muốn lấy (length)
    """
    symbol = symbol.upper()
    cache_key = f"stock_{symbol}_{resolution}_{days}"

    now = datetime.now().timestamp()
    if cache_key in HISTORY_CACHE:
        cached = HISTORY_CACHE[cache_key]
        if now - cached["time"] < CACHE_CONFIG["HISTORY_TTL"]:
            print(f"--- [PYTHON CACHE HIT] --- Stock History: {cache_key}")
            return cached["data"]

    print(f"--- [PYTHON CACHE MISS] --- Stock History: {cache_key} - CALLING KBS")
    try:
        from vnstock import Quote
        quote = Quote(symbol=symbol, source='kbs') # FIX: Đổi sang kbs
        # length trong vnstock là số lượng nến
        df = quote.history(length=str(days), interval=resolution)

        if df is None or df.empty:
            return {"success": True, "symbol": symbol, "data": []}

        records = []
        for _, row in df.iterrows():
            def safe_float(val, default=0.0):
                try:
                    import math
                    v = float(val)
                    return default if math.isnan(v) else v
                except:
                    return default

            # Xử lý thời gian
            t = row.get('time', row.get('date', None))
            if t is None: continue

            # Chuyển về Unix timestamp (giây)
            if hasattr(t, 'timestamp'):
                time_val = int(t.timestamp())
            elif isinstance(t, str):
                try:
                    time_val = int(datetime.fromisoformat(t.replace('Z', '+00:00')).timestamp())
                except:
                    time_val = t
            else:
                time_val = str(t)

            records.append({
                "time": time_val,
                "open": safe_float(row.get('open')),
                "high": safe_float(row.get('high')),
                "low": safe_float(row.get('low')),
                "close": safe_float(row.get('close')),
                "volume": int(safe_float(row.get('volume', 0))),
            })

        # Sắp xếp tăng dần theo thời gian (lightweight-charts yêu cầu)
        records.sort(key=lambda x: x["time"])

        result = {
            "success": True,
            "symbol": symbol,
            "resolution": resolution,
            "data": records
        }

        HISTORY_CACHE[cache_key] = {"data": result, "time": now}
        return result

    except Exception as e:
        print(f"Lỗi lấy stock history {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/{symbol}/events")
def get_stock_events(symbol: str):
    """Lấy lịch sự kiện của cổ phiếu (Gộp VCI và KBS)"""
    try:
        from vnstock import Company
        symbol = symbol.upper()
        
        # 1. Lấy từ VCI
        df_vci = pd.DataFrame()
        try:
            df_vci = Company(symbol=symbol, source='vci').events()
        except: pass
            
        # 2. Lấy từ KBS
        df_kbs = pd.DataFrame()
        try:
            df_kbs = Company(symbol=symbol, source='kbs').events()
        except: pass
        
        # Helper function để format ngày
        def format_date(val):
            if val is None or str(val) == "None" or str(val) == "nan" or not str(val).strip():
                return "-"
            try:
                if isinstance(val, str) and 'T' in val:
                    return val.split('T')[0]
                return str(val)
            except:
                return str(val)

        events_map = {} # Key: type + recordDate để gộp

        # Duyệt VCI
        if df_vci is not None and not df_vci.empty:
            for _, row in df_vci.iterrows():
                etype = str(row.get('event_name_vi', '-')).strip()
                record_date = format_date(row.get('record_date'))
                # Tạo key duy nhất để tránh lặp (loại sự kiện + ngày chốt)
                key = f"{etype}_{record_date}"
                
                events_map[key] = {
                    "type": etype,
                    "exRightDate": format_date(row.get('exright_date')),
                    "recordDate": record_date,
                    "payoutDate": format_date(row.get('payout_date')),
                    "content": str(row.get('event_title_vi', '-')),
                    "publicDate": format_date(row.get('public_date'))
                }

        # Duyệt KBS (Bổ sung nếu chưa có hoặc cập nhật nếu chi tiết hơn)
        if df_kbs is not None and not df_kbs.empty:
            for _, row in df_kbs.iterrows():
                # KBS columns might differ, adjust mapping if needed
                etype = str(row.get('event_name', row.get('event_name_vi', '-'))).strip()
                record_date = format_date(row.get('record_date', row.get('recordDate', '-')))
                key = f"{etype}_{record_date}"
                
                if key not in events_map:
                    events_map[key] = {
                        "type": etype,
                        "exRightDate": format_date(row.get('exright_date', row.get('ex_date', '-'))),
                        "recordDate": record_date,
                        "payoutDate": format_date(row.get('payout_date', row.get('payment_date', '-'))),
                        "content": str(row.get('event_title', row.get('content', '-'))),
                        "publicDate": format_date(row.get('public_date', row.get('announcement_date', '-')))
                    }
        
        result = list(events_map.values())
        # Sắp xếp theo ngày công bố hoặc ngày thực hiện giảm dần
        try:
            result.sort(key=lambda x: x['payoutDate'] if x['payoutDate'] != '-' else x['publicDate'], reverse=True)
        except: pass

        return {
            "success": True,
            "symbol": symbol,
            "count": len(result),
            "data": result
        }
    except Exception as e:
        print(f"Lỗi lấy events {symbol}: {e}")
        return {"success": False, "message": str(e)}

@app.get("/api/stock/{symbol}/intraday")
def get_stock_intraday(symbol: str, page_size: int = 7000):
    """
    Lấy lịch sử khớp lệnh chi tiết (Tick-by-tick) trong ngày.
    Mặc định lấy 7000 lệnh mới nhất để bao quát toàn bộ phiên.
    """
    symbol = symbol.upper()

    # Kiểm tra Cache
    now = datetime.now().timestamp()
    if symbol in INTRADAY_CACHE:
        cached = INTRADAY_CACHE[symbol]
        if now - cached["time"] < CACHE_CONFIG["INTRADAY_TTL"]:
            print(f"--- [PYTHON CACHE HIT] --- Intraday: {symbol}")
            return cached["data"]

    print(f"--- [PYTHON CACHE MISS] --- Intraday: {symbol} - CALLING KBS")
    try:
        # 1. Lấy dữ liệu khớp lệnh (Đổi sang kbs)
        df = None
        try:
            quote = Quote(symbol=symbol, source='kbs')
            df = quote.intraday(page_size=page_size)
        except Exception as inner_e:
            print(f"Lỗi lấy intraday từ KBS cho {symbol}: {inner_e}")
            df = None

        if df is None or df.empty:
            result = {
                "success": True, 
                "symbol": symbol,
                "data": [], 
                "match": [],
                "stats": {"totalBuy": 0, "totalSell": 0, "total": 0}
            }
            return result

        # Sắp xếp mới nhất lên đầu
        df = df.sort_values('time', ascending=False)

        records = []
        total_buy = 0
        total_sell = 0

        for _, row in df.iterrows():
            price = float(row['price'])
            vol = int(row['volume'])
            m_type = str(row['match_type']) # 'Buy' hoặc 'Sell'

            # Map sang định dạng tiếng Việt M/B
            side = "M" if m_type.lower() == "buy" else "B"
            if side == "M": total_buy += vol
            else: total_sell += vol

            records.append({
                "time": row['time'].strftime("%H:%M:%S") if hasattr(row['time'], 'strftime') else str(row['time']),
                "price": price,
                "volume": vol,
                "side": side
            })

        result = {
            "success": True,
            "symbol": symbol,
            "stats": {
                "totalBuy": total_buy,
                "totalSell": total_sell,
                "total": total_buy + total_sell
            },
            "match": records
        }

        # Lưu vào Cache
        INTRADAY_CACHE[symbol] = {"data": result, "time": now}
        return result
    except Exception as e:
        print(f"Lỗi lấy intraday cho {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/{symbol}/shareholders")
def get_shareholders(symbol: str):
    """Lấy danh sách cổ đông lớn"""
    try:
        from vnstock import Company
        # Đối với vnstock v4, Company dùng nguồn 'kbs' sẽ ổn định hơn cho dữ liệu này
        cp = Company(symbol=symbol.upper(), source='kbs')
        df = cp.shareholders()
        
        if df is None or df.empty:
            return {"success": True, "symbol": symbol, "data": []}
            
        # Clean data
        df = df.fillna(0)
        result = []
        for _, row in df.iterrows():
            name = str(row.get('name', ''))
            result.append({
                "name": name,
                "shares": int(row.get('shares_owned', 0)),
                "percentage": round(float(row.get('ownership_percentage', 0)), 2),
                "type": "Tổ chức" if any(x in name for x in ["Limited", "Corporation", "Fund", "Công ty", "CTCP", "Ngân hàng", "Holdings", "Group"]) else "Cá nhân",
                "updateDate": str(row.get('update_date', ''))[:10] if row.get('update_date') else "N/A"
            })
            
        return {
            "success": True,
            "symbol": symbol,
            "data": result
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/stock/{symbol}/ownership")
def get_ownership(symbol: str):
    """Lấy cơ cấu sở hữu (gộp thành 3 nhóm chính cho biểu đồ)"""
    try:
        from vnstock import Company
        cp = Company(symbol=symbol.upper(), source='kbs')
        df = cp.ownership()
        
        if df is None or df.empty:
            return {"success": True, "symbol": symbol, "data": {}}
            
        state_pct = 0
        foreign_pct = 0
        other_pct = 0
        
        for _, row in df.iterrows():
            group = str(row.get('owner_type', '')).lower()
            pct = float(row.get('ownership_percentage', 0))
            
            if "nước ngoài" in group:
                foreign_pct += pct
            elif "nhà nước" in group:
                state_pct += pct
            else:
                # Bao gồm cá nhân và tổ chức trong nước
                other_pct += pct
            
        return {
            "success": True,
            "symbol": symbol,
            "data": {
                "Cổ đông nhà nước": round(state_pct, 2),
                "Cổ đông nước ngoài": round(foreign_pct, 2),
                "Cổ đông khác": round(other_pct, 2)
            }
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/stock/{symbol}/profile")
def get_stock_profile(symbol: str):
    """
    Lấy thông tin hồ sơ doanh nghiệp: Giới thiệu, Cơ bản, Niêm yết, Cổ đông, Ban lãnh đạo...
    """
    symbol = symbol.upper()
    try:
        from vnstock import Company
        import math
        c = Company(symbol=symbol, source='kbs')
        
        # 1. Giới thiệu (Overview)
        overview_df = c.overview()
        overview_data = {}
        overview_row = {}
        if not overview_df.empty:
            overview_row = overview_df.iloc[0].to_dict()
            overview_data = {
                "industry": overview_row.get("industry", ""),
                "industry_id": overview_row.get("industry_id", ""),
                "company_profile": overview_row.get("company_profile", overview_row.get("business_model", "")),
                "history": overview_row.get("history", "")
            }
            
        # 2. Thông tin cơ bản & Niêm yết (Info)
        info_df = c.info()
        basic_info = {}
        listing_info = {}
        if not info_df.empty:
            row = info_df.iloc[0].to_dict()
            
            def safe_val(val, default=""):
                if pd.isna(val) or val is None: return default
                return val.item() if hasattr(val, 'item') else val
            
            basic_info = {
                "sic_code": symbol,
                "industry": safe_val(overview_row.get("industry")),
                "industry_id": safe_val(overview_row.get("industry_id")),
                "headquarters": safe_val(row.get("headquarters", row.get("address"))),
                "phone": safe_val(row.get("phone")),
                "fax": safe_val(row.get("fax")),
                "email": safe_val(row.get("email")),
                "website": safe_val(row.get("website")),
                "total_employees": safe_val(row.get("total_employees", row.get("number_of_employees")), 0),
                "charter_capital": safe_val(row.get("charter_capital"), 0),
                "establishment_date": safe_val(row.get("establishment_date", row.get("founded_date"))),
                "branches": safe_val(row.get("branches"), 0)
            }
            
            listing_info = {
                "first_listing_date": safe_val(row.get("first_listing_date", row.get("listing_date"))),
                "exchange": safe_val(row.get("exchange", overview_row.get("exchange"))),
                "listing_price": safe_val(row.get("listing_price", row.get("par_value")), 0),
                "outstanding_shares": safe_val(row.get("outstanding_shares"), 0),
                "listing_volume": safe_val(row.get("listing_volume", row.get("listed_volume")), 0),
                "foreign_ownership_percent": safe_val(row.get("foreign_ownership_percent"), 0),
                "shareholders_count": safe_val(row.get("shareholders_count"), 0)
            }

        # 3. Công ty con & Liên kết
        subsidiaries_data = []
        affiliates_data = []

        try:
            subs_df = c.subsidiaries()
            if not subs_df.empty:
                for _, row in subs_df.iterrows():
                    ctype = str(row.get("type", "")).lower()
                    item = {
                        "name": row.get("name", ""),
                        "charter_capital": safe_float(row.get("charter_capital")),
                        "ownership_percent": safe_float(row.get("ownership_percent")),
                        "type": ctype
                    }
                    if "liên kết" in ctype:
                        affiliates_data.append(item)
                    else:
                        subsidiaries_data.append(item)
        except:
            pass
            
        # Dùng thêm hàm affiliate() nếu có
        try:
            if hasattr(c, 'affiliate'):
                aff_df = c.affiliate()
                if not aff_df.empty:
                    for _, row in aff_df.iterrows():
                        # Lọc trùng lặp bằng name
                        name = row.get("name", "")
                        if not any(x["name"] == name for x in affiliates_data):
                            affiliates_data.append({
                                "name": name,
                                "charter_capital": safe_float(row.get("charter_capital")),
                                "ownership_percent": safe_float(row.get("ownership_percent")),
                                "type": str(row.get("type", ""))
                            })
        except:
            pass

        # 4. Ban lãnh đạo
        officers_data = []
        try:
            off_df = c.officers()
            if not off_df.empty:
                for _, row in off_df.iterrows():
                    officers_data.append({
                        "name": row.get("name", ""),
                        "position": map_position(row.get("position", "")),
                        "from_date": row.get("from_date", "")
                    })
        except:
            pass

        return {
            "success": True,
            "symbol": symbol,
            "data": {
                "overview": overview_data,
                "basic_info": basic_info,
                "listing_info": listing_info,
                "subsidiaries": subsidiaries_data,
                "affiliates": affiliates_data,
                "officers": officers_data,
                "peers": [] # vnstock v4 kbs hiện tại chưa support query peers trực tiếp
            }
        }
    except Exception as e:
        print(f"Lỗi lấy profile cho {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
