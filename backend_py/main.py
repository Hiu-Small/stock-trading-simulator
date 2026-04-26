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
    """Lấy dữ liệu chỉ số từ vnstock (VCI)"""
    try:
        actual_symbol = SYMBOL_MAP.get(symbol.upper(), symbol)
        quote = Quote(symbol=actual_symbol, source='VCI')
        df = quote.history(length='5', interval='1D')
        
        if df is not None and not df.empty:
            # Sắp xếp theo thời gian mới nhất
            df = df.sort_values('time', ascending=False)
            last_row = df.iloc[0]
            prev_row = df.iloc[1] if len(df) > 1 else last_row
            
            val = float(last_row['close'])
            prev_val = float(prev_row['close'])
            change = val - prev_val
            change_percent = (change / prev_val * 100) if prev_val != 0 else 0
            
            return {
                "id": symbol.lower().replace("-", ""),
                "name": symbol.upper(),
                "value": round(val, 2),
                "change": round(change, 2),
                "changePercent": round(change_percent, 2),
                "chartUp": change >= 0,
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
    indices = ["VNINDEX", "HNX-INDEX", "VN30", "UPINDEX"]
    results = []
    for idx in indices:
        data = fetch_index_data(idx)
        if data:
            results.append(data)
    
    if not results:
        raise HTTPException(status_code=404, detail="Không thể lấy dữ liệu bất kỳ chỉ số nào")
        
    return {
        "success": True,
        "count": len(results),
        "data": results,
        "updatedAt": datetime.now().isoformat()
    }

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

            ref_price = get_val(('listing', 'ref_price'))
            
            record = {
                "symbol": get_val(('listing', 'symbol'), ""),
                "refPrice": ref_price,
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
            }
            records.append(record)
            
        return {
            "success": True, 
            "group": group, 
            "data": records, 
            "updatedAt": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/{symbol}")
def get_stock_detail(symbol: str):
    """
    Lấy thông tin chi tiết của một mã cổ phiếu (AAA, FPT, ACB...).
    """
    symbol = symbol.upper()
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
        }
            
        return {
            "success": True,
            "data": record,
            "updatedAt": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
