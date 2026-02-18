from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import jwt
import json

app = FastAPI(title="Lakeze 多場域 AI 管家協作平台 - 模擬後端")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Secret - 從環境變數讀取
JWT_SECRET = os.environ.get("JWT_SECRET", "default-secret-change-in-production")
JWT_ALGORITHM = "HS256"

# ============ 模擬資料 ============

USERS = {
    "admin@lakeze.com": {
        "id": "user_001",
        "name": "王管理員",
        "email": "admin@lakeze.com",
        "password": "admin123",
        "role": "admin"
    },
    "manager@lakeze.com": {
        "id": "user_002",
        "name": "陳管家",
        "email": "manager@lakeze.com",
        "password": "manager123",
        "role": "manager"
    },
    "jane@lakeze.com": {
        "id": "user_003",
        "name": "Jane Lin",
        "email": "jane@lakeze.com",
        "password": "jane123",
        "role": "manager"
    }
}

VENUES = [
    {"id": "venue_001", "name": "森山寫照"},
    {"id": "venue_002", "name": "天送幸福和苑"},
    {"id": "venue_003", "name": "湖畔雅居"}
]

VENUE_CONFIGS = {
    "venue_001": {
        "venue_id": "venue_001",
        "ai_model": "gpt-4.1-mini",
        "ai_knowledge_base_url": "https://kb.lakeze.com/senshan",
        "greeting_message": "歡迎來到森山寫照！",
        "handoff_keywords": ["真人", "客服", "人工"]
    },
    "venue_002": {
        "venue_id": "venue_002",
        "ai_model": "manus-1.6-max",
        "ai_knowledge_base_url": "https://kb.lakeze.com/tiansong",
        "greeting_message": "歡迎來到天送幸福和苑！",
        "handoff_keywords": ["真人", "管家"]
    },
    "venue_003": {
        "venue_id": "venue_003",
        "ai_model": "gpt-4.1",
        "ai_knowledge_base_url": "",
        "greeting_message": "歡迎來到湖畔雅居！",
        "handoff_keywords": ["人工服務"]
    }
}

TASKS = [
    {
        "id": 101,
        "venue_id": "venue_001",
        "customer_name": "張小明",
        "customer_user_id": "U1234567890abcdef",
        "initial_message": "請問明天還有空房嗎？我想訂兩晚，需要有陽台的房間。",
        "ai_response": "您好！關於房間預訂的詳細需求，我將為您轉接真人管家為您服務。",
        "status": "待處理",
        "assigned_to": None,
        "assigned_to_name": None,
        "notes": "",
        "created_at": (datetime.now() - timedelta(minutes=15)).isoformat(),
        "claimed_at": None,
        "completed_at": None
    },
    {
        "id": 102,
        "venue_id": "venue_001",
        "customer_name": "李美玲",
        "customer_user_id": "U0987654321fedcba",
        "initial_message": "我上次住的時候東西忘在房間了，可以幫我查一下嗎？",
        "ai_response": "非常抱歉聽到這個情況！關於遺失物品的查詢，讓我為您轉接管家處理。",
        "status": "待處理",
        "assigned_to": None,
        "assigned_to_name": None,
        "notes": "",
        "created_at": (datetime.now() - timedelta(minutes=8)).isoformat(),
        "claimed_at": None,
        "completed_at": None
    },
    {
        "id": 103,
        "venue_id": "venue_001",
        "customer_name": "王大華",
        "customer_user_id": "Uabcdef1234567890",
        "initial_message": "請問有提供接駁服務嗎？我從台北車站過去。",
        "ai_response": "關於接駁服務的安排，我將為您轉接管家提供詳細資訊。",
        "status": "處理中",
        "assigned_to": "user_002",
        "assigned_to_name": "陳管家",
        "notes": "客人預計下午2點抵達台北車站",
        "created_at": (datetime.now() - timedelta(hours=1)).isoformat(),
        "claimed_at": (datetime.now() - timedelta(minutes=45)).isoformat(),
        "completed_at": None
    },
    {
        "id": 104,
        "venue_id": "venue_002",
        "customer_name": "陳雅婷",
        "customer_user_id": "Ufedcba0987654321",
        "initial_message": "我想詢問週末的親子活動有哪些？",
        "ai_response": "週末活動的詳細內容，讓我為您轉接管家說明。",
        "status": "待處理",
        "assigned_to": None,
        "assigned_to_name": None,
        "notes": "",
        "created_at": (datetime.now() - timedelta(minutes=5)).isoformat(),
        "claimed_at": None,
        "completed_at": None
    },
    {
        "id": 105,
        "venue_id": "venue_001",
        "customer_name": "林志偉",
        "customer_user_id": "U5555666677778888",
        "initial_message": "退房後可以寄放行李嗎？大概到下午5點。",
        "ai_response": "好的，關於行李寄放服務，我將為您轉接管家協助。",
        "status": "已完成",
        "assigned_to": "user_003",
        "assigned_to_name": "Jane Lin",
        "notes": "已確認可寄放至下午6點，客人表示感謝",
        "created_at": (datetime.now() - timedelta(hours=3)).isoformat(),
        "claimed_at": (datetime.now() - timedelta(hours=2, minutes=50)).isoformat(),
        "completed_at": (datetime.now() - timedelta(hours=2)).isoformat()
    }
]

