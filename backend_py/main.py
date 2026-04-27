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

# Cache cho tên công ty
COMPANY_NAME_MAP = {}

# ==========================================
# CẤU HÌNH CACHE TẬP TRUNG (Tính bằng giây)
# ==========================================
CACHE_CONFIG = {
    "INDEX_TTL": 30,  # Cache cho các chỉ số thị trường
    "BOARD_TTL": 30,  # Cache cho bảng giá nhóm
    "STOCK_TTL": 30,  # Cache cho chi tiết mã cổ phiếu
}

# Bộ nhớ đệm (Cache)
INDICES_CACHE = {"data": None, "time": 0}
BOARD_CACHE = {} 
STOCK_CACHE = {} 

def get_company_map():
    global COMPANY_NAME_MAP
    if not COMPANY_NAME_MAP:
        try:
            ls = Listing(source='vci')
            df_symbols = ls.all_symbols()
            # vci trả về 'symbol' và 'organ_name'
            if 'organ_name' in df_symbols.columns:
                COMPANY_NAME_MAP = dict(zip(df_symbols['symbol'], df_symbols['organ_name']))
        except Exception as e:
            print(f"Lỗi khi lấy danh sách tên công ty: {e}")
    return COMPANY_NAME_MAP

def get_name(symbol):
    return get_company_map().get(symbol.upper(), "")

def safe_float(val, default=0.0):
    """Chuyển đổi an toàn sang float"""
    try:
        if val is None:
            return default
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val, default=0):
    """Chuyển đổi an toàn sang int"""
    try:
        if val is None:
            return default
        return int(val)
    except (ValueError, TypeError):
        return default

# =====================================================================
# NGUỒN DỮ LIỆU: vnstock (VCI)
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
        
        # 1. Lấy dữ liệu lịch sử để tính change
        quote = Quote(symbol=actual_symbol, source='VCI')
        df_hist = quote.history(length='2', interval='1D')
        
        # 2. Lấy dữ liệu snapshot từ bảng giá để lấy Volume và thống kê mã Tăng/Giảm
        board_df = Trading(source='vci').price_board([actual_symbol])
        
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
                if (group, col) not in board_df.columns:
                    return 0
                v = row.get((group, col), 0)
                import pandas as pd
                if pd.isna(v): return 0
                return v.item() if hasattr(v, 'item') else v

            # Nếu total_vol từ history vẫn là 0 thì mới lấy từ board
            if total_vol == 0:
                total_vol = gv('match', 'accumulated_volume')
            
        return {
            "id": symbol.lower().replace("-", ""),
            "name": symbol.upper().replace("-", ""),
            "value": round(val, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "chartUp": change >= 0,
            "volume": total_vol,
            "accumulatedVolume": total_vol,
            "updatedAt": datetime.now().isoformat(),
            "source": "VNSTOCK-VCI"
        }
    except Exception as e:
        print(f"Lỗi vnstock {symbol}: {e}")
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
        print("--- [PYTHON CACHE HIT] --- ALL INDICES")
        return INDICES_CACHE["data"]

    print("--- [PYTHON CACHE MISS] --- ALL INDICES - FETCHING")
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
    data = fetch_index_data(symbol)
    if not data:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho {symbol}")
    return {"success": True, "data": data}

@app.get("/api/indices/{symbol}/history")
def get_index_history(symbol: str, days: int = 30, interval: str = "1D"):
    try:
        actual_symbol = SYMBOL_MAP.get(symbol.upper(), symbol)
        quote = Quote(symbol=actual_symbol, source='VCI')
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
            
        return {"success": True, "data": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

    print(f"--- [PYTHON CACHE MISS] --- {group} - CALLING VCI")
    valid_groups = ['VN30', 'HNX30', 'VN100', 'HOSE', 'HNX', 'UPCOM']
    if group not in valid_groups:
        raise HTTPException(status_code=400, detail=f"Nhóm {group} không hợp lệ")

    try:
        symbols_df = Listing(source='vci').symbols_by_group(group)
        symbols = symbols_df.tolist() if hasattr(symbols_df, 'tolist') else symbols_df['symbol'].tolist()
        
        board_df = Trading(source='vci').price_board(symbols)
        
        records = []
        for _, row in board_df.iterrows():
            def get_val(col_tuple, default=0):
                val = row.get(col_tuple, default)
                if pd.isna(val): return default
                return val.item() if hasattr(val, 'item') else val

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
                "companyName": get_name(symbol)
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

    print(f"--- [PYTHON CACHE MISS] --- Stock: {symbol} - CALLING VCI")
    try:
        from vnstock import Trading
        # Lấy dữ liệu bảng giá cho 1 mã duy nhất
        board_df = Trading(source='vci').price_board([symbol])
        
        if board_df is None or board_df.empty:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho mã {symbol}")
            
        row = board_df.iloc[0]
        def get_val(col_tuple, default=0):
            val = row.get(col_tuple, default)
            if pd.isna(val): return default
            return val.item() if hasattr(val, 'item') else val

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
            "companyName": get_name(symbol),
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
