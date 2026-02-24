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
    version_items_col, get_next_id, init_indexes
)
from config_loader import load_config, get_config, get_config_value
from migrate import migrate

app = FastAPI(title="Lakeze 多場域 AI 管家協作平台")

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET:
    # Generate a deterministic secret from MONGO_URL for production environments
    # that don't explicitly set JWT_SECRET
    import hashlib
    mongo_url = os.environ.get("MONGO_URL", "default-fallback-key")
    JWT_SECRET = hashlib.sha256(f"lakeze-jwt-{mongo_url}".encode()).hexdigest()
    print("[Config] JWT_SECRET auto-generated from MONGO_URL (set JWT_SECRET env var for explicit control)")
JWT_ALGORITHM = "HS256"

# ============ Startup ============

@app.on_event("startup")
async def startup():
    print("[Server] Starting up...")
    try:
        await init_indexes()
    except Exception as e:
        print(f"[Server] Index creation skipped: {e}")
    try:
        await migrate()
    except Exception as e:
        print(f"[Server] Migration skipped: {e}")
    try:
        await load_config()
    except Exception as e:
        print(f"[Server] Config loading skipped: {e}")
    print("[Server] Ready!")

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

def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24),
        "type": "access",
        "fresh": False,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


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
        return {"email": user["email"], "name": user["name"], "role": user["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已過期")
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
    return {"status": "healthy", "service": "lakeze-backend", "db": "mongodb"}

@app.get("/api/")
async def api_root():
    return {"message": "Lakeze 多場域 AI 管家協作平台 API", "status": "running", "backend": "mongodb"}

@app.get("/")
async def root():
    return {"message": "Lakeze API", "status": "running"}

# ============ Auth ============

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = await users_col.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=401, detail="登入失敗，請檢查帳號密碼")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="登入失敗，請檢查帳號密碼")

    token = create_token(user["email"])
    return {
        "access_token": token,
        "user": {"email": user["email"], "name": user["name"], "role": user["role"]}
    }

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

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

    # TODO: Send LINE message to customer via LINE Messaging API (Step 2)
    customer_uid = task.get("customer_user_id")

    await tasks_col.update_one(
        {"task_id": task_id},
        {"$set": {
            "status": "已處理",
            "completed_at": datetime.utcnow().isoformat(),
            "notes": body.message
        }}
    )

    return {"success": True, "message": "回覆已發送", "task_id": task_id}

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

# ============ Venue Config (compatibility) ============

@app.get("/api/venues/{venue_id}/config")
async def get_venue_config(venue_id: str, user: dict = Depends(get_current_user)):
    venue = await venues_col.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, "場域不存在")
    return {
        "venue_id": venue_id,
        "ai_model": "gpt-4o-mini",
        "ai_knowledge_base_url": "",
        "greeting_message": f"歡迎來到{venue['name']}！",
        "handoff_keywords": ["真人", "客服", "人工", "管家"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