connected_clients: List[WebSocket] = []

# ============ Models ============

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class TaskUpdate(BaseModel):
    notes: Optional[str] = None

class ManagerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "manager"

class VenueConfigUpdate(BaseModel):
    ai_model: Optional[str] = None
    ai_knowledge_base_url: Optional[str] = None

# ============ Auth Functions ============

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        for user in USERS.values():
            if user["id"] == user_id:
                return user
        return None
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供認證 Token")
    
    token = authorization.replace("Bearer ", "")
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token 無效或已過期")
    return user

# ============ API Endpoints ============

@app.get("/api/")
def root():
    return {"message": "Lakeze 多場域 AI 管家協作平台 API", "status": "running"}

@app.post("/api/auth/login", response_model=LoginResponse)
def login(request: LoginRequest):
    user = USERS.get(request.email)
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="登入失敗，請檢查帳號密碼")
    
    token = create_token(user["id"])
    user_data = {k: v for k, v in user.items() if k != "password"}
    
    return LoginResponse(access_token=token, user=user_data)

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password"}

@app.get("/api/venues")
def get_venues(user: dict = Depends(get_current_user)):
    return VENUES

@app.get("/api/venues/{venue_id}/config")
def get_venue_config(venue_id: str, user: dict = Depends(get_current_user)):
    config = VENUE_CONFIGS.get(venue_id)
    if not config:
        raise HTTPException(status_code=404, detail="場域不存在")
    return config

@app.put("/api/venues/{venue_id}/config")
def update_venue_config(venue_id: str, update: VenueConfigUpdate, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="權限不足")
    
    if venue_id not in VENUE_CONFIGS:
        raise HTTPException(status_code=404, detail="場域不存在")
    
    config = VENUE_CONFIGS[venue_id]
    if update.ai_model is not None:
        config["ai_model"] = update.ai_model
    if update.ai_knowledge_base_url is not None:
        config["ai_knowledge_base_url"] = update.ai_knowledge_base_url
    
    return config

