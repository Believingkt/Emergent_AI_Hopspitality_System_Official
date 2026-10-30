"""Lakeze 多場域 AI 管家協作平台 - Real Backend with MongoDB"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, Header, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import jwt
import bcrypt
import os
import json
import uuid
import shutil
import openai

# Load app_config.json - ALWAYS override critical settings
_app_config = {}
_config_path = os.path.join(os.path.dirname(__file__), "app_config.json")
if os.path.exists(_config_path):
    with open(_config_path) as f:
        _app_config = json.load(f)
    # Critical keys: override only if non-empty value exists in config
    _always_override = {"JWT_SECRET", "NOTION_API_KEY", "NOTION_PAGE_ID"}
    for key, value in _app_config.items():
        if not value:
            continue
        if key in _always_override:
            os.environ[key] = value
            print(f"[Config] Set {key} from app_config.json")
        elif not os.environ.get(key):
            os.environ[key] = value
            print(f"[Config] Loaded {key} from app_config.json")

from database import (
    db, users_col, venues_col, tasks_col, knowledge_col,
    batches_col, config_col, counters_col, versions_col,
    version_items_col, bookings_col, get_next_id, init_indexes
)
from config_loader import load_config, get_config, get_config_value
from migrate import migrate
from pms_client import PMS_UAT_URL, PMS_PROD_URL

app = FastAPI(title="Lakeze 多場域 AI 管家協作平台")

# Ensure uploads directory exists
# On Railway, set UPLOAD_DIR to a mounted volume path (e.g. /data/uploads) so files survive redeploys
UPLOAD_DIR = os.environ.get("UPLOAD_DIR") or os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    # Comma-separated list, e.g. "https://manager.lakeze.com,https://xxx.up.railway.app"; defaults to all origins
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    # Generate a secure secret that meets minimum 32 bytes for SHA256
    import hashlib
    mongo_url = os.environ.get("MONGO_URL", "default-fallback-key")
    JWT_SECRET = hashlib.sha256(f"lakeze-jwt-secret-{mongo_url}".encode()).hexdigest()
    print(f"[Config] JWT_SECRET auto-generated ({len(JWT_SECRET)} chars)")
JWT_ALGORITHM = "HS256"

# ============ Startup ============

@app.on_event("startup")
async def startup():
    from database import DB_NAME
    print(f"[Server] Starting up... (DB: {DB_NAME})")
    try:
        await init_indexes()
    except Exception as e:
        print(f"[Server] Index creation skipped: {e}")
    try:
        await migrate()
    except Exception as e:
        print(f"[Server] Migration error: {e}")
    try:
        await load_config()
    except Exception as e:
        print(f"[Server] Config loading skipped: {e}")
    
    # Verify users exist after migration
    try:
        user_count = await users_col.count_documents({})
        print(f"[Server] Ready! Users in DB: {user_count}")
        if user_count == 0:
            print("[Server] WARNING: No users in database! Attempting to create initial admin...")
            from migrate import ensure_initial_admin
            await ensure_initial_admin()
            user_count = await users_col.count_documents({})
            print(f"[Server] After bootstrap: {user_count} users")
    except Exception as e:
        print(f"[Server] User count check failed: {e}")

# ============ Pydantic Models ============

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class KnowledgeCreate(BaseModel):
    title: str
    content: str
    category: str = "other"

class KnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class ExtractRequest(BaseModel):
    content_type: str = "text"
    content: Optional[str] = None
    file_url: Optional[str] = None

class TaskReply(BaseModel):
    message: str

class PublishRequest(BaseModel):
    description: Optional[str] = ""
    change_summary: Optional[str] = ""

class RollbackRequest(BaseModel):
    reason: Optional[str] = ""

# ============ Auth Helpers ============

def create_token(email: str, token_version: int = 0) -> str:
    payload = {
        "sub": email,
        "tv": token_version,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24),
        "type": "access",
        "fresh": False,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def validate_password_strength(password: str):
    """At least 10 characters, containing both letters and digits"""
    if len(password) < 10:
        raise HTTPException(400, "密碼至少需要 10 個字元")
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(400, "密碼需同時包含英文字母與數字")


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供認證 Token")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        user = await users_col.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="用戶不存在")
        # Tokens issued before a password change are no longer valid
        if payload.get("tv", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="密碼已變更，請重新登入")
        return {"email": user["email"], "name": user["name"], "role": user["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已過期")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token 無效")


# ============ Helper to strip Mongo _id ============

def clean(doc):
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

# ============ Health ============

@app.get("/api/health")
async def health():
    # Enhanced health check with database diagnostics
    from database import DB_NAME
    try:
        user_count = await users_col.count_documents({})
        venue_count = await venues_col.count_documents({})
        db_status = "connected"
    except Exception as e:
        user_count = -1
        venue_count = -1
        db_status = f"error: {str(e)[:100]}"
    
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "service": "lakeze-backend",
        "db": "mongodb",
        "db_name": DB_NAME,
        "db_status": db_status,
        "users_count": user_count,
        "venues_count": venue_count
    }

@app.get("/api/")
async def api_root():
    return {"message": "Lakeze 多場域 AI 管家協作平台 API", "status": "running", "backend": "mongodb"}

@app.get("/")
async def root():
    return {"message": "Lakeze API", "status": "running"}

# ============ Auth ============

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    try:
        user = await users_col.find_one({"email": req.email.lower()})
    except Exception as db_err:
        print(f"[Login] Database error when finding user '{req.email}': {db_err}")
        raise HTTPException(status_code=500, detail=f"資料庫連線錯誤: {str(db_err)[:100]}")
    
    if not user:
        # Check if ANY users exist in database
        try:
            user_count = await users_col.count_documents({})
            print(f"[Login] User '{req.email}' not found. Total users in DB: {user_count}")
            if user_count == 0:
                print("[Login] WARNING: No users in database! Migration may have failed.")
        except Exception as e:
            print(f"[Login] Cannot count users: {e}")
        raise HTTPException(status_code=401, detail="帳號不存在或密碼錯誤")
    
    if not user.get("password_hash"):
        print(f"[Login] User '{req.email}' has no password_hash field!")
        raise HTTPException(status_code=401, detail="帳號密碼設定異常，請聯繫管理員")
    
    try:
        if not verify_password(req.password, user["password_hash"]):
            print(f"[Login] Wrong password for '{req.email}'")
            raise HTTPException(status_code=401, detail="帳號不存在或密碼錯誤")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Login] Password verification error for '{req.email}': {e}")
        raise HTTPException(status_code=401, detail="密碼驗證異常，請聯繫管理員")

    token = create_token(user["email"], user.get("token_version", 0))
    print(f"[Login] Success: {user['email']} ({user.get('role', 'unknown')})")
    return {
        "access_token": token,
        "user": {"email": user["email"], "name": user["name"], "role": user["role"]}
    }

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.put("/api/auth/password")
async def change_own_password(req: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    db_user = await users_col.find_one({"email": user["email"]})
    if not verify_password(req.current_password, db_user["password_hash"]):
        raise HTTPException(400, "目前密碼不正確")
    validate_password_strength(req.new_password)
    await users_col.update_one(
        {"email": user["email"]},
        {"$set": {"password_hash": hash_password(req.new_password), "updated_at": datetime.utcnow().isoformat()},
         "$inc": {"token_version": 1}}
    )
    return {"success": True, "message": "密碼已更新，請重新登入"}

# ============ Venues ============

@app.get("/api/venues")
async def get_venues(user: dict = Depends(get_current_user)):
    venues = await venues_col.find({}).to_list(100)
    return {"venues": [{
        "id": v["id"], 
        "name": v["name"], 
        "description": v.get("description", ""),
        "avatar_url": v.get("avatar_url", ""),
        "created_at": v.get("created_at", "")
    } for v in venues]}

@app.post("/api/venues")
async def create_venue(user: dict = Depends(get_current_user)):
    """Create a new venue with default name"""
    if user.get("role") != "admin":
        raise HTTPException(403, "只有管理員可以新增場域")
    
    venue_id = str(uuid.uuid4())[:8]
    new_venue = {
        "id": venue_id,
        "name": "新場域",
        "description": "",
        "avatar_url": "",
        "created_at": datetime.utcnow().isoformat(),
        "config": {
            "ai_model": "T1",
            "greeting_message": "歡迎來到新場域！",
            "handoff_keywords": ["真人", "客服", "人工", "管家"]
        }
    }
    await venues_col.insert_one(new_venue)
    return {
        "success": True,
        "venue": {
            "id": venue_id,
            "name": "新場域",
            "description": "",
            "avatar_url": "",
            "created_at": new_venue["created_at"]
        }
    }

class VenueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@app.put("/api/venues/{venue_id}")
async def update_venue(venue_id: str, body: VenueUpdate, user: dict = Depends(get_current_user)):
    """Update venue name and description"""
    if user.get("role") != "admin":
        raise HTTPException(403, "只有管理員可以修改場域")
    
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    
    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name
    if body.description is not None:
        update_data["description"] = body.description
    
    if update_data:
        await venues_col.update_one({"id": venue_id}, {"$set": update_data})
    
    updated = await venues_col.find_one({"id": venue_id})
    return {
        "success": True,
        "venue": {
            "id": updated["id"],
            "name": updated["name"],
            "description": updated.get("description", ""),
            "avatar_url": updated.get("avatar_url", ""),
        }
    }

@app.post("/api/venues/{venue_id}/avatar")
async def upload_venue_avatar(venue_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload venue avatar image"""
    if user.get("role") != "admin":
        raise HTTPException(403, "只有管理員可以修改場域")
    
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "只支援 JPG、PNG、WebP、GIF 格式的圖片")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"venue_{venue_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Delete old avatar if exists
    old_avatar = venue.get("avatar_url", "")
    if old_avatar:
        old_filename = old_avatar.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Update venue with new avatar URL
    avatar_url = f"/api/uploads/{filename}"
    await venues_col.update_one({"id": venue_id}, {"$set": {"avatar_url": avatar_url}})
    
    return {"success": True, "avatar_url": avatar_url}

# ============ Tasks ============

@app.get("/api/tasks")
async def get_tasks(venue_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"venue_id": venue_id} if venue_id else {}
    tasks = await tasks_col.find(query).sort("created_at", -1).to_list(200)
    return {"tasks": [clean(t) for t in tasks]}

@app.get("/api/tasks/grouped")
async def get_grouped_tasks(venue_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Group tasks by customer_user_id, return merged conversation per customer"""
    query = {"venue_id": venue_id} if venue_id else {}
    all_tasks = await tasks_col.find(query).sort("created_at", 1).to_list(500)

    groups = {}
    for t in all_tasks:
        uid = t.get("customer_user_id", "unknown")
        if uid not in groups:
            groups[uid] = {
                "customer_user_id": uid,
                "customer_name": None,
                "customer_phone": None,
                "customer_info": {},
                "customer_stage": "inquiry",
                "venue_id": t.get("venue_id"),
                "status": "待處理",
                "messages": [],
                "task_ids": [],
                "first_message_at": t.get("created_at"),
                "last_message_at": t.get("created_at"),
                "payment_confirmed": False,
                "payment_amount": None,
                "payment_confirmed_at": None,
            }

        g = groups[uid]
        g["task_ids"].append(t.get("task_id"))
        g["last_message_at"] = t.get("created_at") or g["last_message_at"]

        # Update customer info with latest non-null values
        info = t.get("customer_info") or {}
        if info.get("customer_name"):
            g["customer_name"] = info["customer_name"]
        if info.get("customer_phone"):
            g["customer_phone"] = info["customer_phone"]
        if t.get("customer_name"):
            g["customer_name"] = t["customer_name"]

        # Merge customer_info (keep latest non-null)
        for key in ["date", "num_adults", "num_children", "room_type", "total_price", "payment_confirmed"]:
            if info.get(key) is not None:
                g["customer_info"][key] = info[key]

        # Payment fields
        if info.get("payment_confirmed"):
            g["payment_confirmed"] = True
        if info.get("payment_amount"):
            g["payment_amount"] = info["payment_amount"]
        if info.get("payment_confirmed_at"):
            g["payment_confirmed_at"] = info["payment_confirmed_at"]

        # Customer stage (use latest)
        if t.get("customer_stage"):
            g["customer_stage"] = t["customer_stage"]

        # Status priority: 待處理 > 處理中 > 已處理
        if t.get("status") == "待處理" and g["status"] != "待處理":
            g["status"] = "待處理"
        elif t.get("status") == "處理中" and g["status"] == "已處理":
            g["status"] = "處理中"

        # Build conversation messages
        if t.get("customer_message"):
            g["messages"].append({
                "sender_type": "customer",
                "content": t["customer_message"],
                "timestamp": t.get("created_at"),
                "task_id": t.get("task_id"),
            })
        if t.get("ai_response"):
            g["messages"].append({
                "sender_type": "ai",
                "content": t["ai_response"],
                "timestamp": t.get("created_at"),
                "task_id": t.get("task_id"),
            })
        if t.get("notes") and t.get("status") == "已處理":
            g["messages"].append({
                "sender_type": "manager",
                "content": t["notes"],
                "timestamp": t.get("completed_at") or t.get("created_at"),
                "task_id": t.get("task_id"),
            })

    result = sorted(groups.values(), key=lambda x: x["last_message_at"] or "", reverse=True)
    return {"customers": result}

@app.get("/api/tasks/{task_id}/conversations")
async def get_task_conversations(task_id: int, user: dict = Depends(get_current_user)):
    """Get conversation history for a specific task's customer"""
    task = await tasks_col.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(404, "任務不存在")

    uid = task.get("customer_user_id")
    all_tasks = await tasks_col.find({"customer_user_id": uid}).sort("created_at", 1).to_list(200)

    messages = []
    for t in all_tasks:
        if t.get("customer_message"):
            messages.append({
                "sender_type": "customer",
                "content": t["customer_message"],
                "timestamp": t.get("created_at"),
                "task_id": t.get("task_id"),
            })
        if t.get("ai_response"):
            messages.append({
                "sender_type": "ai",
                "content": t["ai_response"],
                "timestamp": t.get("created_at"),
                "task_id": t.get("task_id"),
            })
        if t.get("notes") and t.get("status") == "已處理":
            messages.append({
                "sender_type": "manager",
                "content": t["notes"],
                "timestamp": t.get("completed_at") or t.get("created_at"),
                "task_id": t.get("task_id"),
            })

    return {"messages": messages, "customer_user_id": uid, "total": len(messages)}

@app.post("/api/venues/{venue_id}/customers/{customer_user_id}/confirm-payment")
async def confirm_payment(
    venue_id: str,
    customer_user_id: str,
    body: dict = None,
    user: dict = Depends(get_current_user)
):
    """Confirm payment for a customer"""
    body = body or {}
    now = datetime.utcnow().isoformat()
    payment_amount = body.get("payment_amount", 0)

    # Update all tasks for this customer
    result = await tasks_col.update_many(
        {"customer_user_id": customer_user_id, "venue_id": venue_id},
        {"$set": {
            "customer_info.payment_confirmed": True,
            "customer_info.payment_amount": payment_amount,
            "customer_info.payment_confirmed_at": now,
            "status": "已處理",
            "completed_at": now,
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "找不到該客戶的任務")

    return {
        "success": True,
        "message": f"已確認匯款，共更新 {result.modified_count} 筆任務",
        "payment_confirmed_at": now,
    }
async def claim_task(task_id: int, user: dict = Depends(get_current_user)):
    task = await tasks_col.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(404, "任務不存在")
    if task["status"] != "待處理":
        raise HTTPException(400, "此任務無法被認領")

    now = datetime.utcnow().isoformat()
    await tasks_col.update_one(
        {"task_id": task_id},
        {"$set": {"status": "處理中", "assigned_manager": user["email"], "claimed_at": now}}
    )
    task["status"] = "處理中"
    task["assigned_manager"] = user["email"]
    task["claimed_at"] = now
    return clean(task)

@app.post("/api/tasks/{task_id}/unclaim")
async def unclaim_task(task_id: int, user: dict = Depends(get_current_user)):
    task = await tasks_col.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(404, "任務不存在")

    await tasks_col.update_one(
        {"task_id": task_id},
        {"$set": {"status": "待處理", "assigned_manager": None, "claimed_at": None}}
    )
    task["status"] = "待處理"
    task["assigned_manager"] = None
    task["claimed_at"] = None
    return clean(task)

@app.post("/api/tasks/{task_id}/complete")
async def complete_task(task_id: int, user: dict = Depends(get_current_user)):
    task = await tasks_col.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(404, "任務不存在")

    now = datetime.utcnow().isoformat()
    await tasks_col.update_one(
        {"task_id": task_id},
        {"$set": {"status": "已處理", "completed_at": now}}
    )
    task["status"] = "已處理"
    task["completed_at"] = now
    return clean(task)

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: int, update: dict, user: dict = Depends(get_current_user)):
    task = await tasks_col.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(404, "任務不存在")

    allowed = {"notes", "status", "assigned_manager"}
    update_fields = {k: v for k, v in update.items() if k in allowed}
    if update_fields:
        await tasks_col.update_one({"task_id": task_id}, {"$set": update_fields})

    updated = await tasks_col.find_one({"task_id": task_id})
    return clean(updated)

@app.post("/api/tasks/{task_id}/reply")
async def reply_task(task_id: int, body: TaskReply, user: dict = Depends(get_current_user)):
    task = await tasks_col.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(404, "任務不存在")

    customer_uid = task.get("customer_user_id")
    venue_id = task.get("venue_id")
    
    # Send LINE message to customer
    line_sent = False
    if customer_uid and venue_id:
        creds = await get_line_credentials_for_venue(venue_id)
        access_token = creds.get("channel_access_token", "")
        if access_token:
            line_sent = await line_push_message(
                customer_uid,
                [{"type": "text", "text": body.message}],
                access_token
            )

    await tasks_col.update_one(
        {"task_id": task_id},
        {"$set": {
            "status": "已處理",
            "completed_at": datetime.utcnow().isoformat(),
            "notes": body.message
        }}
    )

    return {
        "success": True, 
        "message": "回覆已發送" if line_sent else "回覆已記錄（LINE 發送未成功）",
        "task_id": task_id,
        "line_sent": line_sent
    }

# ============ Knowledge CRUD ============

@app.get("/api/venues/{venue_id}/knowledge")
async def get_knowledge(venue_id: str, user: dict = Depends(get_current_user)):
    items = await knowledge_col.find({"venue_id": venue_id}).sort("created_at", -1).to_list(500)
    return {"knowledge": [clean(k) for k in items], "venue_id": venue_id}

@app.post("/api/venues/{venue_id}/knowledge")
async def create_knowledge(venue_id: str, body: KnowledgeCreate, user: dict = Depends(get_current_user)):
    kid = await get_next_id("knowledge")
    now = datetime.utcnow().isoformat()
    doc = {
        "id": kid,
        "venue_id": venue_id,
        "title": body.title,
        "content": body.content,
        "category": body.category,
        "source_type": "manual",
        "status": "approved",
        "is_active": True,
        "ai_confidence": None,
        "batch_id": None,
        "created_at": now,
        "updated_at": now,
    }
    await knowledge_col.insert_one(doc)
    return {"success": True, "knowledge": clean(doc)}

@app.put("/api/venues/{venue_id}/knowledge/{kid}")
async def update_knowledge(venue_id: str, kid: int, body: KnowledgeUpdate, user: dict = Depends(get_current_user)):
    item = await knowledge_col.find_one({"id": kid, "venue_id": venue_id})
    if not item:
        raise HTTPException(404, "知識不存在")

    update_fields = {"updated_at": datetime.utcnow().isoformat()}
    if body.title is not None:
        update_fields["title"] = body.title
    if body.content is not None:
        update_fields["content"] = body.content
    if body.category is not None:
        update_fields["category"] = body.category

    # If editing a pending item, auto-approve
    if item.get("status") == "pending":
        update_fields["status"] = "approved"
        update_fields["is_active"] = True

    await knowledge_col.update_one({"id": kid}, {"$set": update_fields})
    updated = await knowledge_col.find_one({"id": kid})
    return {"success": True, "knowledge": clean(updated)}

@app.delete("/api/venues/{venue_id}/knowledge/{kid}")
async def delete_knowledge(venue_id: str, kid: int, user: dict = Depends(get_current_user)):
    result = await knowledge_col.update_one(
        {"id": kid, "venue_id": venue_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "知識不存在")
    return {"success": True, "message": "已停用"}

# ============ Knowledge Stats ============

@app.get("/api/venues/{venue_id}/knowledge/stats")
async def get_knowledge_stats(venue_id: str, user: dict = Depends(get_current_user)):
    pipeline_overall = [
        {"$match": {"venue_id": venue_id}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "active_count": {"$sum": {"$cond": [{"$eq": ["$is_active", True]}, 1, 0]}},
            "inactive_count": {"$sum": {"$cond": [{"$eq": ["$is_active", False]}, 1, 0]}},
            "approved_count": {"$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}},
            "draft_count": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
            "rejected_count": {"$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}},
            "manual_count": {"$sum": {"$cond": [{"$eq": ["$source_type", "manual"]}, 1, 0]}},
            "ai_extracted_count": {"$sum": {"$cond": [{"$in": ["$source_type", ["ai_extracted", "ai"]]}, 1, 0]}},
        }}
    ]
    overall_result = await knowledge_col.aggregate(pipeline_overall).to_list(1)
    overall = overall_result[0] if overall_result else {
        "total": 0, "active_count": 0, "inactive_count": 0,
        "approved_count": 0, "draft_count": 0, "rejected_count": 0,
        "manual_count": 0, "ai_extracted_count": 0
    }
    if "_id" in overall:
        del overall["_id"]

    pipeline_category = [
        {"$match": {"venue_id": venue_id}},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": 1},
            "active_count": {"$sum": {"$cond": [{"$eq": ["$is_active", True]}, 1, 0]}},
        }}
    ]
    cat_result = await knowledge_col.aggregate(pipeline_category).to_list(20)
    by_category = [{"category": c["_id"], "total": c["total"], "active_count": c["active_count"]} for c in cat_result]

    return {"overall": overall, "by_category": by_category, "venue_id": venue_id}

# ============ Knowledge AI Extract ============

@app.post("/api/venues/{venue_id}/knowledge/extract")
async def extract_knowledge(venue_id: str, body: ExtractRequest, user: dict = Depends(get_current_user)):
    content = body.content or ""
    if not content and body.file_url:
        content = f"[File uploaded: {body.file_url}]"

    if not content:
        raise HTTPException(400, "請提供內容")

    # Create batch
    batch_id = await get_next_id("knowledge_batches")
    now = datetime.utcnow().isoformat()

    batch_doc = {
        "id": batch_id,
        "venue_id": venue_id,
        "source_type": body.content_type,
        "status": "processing",
        "total_extracted": 0,
        "total_approved": 0,
        "pending_count": 0,
        "rejected_count": 0,
        "created_by": user["email"],
        "error_message": None,
        "created_at": now,
        "completed_at": None,
        "original_content": content,
    }
    await batches_col.insert_one(batch_doc)

    # AI extraction using OpenAI
    try:
        api_key = await get_config_value("openai_api_key")
        if not api_key:
            raise Exception("OpenAI API key not configured")

        client = openai.AsyncOpenAI(api_key=api_key)

        system_prompt = """你是一個專業的知識提取助手。請從以下文字內容中提取獨立的知識點。

每個知識點需包含：
- title: 簡短標題（10-20字）
- content: 完整內容（保留重要細節）
- category: 分類，必須是以下之一：pricing（價格）、facility（設施）、policy（規則）、dining（餐飲）、service（服務）、transport（交通位置）、other（其他）

回傳 JSON 陣列格式，例如：
[{"title": "...", "content": "...", "category": "pricing"}]

只回傳 JSON，不要其他文字。"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content}
            ],
            temperature=0.3,
            max_tokens=4000,
        )

        result_text = response.choices[0].message.content.strip()
        # Parse JSON from response
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        extracted = json.loads(result_text)

        # Save extracted knowledge items
        for item in extracted:
            kid = await get_next_id("knowledge")
            await knowledge_col.insert_one({
                "id": kid,
                "venue_id": venue_id,
                "title": item.get("title", ""),
                "content": item.get("content", ""),
                "category": item.get("category", "other"),
                "source_type": "ai_extracted",
                "status": "pending",
                "is_active": False,
                "ai_confidence": 0.9,
                "batch_id": batch_id,
                "created_at": now,
                "updated_at": now,
            })

        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed",
            "total_extracted": len(extracted),
            "pending_count": len(extracted),
            "completed_at": datetime.utcnow().isoformat(),
        }})

        return {
            "success": True,
            "batch_id": batch_id,
            "message": f"已提取 {len(extracted)} 條知識點",
            "status": "completed"
        }

    except Exception as e:
        print(f"[Extract] Error: {e}")
        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed",
            "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat(),
        }})
        raise HTTPException(500, f"AI 提取失敗: {str(e)}")

# ============ Knowledge PDF Upload ============

@app.post("/api/venues/{venue_id}/knowledge/upload-pdf")
async def upload_pdf_knowledge(venue_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a PDF file, extract text, and use AI to create knowledge entries"""
    import pdfplumber
    import io
    
    # Validate file type
    if file.content_type not in ["application/pdf"]:
        raise HTTPException(400, "只支援 PDF 格式的檔案")
    
    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "檔案大小不能超過 10MB")
    
    # Extract text from PDF
    try:
        pdf_text = ""
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pdf_text += page_text + "\n\n"
        
        if not pdf_text.strip():
            raise HTTPException(400, "無法從 PDF 中擷取文字，可能是掃描檔或圖片 PDF")
        
        # Truncate if too long (keep first ~8000 chars for API limits)
        if len(pdf_text) > 8000:
            pdf_text = pdf_text[:8000] + "\n\n[...文件內容已截斷，建議分批上傳]"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"PDF 解析失敗: {str(e)}")
    
    # Save original file
    ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    saved_filename = f"knowledge_{venue_id}_{uuid.uuid4().hex[:8]}.{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_filename)
    with open(saved_path, "wb") as f:
        f.write(contents)
    
    # Create batch record
    batch_id = await get_next_id("knowledge_batches")
    now = datetime.utcnow().isoformat()
    batch_doc = {
        "id": batch_id,
        "venue_id": venue_id,
        "source_type": "pdf",
        "source_filename": file.filename,
        "status": "processing",
        "total_extracted": 0,
        "total_approved": 0,
        "pending_count": 0,
        "rejected_count": 0,
        "created_by": user["email"],
        "error_message": None,
        "created_at": now,
        "completed_at": None,
        "original_content": pdf_text[:2000],
    }
    await batches_col.insert_one(batch_doc)
    
    # AI extraction
    try:
        api_key = await get_config_value("openai_api_key")
        if not api_key:
            raise Exception("OpenAI API key not configured. 請先在設定中配置 API Key。")
        
        client = openai.AsyncOpenAI(api_key=api_key)
        
        system_prompt = """你是一個專業的知識提取助手。請從以下 PDF 文件內容中提取獨立的知識點。

每個知識點需包含：
- title: 簡短標題（10-20字）
- content: 完整內容（保留重要細節，用通順的中文描述）
- category: 分類，必須是以下之一：pricing（價格）、facility（設施）、rules（規則）、dining（餐飲）、service（服務）、location（交通位置）、other（其他）

注意：
- 把零散的資訊整理成有意義的知識條目
- 每個知識點要完整獨立，不要互相依賴
- 去除無關的頁首頁尾、頁碼等雜訊
- 保留具體的數字、價格、時間等重要資訊

回傳 JSON 陣列格式，例如：
[{"title": "...", "content": "...", "category": "pricing"}]

只回傳 JSON，不要其他文字。"""
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"以下是 PDF 文件「{file.filename}」的內容：\n\n{pdf_text}"}
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        
        result_text = response.choices[0].message.content.strip()
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        extracted = json.loads(result_text)
        
        # Save extracted knowledge
        created_items = []
        for item in extracted:
            kid = await get_next_id("knowledge")
            doc = {
                "id": kid,
                "venue_id": venue_id,
                "title": item.get("title", ""),
                "content": item.get("content", ""),
                "category": item.get("category", "other"),
                "source_type": "pdf",
                "source_filename": file.filename,
                "status": "approved",
                "is_active": True,
                "ai_confidence": 0.85,
                "batch_id": batch_id,
                "created_at": now,
                "updated_at": now,
            }
            await knowledge_col.insert_one(doc)
            created_items.append(clean(doc))
        
        # Update batch
        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed",
            "total_extracted": len(created_items),
            "total_approved": len(created_items),
            "completed_at": datetime.utcnow().isoformat(),
        }})
        
        return {
            "success": True,
            "batch_id": batch_id,
            "filename": file.filename,
            "total_extracted": len(created_items),
            "knowledge_items": created_items,
            "message": f"從 PDF 中成功提取 {len(created_items)} 條知識"
        }
        
    except json.JSONDecodeError as e:
        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed",
            "error_message": f"AI 回傳格式錯誤: {str(e)}",
            "completed_at": datetime.utcnow().isoformat(),
        }})
        raise HTTPException(500, "AI 分析結果格式錯誤，請重試")
    except Exception as e:
        print(f"[PDF Extract] Error: {e}")
        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed",
            "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat(),
        }})
        raise HTTPException(500, f"PDF 知識提取失敗: {str(e)}")