@app.get("/api/tasks")
def get_tasks(venue_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    if venue_id:
        return [t for t in TASKS if t["venue_id"] == venue_id]
    return TASKS

@app.post("/api/tasks/{task_id}/claim")
async def claim_task(task_id: int, user: dict = Depends(get_current_user)):
    task = next((t for t in TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="任務不存在")
    
    if task["status"] != "待處理":
        raise HTTPException(status_code=400, detail="此任務無法被認領")
    
    task["status"] = "處理中"
    task["assigned_to"] = user["id"]
    task["assigned_to_name"] = user["name"]
    task["claimed_at"] = datetime.now().isoformat()
    
    await broadcast_event("task_updated", {"venue_id": task["venue_id"], "task": task})
    await broadcast_event("activity", {
        "type": "task_claimed",
        "manager_name": user["name"],
        "message": f"認領了任務 #{task_id}",
        "venue_id": task["venue_id"],
        "venue_name": next((v["name"] for v in VENUES if v["id"] == task["venue_id"]), ""),
        "timestamp": datetime.now().isoformat()
    })
    
    return task

@app.post("/api/tasks/{task_id}/unclaim")
async def unclaim_task(task_id: int, user: dict = Depends(get_current_user)):
    task = next((t for t in TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="任務不存在")
    
    if task["status"] != "處理中" or task["assigned_to"] != user["id"]:
        raise HTTPException(status_code=400, detail="無法取消認領此任務")
    
    task["status"] = "待處理"
    task["assigned_to"] = None
    task["assigned_to_name"] = None
    task["claimed_at"] = None
    
    await broadcast_event("task_updated", {"venue_id": task["venue_id"], "task": task})
    await broadcast_event("activity", {
        "type": "task_unclaimed",
        "manager_name": user["name"],
        "message": f"取消認領了任務 #{task_id}",
        "venue_id": task["venue_id"],
        "venue_name": next((v["name"] for v in VENUES if v["id"] == task["venue_id"]), ""),
        "timestamp": datetime.now().isoformat()
    })
    
    return task

@app.post("/api/tasks/{task_id}/complete")
async def complete_task(task_id: int, user: dict = Depends(get_current_user)):
    task = next((t for t in TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="任務不存在")
    
    if task["status"] != "處理中" or task["assigned_to"] != user["id"]:
        raise HTTPException(status_code=400, detail="無法完成此任務")
    
    task["status"] = "已完成"
    task["completed_at"] = datetime.now().isoformat()
    
    await broadcast_event("task_updated", {"venue_id": task["venue_id"], "task": task})
    await broadcast_event("activity", {
        "type": "task_completed",
        "manager_name": user["name"],
        "message": f"完成了任務 #{task_id}",
        "venue_id": task["venue_id"],
        "venue_name": next((v["name"] for v in VENUES if v["id"] == task["venue_id"]), ""),
        "timestamp": datetime.now().isoformat()
    })
    
    return task

@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, update: TaskUpdate, user: dict = Depends(get_current_user)):
    task = next((t for t in TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="任務不存在")
    
    if update.notes is not None:
        task["notes"] = update.notes
    
    return task

@app.get("/api/managers")
def get_managers(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="權限不足")
    return [{k: v for k, v in u.items() if k != "password"} for u in USERS.values()]

@app.post("/api/managers")
def create_manager(manager: ManagerCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="權限不足")
    
    if manager.email in USERS:
        raise HTTPException(status_code=400, detail="此 Email 已存在")
    
    new_user = {
        "id": f"user_{len(USERS) + 1:03d}",
        "name": manager.name,
        "email": manager.email,
        "password": manager.password,
        "role": manager.role
    }
    USERS[manager.email] = new_user
    
    return {k: v for k, v in new_user.items() if k != "password"}

@app.get("/api/pms/{venue_id}/availability")
def get_pms_availability(
    venue_id: str, 
    start_date: str = Query(...),
    end_date: str = Query(...),
    user: dict = Depends(get_current_user)
):
    venue = next((v for v in VENUES if v["id"] == venue_id), None)
    if not venue:
        raise HTTPException(status_code=404, detail="場域不存在")
    
    return {
        "venue_id": venue_id,
        "venue_name": venue["name"],
        "query_period": {"start_date": start_date, "end_date": end_date},
        "available_rooms": [
            {"room_type": "標準雙人房", "room_code": "STD-D", "available_count": 3, "price_per_night": 3200},
            {"room_type": "豪華景觀房", "room_code": "DLX-V", "available_count": 2, "price_per_night": 4800},
            {"room_type": "總統套房", "room_code": "PRES", "available_count": 1, "price_per_night": 12000}
        ],
        "note": "此為模擬資料"
    }

# ============ WebSocket ============

async def broadcast_event(event_type: str, payload: dict):
    message = json.dumps({"type": event_type, "payload": payload})
    disconnected = []
    for client in connected_clients:
        try:
            await client.send_text(message)
        except:
            disconnected.append(client)
    for client in disconnected:
        if client in connected_clients:
            connected_clients.remove(client)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    user = verify_token(token) if token else None
    if not user:
        await websocket.close(code=4001)
        return
    
    await websocket.accept()
    connected_clients.append(websocket)
    
    online_managers = [{"id": user["id"], "name": user["name"], "role": user["role"]}]
    for u in USERS.values():
        if u["id"] != user["id"] and u["role"] == "manager":
            online_managers.append({"id": u["id"], "name": u["name"], "role": u["role"]})
            break
    
    await websocket.send_text(json.dumps({
        "type": "online_managers",
        "payload": {"managers": online_managers}
    }))
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