# ============ Universal File Upload (Claude AI) ============

@app.post("/api/venues/{venue_id}/knowledge/upload-file")
async def upload_file_knowledge(venue_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload any supported file, extract content with Claude AI, create knowledge entries.
    Supports: PDF, Word (.docx), Images (.jpg/.png/.webp), Markdown (.md), Text (.txt), ZIP
    """
    from knowledge_extractor import (
        extract_text_from_file, claude_extract_knowledge, 
        get_file_extension, SUPPORTED_EXTENSIONS
    )
    
    ext = get_file_extension(file.filename or "")
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"不支援的檔案格式 .{ext}。支援：PDF, Word, 圖片, Markdown, ZIP")
    
    # Read file
    contents = await file.read()
    max_size = 20 * 1024 * 1024  # 20MB for ZIP, 10MB for others
    if ext == 'zip' and len(contents) > max_size:
        raise HTTPException(400, "ZIP 檔案大小不能超過 20MB")
    elif ext != 'zip' and len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "檔案大小不能超過 10MB")
    
    # Save original file
    saved_filename = f"knowledge_{venue_id}_{uuid.uuid4().hex[:8]}.{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_filename)
    with open(saved_path, "wb") as f:
        f.write(contents)
    
    # Extract content
    extraction = await extract_text_from_file(contents, file.filename)
    if extraction.get("error") and not extraction.get("text") and not extraction.get("image_data"):
        raise HTTPException(400, extraction["error"])
    
    # Create batch
    batch_id = await get_next_id("knowledge_batches")
    now = datetime.utcnow().isoformat()
    await batches_col.insert_one({
        "id": batch_id,
        "venue_id": venue_id,
        "source_type": extraction.get("type", ext),
        "source_filename": file.filename,
        "status": "processing",
        "total_extracted": 0,
        "total_approved": 0,
        "pending_count": 0,
        "rejected_count": 0,
        "created_by": user["email"],
        "error_message": None,
        "created_at": now,
        "completed_at": None,
        "original_content": (extraction.get("text", ""))[:2000],
    })
    
    # Claude AI extraction
    try:
        api_key = await get_config_value("claude_api_key")
        if not api_key:
            raise Exception("Claude API key 未設定")
        
        extracted = await claude_extract_knowledge(
            text=extraction.get("text", ""),
            image_data=extraction.get("image_data"),
            images=extraction.get("images"),
            api_key=api_key,
            source_filename=file.filename,
        )
        
        # Save extracted knowledge
        created_items = []
        for item in extracted:
            kid = await get_next_id("knowledge")
            doc = {
                "id": kid,
                "venue_id": venue_id,
                "title": item.get("title", ""),
                "content": item.get("content", ""),
                "category": item.get("category", "other"),
                "source_type": f"ai_{extraction.get('type', ext)}",
                "source_filename": file.filename,
                "status": "approved",
                "is_active": True,
                "ai_confidence": 0.9,
                "batch_id": batch_id,
                "created_at": now,
                "updated_at": now,
            }
            await knowledge_col.insert_one(doc)
            created_items.append(clean(doc))
        
        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed",
            "total_extracted": len(created_items),
            "total_approved": len(created_items),
            "completed_at": datetime.utcnow().isoformat(),
        }})
        
        print(f"[Upload] {file.filename} → {len(created_items)} knowledge items (Claude)")
        return {
            "success": True,
            "batch_id": batch_id,
            "filename": file.filename,
            "file_type": extraction.get("type", ext),
            "total_extracted": len(created_items),
            "knowledge_items": created_items,
            "message": f"從 {file.filename} 成功提取 {len(created_items)} 條知識"
        }
    
    except json.JSONDecodeError:
        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed", "error_message": "AI 回傳格式錯誤",
            "completed_at": datetime.utcnow().isoformat(),
        }})
        raise HTTPException(500, "AI 分析結果格式錯誤，請重試")
    except Exception as e:
        print(f"[Upload] Error: {e}")
        await batches_col.update_one({"id": batch_id}, {"$set": {
            "status": "completed", "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat(),
        }})
        raise HTTPException(500, f"知識提取失敗: {str(e)}")

# ============ Knowledge Batches ============

@app.get("/api/venues/{venue_id}/knowledge/batches")
async def get_batches(venue_id: str, user: dict = Depends(get_current_user)):
    batches = await batches_col.find({"venue_id": venue_id}).sort("created_at", -1).to_list(50)
    return {"batches": [clean(b) for b in batches], "venue_id": venue_id}

@app.get("/api/venues/{venue_id}/knowledge/batches/{batch_id}")
async def get_batch_detail(venue_id: str, batch_id: int, user: dict = Depends(get_current_user)):
    batch = await batches_col.find_one({"id": batch_id, "venue_id": venue_id})
    if not batch:
        raise HTTPException(404, "批次不存在")

    items = await knowledge_col.find({"batch_id": batch_id, "venue_id": venue_id}).to_list(100)
    result = clean(batch)
    result["knowledge_items"] = [clean(k) for k in items]
    return result

# ============ Knowledge Approve/Reject ============

@app.put("/api/venues/{venue_id}/knowledge/{kid}/approve")
async def approve_knowledge(venue_id: str, kid: int, user: dict = Depends(get_current_user)):
    result = await knowledge_col.update_one(
        {"id": kid, "venue_id": venue_id},
        {"$set": {"status": "approved", "is_active": True, "updated_at": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "知識不存在")

    # Update batch counts
    item = await knowledge_col.find_one({"id": kid})
    if item and item.get("batch_id"):
        bid = item["batch_id"]
        await _update_batch_counts(bid, venue_id)

    return {"success": True, "knowledge_id": kid, "status": "approved", "message": "知識已確認並生效"}

@app.put("/api/venues/{venue_id}/knowledge/{kid}/reject")
async def reject_knowledge(venue_id: str, kid: int, user: dict = Depends(get_current_user)):
    result = await knowledge_col.update_one(
        {"id": kid, "venue_id": venue_id},
        {"$set": {"status": "rejected", "is_active": False, "updated_at": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "知識不存在")

    item = await knowledge_col.find_one({"id": kid})
    if item and item.get("batch_id"):
        await _update_batch_counts(item["batch_id"], venue_id)

    return {"success": True, "knowledge_id": kid, "status": "rejected", "message": "已拒絕此知識項目"}

@app.post("/api/venues/{venue_id}/knowledge/batches/{batch_id}/approve-all")
async def approve_all(venue_id: str, batch_id: int, user: dict = Depends(get_current_user)):
    result = await knowledge_col.update_many(
        {"batch_id": batch_id, "venue_id": venue_id, "status": "pending"},
        {"$set": {"status": "approved", "is_active": True, "updated_at": datetime.utcnow().isoformat()}}
    )
    count = result.modified_count
    await _update_batch_counts(batch_id, venue_id)
    return {"success": True, "approved_count": count, "message": f"已確認 {count} 條知識項目"}


async def _update_batch_counts(batch_id: int, venue_id: str):
    """Recalculate batch counts"""
    items = await knowledge_col.find({"batch_id": batch_id, "venue_id": venue_id}).to_list(100)
    approved = sum(1 for i in items if i.get("status") == "approved")
    pending = sum(1 for i in items if i.get("status") == "pending")
    rejected = sum(1 for i in items if i.get("status") == "rejected")
    await batches_col.update_one({"id": batch_id}, {"$set": {
        "total_approved": approved,
        "pending_count": pending,
        "rejected_count": rejected,
    }})

# ============ Version Management (P2) ============

@app.post("/api/venues/{venue_id}/knowledge/publish")
async def publish_version(venue_id: str, body: PublishRequest, user: dict = Depends(get_current_user)):
    # Get active knowledge
    active = await knowledge_col.find({"venue_id": venue_id, "is_active": True, "status": "approved"}).to_list(500)
    if not active:
        raise HTTPException(400, "沒有任何生效中的知識可發佈")

    # Determine version number
    latest = await versions_col.find({"venue_id": venue_id}).sort("published_at", -1).limit(1).to_list(1)
    if latest:
        last_num = latest[0].get("version_number", "v1.0")
        parts = last_num.replace("v", "").split(".")
        major, minor = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
        minor += 1
        if minor > 9:
            major += 1
            minor = 0
        new_version = f"v{major}.{minor}"
        # Unset previous current
        await versions_col.update_many({"venue_id": venue_id}, {"$set": {"is_current": False}})
    else:
        new_version = "v1.0"

    vid = await get_next_id("knowledge_versions")
    now = datetime.utcnow().isoformat()
    version_id = f"ver_{vid}"

    version_doc = {
        "version_id": version_id,
        "venue_id": venue_id,
        "version_number": new_version,
        "description": body.description,
        "change_summary": body.change_summary,
        "knowledge_count": len(active),
        "published_by": user["email"],
        "published_by_name": user["name"],
        "published_at": now,
        "is_current": True,
        "rolled_back": False,
    }
    await versions_col.insert_one(version_doc)

    # Snapshot knowledge items
    for k in active:
        await version_items_col.insert_one({
            "version_id": version_id,
            "knowledge_id": k["id"],
            "venue_id": venue_id,
            "category": k.get("category"),
            "title": k.get("title"),
            "content": k.get("content"),
            "source_type": k.get("source_type"),
            "original_created_at": k.get("created_at"),
            "snapshot_at": now,
        })

    return {
        "success": True,
        "version": clean(version_doc),
        "message": f"版本 {new_version} 已發佈，AI 將開始使用新知識"
    }

@app.get("/api/venues/{venue_id}/knowledge/versions")
async def get_versions(venue_id: str, user: dict = Depends(get_current_user)):
    versions = await versions_col.find({"venue_id": venue_id}).sort("published_at", -1).to_list(50)
    result = []
    for i, v in enumerate(versions):
        v_clean = clean(v)
        v_clean["can_rollback"] = (i == 1)  # Only previous version
        result.append(v_clean)
    return {"versions": result, "total": len(result)}

@app.get("/api/venues/{venue_id}/knowledge/versions/{version_id}")
async def get_version_detail(venue_id: str, version_id: str, user: dict = Depends(get_current_user)):
    version = await versions_col.find_one({"version_id": version_id, "venue_id": venue_id})
    if not version:
        raise HTTPException(404, "版本不存在")

    items = await version_items_col.find({"version_id": version_id}).to_list(500)
    result = clean(version)
    result["knowledge_items"] = [clean(i) for i in items]
    return result

@app.post("/api/venues/{venue_id}/knowledge/versions/{version_id}/rollback")
async def rollback_version(venue_id: str, version_id: str, body: RollbackRequest, user: dict = Depends(get_current_user)):
    target = await versions_col.find_one({"version_id": version_id, "venue_id": venue_id})
    if not target:
        raise HTTPException(404, "版本不存在")

    # Check can_rollback (only previous version for basic plan)
    versions = await versions_col.find({"venue_id": venue_id}).sort("published_at", -1).to_list(50)
    if len(versions) < 2 or versions[1].get("version_id") != version_id:
        raise HTTPException(403, "基礎版僅支援回滾至上一個版本")

    current = versions[0]

    # Restore knowledge from snapshot
    snapshot_items = await version_items_col.find({"version_id": version_id}).to_list(500)

    # Deactivate all current knowledge
    await knowledge_col.update_many(
        {"venue_id": venue_id},
        {"$set": {"is_active": False}}
    )

    # Reactivate snapshot items
    for item in snapshot_items:
        await knowledge_col.update_one(
            {"id": item["knowledge_id"]},
            {"$set": {"is_active": True, "status": "approved"}}
        )

    # Update version flags
    await versions_col.update_many({"venue_id": venue_id}, {"$set": {"is_current": False}})
    await versions_col.update_one({"version_id": version_id}, {"$set": {"is_current": True}})
    await versions_col.update_one(
        {"version_id": current["version_id"]},
        {"$set": {"rolled_back": True, "rolled_back_at": datetime.utcnow().isoformat(), "rollback_reason": body.reason}}
    )

    return {
        "success": True,
        "message": f"已回滾到版本 {target['version_number']}",
        "rollback_info": {
            "from_version": {"version_id": current["version_id"], "version_number": current["version_number"]},
            "to_version": {"version_id": version_id, "version_number": target["version_number"]},
        },
        "current_version": clean(target)
    }

# ============ Admin ============

@app.post("/api/admin/refresh-config")
async def refresh_config(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "權限不足")
    config = await load_config()
    return {"success": True, "keys_loaded": len(config), "message": "設定已從 Notion 重新載入"}

@app.get("/api/managers")
async def get_managers(user: dict = Depends(get_current_user)):
    users = await users_col.find({}).to_list(50)
    return [{"email": u["email"], "name": u["name"], "role": u["role"]} for u in users]


VALID_ROLES = {"admin", "manager"}


class ManagerCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "manager"


class ManagerUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "••••••••"
    return value[:4] + "••••••••" + value[-4:]


def require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(403, "權限不足")


async def ensure_admin_remains(excluding_email: str):
    others = await users_col.count_documents({"role": "admin", "email": {"$ne": excluding_email}})
    if others == 0:
        raise HTTPException(400, "至少需要保留一位管理員")


@app.post("/api/managers")
async def create_manager(req: ManagerCreate, user: dict = Depends(get_current_user)):
    require_admin(user)
    email = req.email.lower()
    if req.role not in VALID_ROLES:
        raise HTTPException(400, "角色不正確")
    if not req.name.strip():
        raise HTTPException(400, "請輸入姓名")
    if await users_col.find_one({"email": email}):
        raise HTTPException(400, "此電子郵件已被使用")
    validate_password_strength(req.password)
    await users_col.insert_one({
        "email": email,
        "name": req.name.strip(),
        "role": req.role,
        "password_hash": hash_password(req.password),
        "token_version": 0,
        "created_at": datetime.utcnow().isoformat(),
    })
    return {"email": email, "name": req.name.strip(), "role": req.role}


@app.put("/api/managers/{email}")
async def update_manager(email: str, req: ManagerUpdate, user: dict = Depends(get_current_user)):
    require_admin(user)
    target = await users_col.find_one({"email": email})
    if not target:
        raise HTTPException(404, "找不到此帳號")

    updates = {"updated_at": datetime.utcnow().isoformat()}
    bump_token = False
    if req.name is not None:
        if not req.name.strip():
            raise HTTPException(400, "請輸入姓名")
        updates["name"] = req.name.strip()
    if req.role is not None and req.role != target["role"]:
        if req.role not in VALID_ROLES:
            raise HTTPException(400, "角色不正確")
        if target["role"] == "admin":
            await ensure_admin_remains(email)
        updates["role"] = req.role
    if req.email is not None and req.email.lower() != email:
        new_email = req.email.lower()
        if await users_col.find_one({"email": new_email}):
            raise HTTPException(400, "此電子郵件已被使用")
        updates["email"] = new_email
        bump_token = True
    if req.password:
        validate_password_strength(req.password)
        updates["password_hash"] = hash_password(req.password)
        bump_token = True

    op = {"$set": updates}
    if bump_token:
        op["$inc"] = {"token_version": 1}
    await users_col.update_one({"email": email}, op)
    updated = await users_col.find_one({"email": updates.get("email", email)})
    return {
        "email": updated["email"], "name": updated["name"], "role": updated["role"],
        "relogin_required": bump_token and email == user["email"],
    }


@app.delete("/api/managers/{email}")
async def delete_manager(email: str, user: dict = Depends(get_current_user)):
    require_admin(user)
    if email == user["email"]:
        raise HTTPException(400, "不能刪除自己的帳號")
    target = await users_col.find_one({"email": email})
    if not target:
        raise HTTPException(404, "找不到此帳號")
    if target["role"] == "admin":
        await ensure_admin_remains(email)
    await users_col.delete_one({"email": email})
    return {"success": True}

# ============ Venue Config (per-venue settings) ============

@app.get("/api/venues/{venue_id}/config")
async def get_venue_config(venue_id: str, user: dict = Depends(get_current_user)):
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    
    config = venue.get("config", {})
    return {
        "venue_id": venue_id,
        "ai_model": config.get("ai_model", "T1"),
        "ai_knowledge_base_url": config.get("ai_knowledge_base_url", ""),
        "greeting_message": config.get("greeting_message", f"歡迎來到{venue['name']}！"),
        "handoff_keywords": config.get("handoff_keywords", ["真人", "客服", "人工", "管家"])
    }

@app.put("/api/venues/{venue_id}/config")
async def update_venue_config(venue_id: str, body: dict, user: dict = Depends(get_current_user)):
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    
    existing = venue.get("config", {})
    updated = {
        "ai_model": body.get("ai_model", existing.get("ai_model", "T1")),
        "ai_knowledge_base_url": body.get("ai_knowledge_base_url", existing.get("ai_knowledge_base_url", "")),
        "greeting_message": body.get("greeting_message", existing.get("greeting_message", "")),
        "handoff_keywords": body.get("handoff_keywords", existing.get("handoff_keywords", ["真人", "客服", "人工", "管家"])),
    }
    
    await venues_col.update_one({"id": venue_id}, {"$set": {"config": updated}})
    return {"success": True, "config": updated}

# ============ LINE Credentials (per-venue) ============

@app.get("/api/venues/{venue_id}/line-credentials")
async def get_line_credentials(venue_id: str, user: dict = Depends(get_current_user)):
    """Get LINE OA credentials for a venue; secrets are masked"""
    require_admin(user)
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")

    creds = venue.get("line_credentials", {})
    return {"credentials": {
        "channel_id": creds.get("channel_id", ""),
        "user_id": creds.get("user_id", ""),
        "channel_access_token": mask_secret(creds.get("channel_access_token", "")),
        "channel_secret": mask_secret(creds.get("channel_secret", "")),
    }, "venue_id": venue_id}

@app.put("/api/venues/{venue_id}/line-credentials")
async def update_line_credentials(venue_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Update LINE OA credentials for a venue"""
    if user.get("role") != "admin":
        raise HTTPException(403, "只有管理員可以修改憑證")
    
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    
    existing = venue.get("line_credentials", {})
    creds = {
        "user_id": body.get("user_id", existing.get("user_id", "")),
        "channel_id": body.get("channel_id", existing.get("channel_id", "")),
        # Secrets are only sent when changed; blank keeps the stored value
        "channel_access_token": body.get("channel_access_token") or existing.get("channel_access_token", ""),
        "channel_secret": body.get("channel_secret") or existing.get("channel_secret", ""),
    }
    
    await venues_col.update_one({"id": venue_id}, {"$set": {"line_credentials": creds}})
    return {"success": True, "message": "LINE OA 憑證已更新"}

# ============ LINE Webhook ============

import hmac
import hashlib
import base64
import httpx
from fastapi import Request

async def get_line_credentials_for_venue(venue_id: str) -> dict:
    """Get LINE credentials for a venue, fallback to global config"""
    venue = await venues_col.find_one({"id": venue_id})
    if venue and venue.get("line_credentials"):
        creds = venue["line_credentials"]
        if creds.get("channel_access_token") and creds.get("channel_secret"):
            return creds
    
    # Fallback to global config from Notion
    config = await get_config()
    return {
        "channel_access_token": config.get("line_channel_access_token", ""),
        "channel_secret": config.get("line_channel_secret", ""),
        "channel_id": config.get("line_channel_id", ""),
        "user_id": "",
    }

def verify_line_signature(body: bytes, signature: str, channel_secret: str) -> bool:
    """Verify LINE webhook signature"""
    if not channel_secret or not signature:
        return False
    hash_val = hmac.new(
        channel_secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).digest()
    expected = base64.b64encode(hash_val).decode("utf-8")
    return hmac.compare_digest(expected, signature)

async def line_reply_message(reply_token: str, messages: list, access_token: str):
    """Send reply to LINE user"""
    if not access_token or not reply_token:
        print("[LINE] Missing access_token or reply_token, skip reply")
        return False
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.line.me/v2/bot/message/reply",
                json={"replyToken": reply_token, "messages": messages},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            if resp.status_code == 200:
                print(f"[LINE] Reply sent successfully")
                return True
            else:
                print(f"[LINE] Reply failed: {resp.status_code} {resp.text}")
                return False
    except Exception as e:
        print(f"[LINE] Reply error: {e}")
        return False

async def line_push_message(user_id: str, messages: list, access_token: str):
    """Push message to LINE user"""
    if not access_token or not user_id:
        print("[LINE] Missing access_token or user_id, skip push")
        return False
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.line.me/v2/bot/message/push",
                json={"to": user_id, "messages": messages},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            if resp.status_code == 200:
                print(f"[LINE] Push sent to {user_id}")
                return True
            else:
                print(f"[LINE] Push failed: {resp.status_code} {resp.text}")
                return False
    except Exception as e:
        print(f"[LINE] Push error: {e}")
        return False

async def line_get_profile(user_id: str, access_token: str) -> dict:
    """Get LINE user profile"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.line.me/v2/bot/profile/{user_id}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"[LINE] Profile fetch error: {e}")
    return {}

@app.post("/api/webhook/{venue_id}")
async def line_webhook(venue_id: str, request: Request):
    """LINE Messaging API Webhook endpoint"""
    body = await request.body()
    signature = request.headers.get("X-Line-Signature", "")
    
    print(f"[LINE Webhook] Received for venue: {venue_id}")
    
    # Get venue credentials
    creds = await get_line_credentials_for_venue(venue_id)
    channel_secret = creds.get("channel_secret", "")
    access_token = creds.get("channel_access_token", "")
    
    # Verify signature (skip if no secret configured - for testing)
    if channel_secret:
        if not verify_line_signature(body, signature, channel_secret):
            print(f"[LINE Webhook] Invalid signature for venue {venue_id}")
            raise HTTPException(403, "Invalid signature")
    else:
        print(f"[LINE Webhook] WARNING: No channel_secret configured for venue {venue_id}, skipping verification")
    
    # Parse events
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON")
    
    events = data.get("events", [])
    print(f"[LINE Webhook] Processing {len(events)} events")
    
    for event in events:
        event_type = event.get("type")
        source = event.get("source", {})
        user_id = source.get("userId", "")
        reply_token = event.get("replyToken", "")
        timestamp = event.get("timestamp", 0)
        
        if event_type == "message":
            message = event.get("message", {})
            msg_type = message.get("type", "")
            msg_text = message.get("text", "")
            
            if msg_type == "text" and msg_text:
                print(f"[LINE Webhook] Message from {user_id}: {msg_text[:50]}...")
                
                # Handle ##reset command
                if msg_text.strip() == "##reset":
                    deleted = await tasks_col.delete_many({
                        "customer_user_id": user_id,
                        "venue_id": venue_id
                    })
                    print(f"[LINE Webhook] Reset: deleted {deleted.deleted_count} tasks for {user_id}")
                    
                    if access_token and reply_token:
                        await line_reply_message(
                            reply_token,
                            [{"type": "text", "text": "對話已重置！所有對話記錄和記憶已清除。\n請重新開始您的對話 😊"}],
                            access_token
                        )
                    continue
                
                # Get user profile
                profile = await line_get_profile(user_id, access_token) if access_token else {}
                display_name = profile.get("displayName", "")
                
                # Preserve existing customer_stage (don't reset payment/confirming back to inquiry)
                existing_stage = "inquiry"
                existing_tasks = await tasks_col.find({
                    "customer_user_id": user_id,
                    "venue_id": venue_id
                }).sort("created_at", -1).to_list(1)
                
                if existing_tasks:
                    prev_stage = existing_tasks[0].get("customer_stage")
                    if prev_stage in ["payment", "confirming"]:
                        existing_stage = prev_stage
                
                # Also preserve customer_info from previous tasks
                existing_info = {}
                if existing_tasks:
                    existing_info = existing_tasks[0].get("customer_info") or {}
                
                # Create task in database
                task_id = await get_next_id("tasks")
                now = datetime.utcnow().isoformat()
                
                customer_info = {
                    **existing_info,
                    "customer_name": display_name or existing_info.get("customer_name", ""),
                    "line_user_id": user_id,
                    "source": "line_webhook",
                }
                
                task_doc = {
                    "task_id": task_id,
                    "venue_id": venue_id,
                    "agent_mode": "ai",
                    "customer_user_id": user_id,
                    "customer_name": display_name or (existing_info.get("customer_name", "")),
                    "customer_message": msg_text,
                    "ai_response": None,
                    "customer_info": customer_info,
                    "customer_stage": existing_stage,
                    "status": "待處理",
                    "assigned_manager": None,
                    "claimed_at": None,
                    "completed_at": None,
                    "created_at": now,
                    "cs_updated_at": now,
                    "notes": None,
                    "line_reply_token": reply_token,
                }
                
                await tasks_col.insert_one(task_doc)
                print(f"[LINE Webhook] Created task {task_id} for {display_name or user_id} (stage={existing_stage})")
                
                # Try AI response using knowledge base
                try:
                    ai_response = await generate_ai_reply(venue_id, user_id, msg_text)
                    if ai_response:
                        # Update task with AI response
                        await tasks_col.update_one(
                            {"task_id": task_id},
                            {"$set": {"ai_response": ai_response, "agent_mode": "ai"}}
                        )
                        
                        # Check if we should send room cards (Flex Message)
                        booking_keywords = ["訂房", "預訂", "要訂", "想訂", "幫我訂", "我要住", "空房", "有房", "可以訂"]
                        should_send_cards = any(kw in msg_text for kw in booking_keywords)
                        
                        if should_send_cards and access_token and reply_token:
                            # Try to build Flex Message with room cards
                            try:
                                flex_msg = await build_room_flex_message(venue_id, user_id, msg_text)
                                if flex_msg:
                                    await line_reply_message(
                                        reply_token,
                                        [{"type": "text", "text": ai_response}, flex_msg],
                                        access_token
                                    )
                                else:
                                    await line_reply_message(reply_token, [{"type": "text", "text": ai_response}], access_token)
                            except Exception as flex_err:
                                print(f"[LINE Webhook] Flex message error: {flex_err}")
                                await line_reply_message(reply_token, [{"type": "text", "text": ai_response}], access_token)
                        elif access_token and reply_token:
                            await line_reply_message(reply_token, [{"type": "text", "text": ai_response}], access_token)
                except Exception as e:
                    print(f"[LINE Webhook] AI reply error: {e}")
            
            elif msg_type in ["image", "video", "audio", "file", "sticker"]:
                # Non-text messages: preserve stage
                existing_stage = "inquiry"
                existing_tasks = await tasks_col.find({
                    "customer_user_id": user_id,
                    "venue_id": venue_id
                }).sort("created_at", -1).to_list(1)
                if existing_tasks:
                    prev_stage = existing_tasks[0].get("customer_stage")
                    if prev_stage in ["payment", "confirming"]:
                        existing_stage = prev_stage
                
                task_id = await get_next_id("tasks")
                now = datetime.utcnow().isoformat()
                
                content_desc = f"[{msg_type}]"
                if msg_type == "sticker":
                    content_desc = f"[貼圖: {message.get('packageId', '')}/{message.get('stickerId', '')}]"
                
                await tasks_col.insert_one({
                    "task_id": task_id,
                    "venue_id": venue_id,
                    "agent_mode": "ai",
                    "customer_user_id": user_id,
                    "customer_name": "",
                    "customer_message": content_desc,
                    "ai_response": None,
                    "customer_info": {"source": "line_webhook"},
                    "customer_stage": existing_stage,
                    "status": "待處理",
                    "assigned_manager": None,
                    "created_at": now,
                    "cs_updated_at": now,
                    "notes": None,
                })
                print(f"[LINE Webhook] Created task {task_id} for {msg_type} message (stage={existing_stage})")
        
        elif event_type == "follow":
            print(f"[LINE Webhook] New follower: {user_id}")
            # Send welcome message
            if access_token and reply_token:
                venue = await venues_col.find_one({"id": venue_id})
                venue_name = venue.get("name", "我們的場域") if venue else "我們的場域"
                welcome_msg = f"歡迎來到{venue_name}！🎉\n有任何問題歡迎直接傳訊息，我會盡快為您服務！"
                await line_reply_message(
                    reply_token,
                    [{"type": "text", "text": welcome_msg}],
                    access_token
                )
        
        elif event_type == "unfollow":
            print(f"[LINE Webhook] Unfollowed: {user_id}")
    
    return {"status": "ok"}

async def build_room_flex_message(venue_id: str, user_id: str, message: str):
    """Build LINE Flex Message with room cards for booking"""
    from pms_client import get_pms_client
    
    try:
        pms = await get_pms_client(venue_id, venues_col)
        
        # Determine dates
        tomorrow = (datetime.utcnow() + timedelta(hours=8, days=1)).strftime("%Y/%m/%d")
        day_after = (datetime.utcnow() + timedelta(hours=8, days=2)).strftime("%Y/%m/%d")
        check_in, check_out = tomorrow, day_after
        
        if "今天" in message or "今晚" in message:
            check_in = (datetime.utcnow() + timedelta(hours=8)).strftime("%Y/%m/%d")
            check_out = (datetime.utcnow() + timedelta(hours=8, days=1)).strftime("%Y/%m/%d")
        elif "後天" in message:
            check_in = (datetime.utcnow() + timedelta(hours=8, days=2)).strftime("%Y/%m/%d")
            check_out = (datetime.utcnow() + timedelta(hours=8, days=3)).strftime("%Y/%m/%d")
        
        result = await pms.search_all(check_in, check_out)
        rooms = pms.parse_rooms_summary(result)
        
        if not rooms:
            return None
        
        # Build booking URL base
        app_url = os.environ.get("APP_URL", "https://manager.lakeze.com")
        
        # Build carousel of room cards (max 10)
        bubbles = []
        for room in rooms[:5]:
            if room["inventory"] <= 0:
                continue
            
            booking_params = (
                f"venue_id={venue_id}&room_code={room['room_code']}&room_name={room['room_name']}"
                f"&rate_name={room['rate_name']}&check_in={check_in}&check_out={check_out}"
                f"&price_before_tax={room['price_before_tax']}&price_after_tax={room['price_after_tax']}"
                f"&currency={room['currency']}&max_occupancy={room['max_occupancy']}"
                f"&line_user_id={user_id}"
            )
            if room['photos']:
                booking_params += f"&room_photo={room['photos'][0]}"
            
            booking_link = f"{app_url}/booking/new?{booking_params}"
            
            bubble = {
                "type": "bubble",
                "size": "kilo",
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {"type": "text", "text": room["room_name"], "weight": "bold", "size": "lg", "color": "#FFFFFF"},
                        {"type": "text", "text": room["rate_name"] or "標準房價", "size": "xs", "color": "#00B4D8", "margin": "sm"},
                        {"type": "separator", "margin": "lg", "color": "#27272A"},
                        {"type": "box", "layout": "horizontal", "margin": "lg", "contents": [
                            {"type": "text", "text": "價格", "size": "sm", "color": "#8B949E", "flex": 1},
                            {"type": "text", "text": f"NT$ {room['price_after_tax']:,.0f}", "size": "lg", "weight": "bold", "color": "#FF6B35", "align": "end", "flex": 2}
                        ]},
                        {"type": "box", "layout": "horizontal", "margin": "sm", "contents": [
                            {"type": "text", "text": "庫存", "size": "sm", "color": "#8B949E", "flex": 1},
                            {"type": "text", "text": f"剩 {room['inventory']} 間", "size": "sm", "color": "#22C55E", "align": "end", "flex": 2}
                        ]},
                        {"type": "box", "layout": "horizontal", "margin": "sm", "contents": [
                            {"type": "text", "text": "日期", "size": "sm", "color": "#8B949E", "flex": 1},
                            {"type": "text", "text": f"{check_in} ~ {check_out}", "size": "xs", "color": "#FFFFFF", "align": "end", "flex": 2}
                        ]},
                    ],
                    "backgroundColor": "#18181B",
                    "paddingAll": "16px"
                },
                "footer": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "button",
                            "action": {"type": "uri", "label": "立即預訂", "uri": booking_link},
                            "style": "primary",
                            "color": "#FF6B35",
                            "height": "md"
                        }
                    ],
                    "backgroundColor": "#18181B",
                    "paddingAll": "12px"
                }
            }
            bubbles.append(bubble)
        
        if not bubbles:
            return None
        
        if len(bubbles) == 1:
            return {"type": "flex", "altText": "查看可訂房型", "contents": bubbles[0]}
        
        return {
            "type": "flex",
            "altText": f"查看 {len(bubbles)} 個可訂房型",
            "contents": {"type": "carousel", "contents": bubbles}
        }
    
    except Exception as e:
        print(f"[Flex] Error building room cards: {e}")
        return None

async def generate_ai_reply(venue_id: str, user_id: str, message: str) -> str:
    """Generate AI reply based on venue knowledge base + PMS real-time data"""
    from pms_client import get_pms_client
    import re as re_module
    
    try:
        api_key = await get_config_value("openai_api_key")
        if not api_key:
            print("[AI Reply] No OpenAI API key configured")
            return ""
        
        # Get venue knowledge
        knowledge_items = await knowledge_col.find({
            "venue_id": venue_id,
            "is_active": True
        }).to_list(50)
        
        # Build knowledge context
        knowledge_text = "\n".join([
            f"【{k.get('title', '')}】{k.get('content', '')}" 
            for k in knowledge_items
        ]) if knowledge_items else "（尚無知識庫資料）"
        
        # Check if user is asking about availability/pricing/booking
        availability_keywords = ["空房", "有房", "房間", "價格", "多少錢", "住", "訂房", "預訂", "庫存", 
                                  "可以訂", "還有", "幾間", "房型", "包棟", "雙人", "四人", "費用",
                                  "明天", "後天", "週末", "今天", "下週", "空位"]
        
        msg_lower = message.lower()
        needs_pms = any(kw in msg_lower for kw in availability_keywords)
        
        pms_context = ""
        if needs_pms:
            try:
                pms = await get_pms_client(venue_id, venues_col)
                
                # Date parsing with natural language support
                today = datetime.utcnow() + timedelta(hours=8)
                check_in = (today + timedelta(days=1)).strftime("%Y/%m/%d")
                check_out = (today + timedelta(days=2)).strftime("%Y/%m/%d")
                
                # Extract specific dates from message
                # YYYY/MM/DD or YYYY-MM-DD
                m = re_module.search(r'(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})', message)
                if m:
                    check_in = f"{m.group(1)}/{m.group(2).zfill(2)}/{m.group(3).zfill(2)}"
                    ci = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
                    check_out = (ci + timedelta(days=1)).strftime("%Y/%m/%d")
                else:
                    # MM/DD or M/D
                    m = re_module.search(r'(\d{1,2})[/.-](\d{1,2})', message)
                    if m:
                        month, day = int(m.group(1)), int(m.group(2))
                        if 1 <= month <= 12 and 1 <= day <= 31:
                            ci = today.replace(month=month, day=day)
                            if ci < today:
                                ci = ci.replace(year=ci.year + 1)
                            check_in = ci.strftime("%Y/%m/%d")
                            check_out = (ci + timedelta(days=1)).strftime("%Y/%m/%d")
                
                # Natural language dates
                if "今天" in message or "今晚" in message:
                    check_in = today.strftime("%Y/%m/%d")
                    check_out = (today + timedelta(days=1)).strftime("%Y/%m/%d")
                elif "明天" in message:
                    check_in = (today + timedelta(days=1)).strftime("%Y/%m/%d")
                    check_out = (today + timedelta(days=2)).strftime("%Y/%m/%d")
                elif "後天" in message:
                    check_in = (today + timedelta(days=2)).strftime("%Y/%m/%d")
                    check_out = (today + timedelta(days=3)).strftime("%Y/%m/%d")
                elif "週末" in message or "周末" in message:
                    days_ahead = 5 - today.weekday()
                    if days_ahead <= 0:
                        days_ahead += 7
                    saturday = today + timedelta(days=days_ahead)
                    check_in = saturday.strftime("%Y/%m/%d")
                    check_out = (saturday + timedelta(days=1)).strftime("%Y/%m/%d")
                
                # "下個月X號" or "下月X日"
                m = re_module.search(r'下個?月\s*(\d{1,2})[號日]?', message)
                if m:
                    day = int(m.group(1))
                    next_month = today.month + 1
                    year = today.year
                    if next_month > 12:
                        next_month = 1
                        year += 1
                    try:
                        ci = datetime(year, next_month, day)
                        check_in = ci.strftime("%Y/%m/%d")
                        check_out = (ci + timedelta(days=1)).strftime("%Y/%m/%d")
                    except ValueError:
                        pass
                
                # "這個月X號" or "本月X日"  
                m = re_module.search(r'(?:這個?月|本月)\s*(\d{1,2})[號日]?', message)
                if m:
                    day = int(m.group(1))
                    try:
                        ci = today.replace(day=day)
                        if ci < today:
                            ci = ci.replace(month=ci.month + 1) if ci.month < 12 else ci.replace(year=ci.year + 1, month=1)
                        check_in = ci.strftime("%Y/%m/%d")
                        check_out = (ci + timedelta(days=1)).strftime("%Y/%m/%d")
                    except ValueError:
                        pass
                
                # "X月X號/日"
                m = re_module.search(r'(\d{1,2})月\s*(\d{1,2})[號日]?', message)
                if m:
                    month, day = int(m.group(1)), int(m.group(2))
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        try:
                            ci = datetime(today.year, month, day)
                            if ci < today:
                                ci = ci.replace(year=ci.year + 1)
                            check_in = ci.strftime("%Y/%m/%d")
                            check_out = (ci + timedelta(days=1)).strftime("%Y/%m/%d")
                        except ValueError:
                            pass
                
                # "X號" or "X日" (assume current or next month)
                m = re_module.search(r'(?<!\d)(\d{1,2})[號日]', message)
                if m and not re_module.search(r'\d月', message) and "下" not in message:
                    day = int(m.group(1))
                    if 1 <= day <= 31:
                        try:
                            ci = today.replace(day=day)
                            if ci < today:
                                next_m = ci.month + 1
                                y = ci.year
                                if next_m > 12: next_m, y = 1, y + 1
                                ci = ci.replace(year=y, month=next_m)
                            check_in = ci.strftime("%Y/%m/%d")
                            check_out = (ci + timedelta(days=1)).strftime("%Y/%m/%d")
                        except ValueError:
                            pass
                
                # Query PMS
                result = await pms.search_all(check_in, check_out)
                rooms = pms.parse_rooms_summary(result)
                
                if rooms:
                    pms_context = f"\n\n【即時房況查詢結果】（查詢日期：{check_in} ~ {check_out}）\n"
                    pms_context += pms.format_for_ai(rooms)
                    print(f"[AI Reply] PMS data: {len(rooms)} rooms for {check_in}~{check_out}")
                else:
                    pms_context = f"\n\n【即時房況】查詢 {check_in} ~ {check_out}：目前查無可用房型。"
                    
            except Exception as pms_err:
                print(f"[AI Reply] PMS query error: {pms_err}")
                pms_context = "\n\n（PMS 系統暫時無法查詢，請稍後再試或聯繫管家）"
        
        # Get recent conversation history
        recent_tasks = await tasks_col.find({
            "customer_user_id": user_id,
            "venue_id": venue_id
        }).sort("created_at", -1).to_list(10)
        
        conversation_history = []
        for t in reversed(recent_tasks):
            if t.get("customer_message"):
                conversation_history.append({"role": "user", "content": t["customer_message"]})
            if t.get("ai_response"):
                conversation_history.append({"role": "assistant", "content": t["ai_response"]})
        
        # Add current message
        conversation_history.append({"role": "user", "content": message})
        
        # Get venue info
        venue = await venues_col.find_one({"id": venue_id})
        venue_name = venue.get("name", "場域") if venue else "場域"
        
        system_prompt = f"""你是「{venue_name}」的 AI 銷售助手，透過 LINE 與客戶對話。

你的知識庫：
{knowledge_text[:3000]}
{pms_context}

對話原則：
- 友善、專業、簡潔
- 當客戶詢問空房、價格時，使用上方【即時房況查詢結果】的真實數據回覆
- 回覆時把重要資訊（房型、價格、庫存）清楚列出
- 如果有訂房連結，告知客戶可以點擊連結直接訂房
- 如果客戶有明確訂房意願，引導他使用訂房連結或提供：姓名、電話、日期、人數
- 如果遇到無法回答的問題，告知會請管家協助
- 回覆使用繁體中文
- 不要使用 Markdown 格式（不要用 ** # - 等符號），直接用純文字和換行排版
- 回覆控制在 300 字以內
- 價格用 NT$ 或 $ 表示，加上千分位逗號"""

        client_ai = openai.AsyncOpenAI(api_key=api_key)
        response = await client_ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                *conversation_history
            ],
            temperature=0.7,
            max_tokens=600,
        )
        
        reply = response.choices[0].message.content.strip()
        print(f"[AI Reply] Generated for {venue_id}: {reply[:50]}...")
        return reply
        
    except Exception as e:
        print(f"[AI Reply] Error: {e}")
        return ""

# ============ Bookings ============

class BookingCreate(BaseModel):
    venue_id: str
    room_code: str
    room_name: str
    rate_name: Optional[str] = ""
    check_in: str
    check_out: str
    price_before_tax: float
    price_after_tax: float
    currency: str = "TWD"
    max_occupancy: int = 2
    guest_name: Optional[str] = ""
    guest_phone: Optional[str] = ""
    guest_email: Optional[str] = ""
    num_adults: int = 2
    num_children: int = 0
    special_requests: Optional[str] = ""
    line_user_id: Optional[str] = ""
    booking_url: Optional[str] = ""
    room_photo: Optional[str] = ""

@app.post("/api/bookings")
async def create_booking(body: BookingCreate):
    """Create a new booking (public - no auth required, called from booking page)"""
    booking_id = str(uuid.uuid4())[:12]
    now = datetime.utcnow().isoformat()
    
    doc = {
        "booking_id": booking_id,
        "venue_id": body.venue_id,
        "room_code": body.room_code,
        "room_name": body.room_name,
        "rate_name": body.rate_name,
        "check_in": body.check_in,
        "check_out": body.check_out,
        "price_before_tax": body.price_before_tax,
        "price_after_tax": body.price_after_tax,
        "currency": body.currency,
        "max_occupancy": body.max_occupancy,
        "guest_name": body.guest_name,
        "guest_phone": body.guest_phone,
        "guest_email": body.guest_email,
        "num_adults": body.num_adults,
        "num_children": body.num_children,
        "special_requests": body.special_requests,
        "line_user_id": body.line_user_id,
        "booking_url": body.booking_url,
        "room_photo": body.room_photo,
        "status": "pending",  # pending → paid → confirmed → cancelled
        "payment_status": "unpaid",  # unpaid → processing → paid → refunded
        "payment_method": None,
        "payment_amount": None,
        "payment_at": None,
        "pms_synced": False,
        "pms_confirmation_id": None,
        "created_at": now,
        "updated_at": now,
    }
    
    await bookings_col.insert_one(doc)
    print(f"[Booking] Created {booking_id} for {body.venue_id} / {body.room_name}")
    return {"success": True, "booking_id": booking_id, "booking": clean(doc)}

@app.get("/api/bookings/{booking_id}")
async def get_booking(booking_id: str):
    """Get booking detail (public - for booking page)"""
    booking = await bookings_col.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(404, "訂單不存在")
    
    # Get venue info
    venue = await venues_col.find_one({"id": booking["venue_id"]})
    venue_info = {"name": venue["name"], "avatar_url": venue.get("avatar_url", "")} if venue else {}
    
    result = clean(booking)
    result["venue_info"] = venue_info
    return result

@app.put("/api/bookings/{booking_id}/guest-info")
async def update_booking_guest(booking_id: str, body: dict):
    """Update guest info on booking (public - from booking page)"""
    booking = await bookings_col.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(404, "訂單不存在")
    if booking["status"] != "pending":
        raise HTTPException(400, "此訂單已無法修改")
    
    update = {}
    for field in ["guest_name", "guest_phone", "guest_email", "num_adults", "num_children", "special_requests"]:
        if field in body:
            update[field] = body[field]
    update["updated_at"] = datetime.utcnow().isoformat()
    
    await bookings_col.update_one({"booking_id": booking_id}, {"$set": update})
    return {"success": True}

@app.post("/api/bookings/{booking_id}/pay")
async def pay_booking(booking_id: str, body: dict = None):
    """Process mock payment for a booking"""
    booking = await bookings_col.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(404, "訂單不存在")
    if booking["payment_status"] == "paid":
        raise HTTPException(400, "此訂單已付款")
    
    now = datetime.utcnow().isoformat()
    
    # Mock payment processing
    payment_method = (body or {}).get("payment_method", "credit_card")
    
    await bookings_col.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "status": "paid",
            "payment_status": "paid",
            "payment_method": payment_method,
            "payment_amount": booking["price_after_tax"],
            "payment_at": now,
            "updated_at": now,
        }}
    )
    
    # Notify venue via LINE (if applicable)
    venue_id = booking["venue_id"]
    print(f"[Booking] Payment confirmed: {booking_id} / ${booking['price_after_tax']}")
    
    # Send LINE notification to customer
    if booking.get("line_user_id"):
        creds = await get_line_credentials_for_venue(venue_id)
        access_token = creds.get("channel_access_token", "")
        if access_token:
            venue = await venues_col.find_one({"id": venue_id})
            venue_name = venue.get("name", "") if venue else ""
            confirm_msg = (
                f"🎉 訂房確認成功！\n\n"
                f"📍 {venue_name}\n"
                f"🏠 {booking['room_name']}\n"
                f"📅 {booking['check_in']} → {booking['check_out']}\n"
                f"👤 {booking.get('guest_name', '')}\n"
                f"💰 NT$ {booking['price_after_tax']:,.0f}\n\n"
                f"訂單編號：{booking_id}\n"
                f"感謝您的預訂！如有問題請直接傳訊息給我們 😊"
            )
            await line_push_message(
                booking["line_user_id"],
                [{"type": "text", "text": confirm_msg}],
                access_token
            )
    
    return {"success": True, "booking_id": booking_id, "status": "paid"}

@app.get("/api/venues/{venue_id}/bookings")
async def get_venue_bookings(venue_id: str, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all bookings for a venue (admin)"""
    query = {"venue_id": venue_id}
    if status and status != "all":
        query["status"] = status
    
    bookings = await bookings_col.find(query).sort("created_at", -1).to_list(200)
    
    # Stats
    all_bookings = await bookings_col.find({"venue_id": venue_id}).to_list(500)
    stats = {
        "total": len(all_bookings),
        "pending": sum(1 for b in all_bookings if b["status"] == "pending"),
        "paid": sum(1 for b in all_bookings if b["status"] == "paid"),
        "confirmed": sum(1 for b in all_bookings if b["status"] == "confirmed"),
        "cancelled": sum(1 for b in all_bookings if b["status"] == "cancelled"),
        "total_revenue": sum(b.get("payment_amount", 0) or 0 for b in all_bookings if b["payment_status"] == "paid"),
    }
    
    return {"bookings": [clean(b) for b in bookings], "stats": stats}

@app.put("/api/venues/{venue_id}/bookings/{booking_id}/confirm")
async def confirm_booking(venue_id: str, booking_id: str, user: dict = Depends(get_current_user)):
    """Venue confirms a paid booking"""
    result = await bookings_col.update_one(
        {"booking_id": booking_id, "venue_id": venue_id, "status": "paid"},
        {"$set": {"status": "confirmed", "updated_at": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "訂單不存在或狀態不符")
    return {"success": True}

@app.put("/api/venues/{venue_id}/bookings/{booking_id}/cancel")
async def cancel_booking(venue_id: str, booking_id: str, user: dict = Depends(get_current_user)):
    """Cancel a booking"""
    result = await bookings_col.update_one(
        {"booking_id": booking_id, "venue_id": venue_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "訂單不存在")
    return {"success": True}

# ============ PMS API Endpoints ============

@app.get("/api/venues/{venue_id}/pms/search")
async def pms_search(venue_id: str, check_in: str, check_out: str, user: dict = Depends(get_current_user)):
    """Search PMS for room availability"""
    from pms_client import get_pms_client
    
    pms = await get_pms_client(venue_id, venues_col)
    result = await pms.search_all(check_in, check_out)
    rooms = pms.parse_rooms_summary(result)
    
    return {
        "success": result.get("Status", False),
        "message": result.get("Message", ""),
        "rooms": rooms,
        "check_in": check_in,
        "check_out": check_out,
        "is_mock": pms.use_mock
    }

@app.get("/api/venues/{venue_id}/pms/config")
async def get_pms_config(venue_id: str, user: dict = Depends(get_current_user)):
    """Get PMS configuration for a venue"""
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    
    config = venue.get("pms_config", {})
    # Don't expose password
    safe_config = {
        "provider": config.get("provider", ""),
        "cid_code": config.get("cid_code", ""),
        "has_credentials": bool(config.get("account_id") and config.get("password")),
        "use_production": config.get("use_production", False),
        "uat_url": config.get("uat_url", PMS_UAT_URL),
        "prod_url": config.get("prod_url", PMS_PROD_URL),
    }
    return {"config": safe_config, "venue_id": venue_id}

@app.put("/api/venues/{venue_id}/pms/config")
async def update_pms_config(venue_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Update PMS configuration for a venue"""
    if user.get("role") != "admin":
        raise HTTPException(403, "只有管理員可以修改 PMS 設定")
    
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    
    existing = venue.get("pms_config", {})
    updated = {
        **existing,
        "provider": body.get("provider", existing.get("provider", "travelmap")),
        "uat_url": body.get("uat_url", existing.get("uat_url", PMS_UAT_URL)),
        "prod_url": body.get("prod_url", existing.get("prod_url", PMS_PROD_URL)),
        "cid_code": body.get("cid_code", existing.get("cid_code", "LakezeEvent")),
        "account_id": body.get("account_id", existing.get("account_id", "")),
        "password": body.get("password") or existing.get("password", ""),
        "use_production": body.get("use_production", existing.get("use_production", False)),
    }
    
    await venues_col.update_one({"id": venue_id}, {"$set": {"pms_config": updated}})
    return {"success": True, "message": "PMS 設定已更新"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
