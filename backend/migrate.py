"""Data migration: Import seed data from Manus backend export"""
import json
import os
import bcrypt
from datetime import datetime
from database import (
    db, users_col, venues_col, tasks_col, knowledge_col,
    batches_col, counters_col, init_indexes, get_next_id
)

SEED_FILE = os.path.join(os.path.dirname(__file__), "seed_data.json")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def is_migrated() -> bool:
    """Check if data has been migrated already"""
    return await users_col.count_documents({}) > 0 or await venues_col.count_documents({}) > 0


async def ensure_initial_admin():
    """Create the first admin account from INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD
    when the database has no users. Passwords are never stored in the repo."""
    if await users_col.count_documents({}) > 0:
        return
    email = os.environ.get("INITIAL_ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("INITIAL_ADMIN_PASSWORD", "")
    if not email or not password:
        print("[Users] No users and INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD not set; skipping")
        return
    await users_col.insert_one({
        "email": email,
        "name": os.environ.get("INITIAL_ADMIN_NAME", "Admin"),
        "password_hash": hash_password(password),
        "role": "admin",
        "token_version": 0,
        "created_at": datetime.utcnow().isoformat()
    })
    print(f"[Users] Created initial admin: {email}")


async def ensure_default_venues():
    """Ensure required venues exist on every startup.
    Creates venues with LINE/PMS config if they don't exist."""
    
    # Ensure sensan_inn
    if not await venues_col.find_one({"id": "sensan_inn"}):
        await venues_col.insert_one({
            "id": "sensan_inn",
            "name": "森山寫照",
            "description": "",
            "avatar_url": "",
            "created_at": datetime.utcnow().isoformat(),
        })
        print("[Venues] Created: 森山寫照")
    
    # Ensure tiansong_inn. LINE / PMS credentials are entered in the settings UI and
    # stored in the database; they are never kept in source code.
    if not await venues_col.find_one({"id": "tiansong_inn"}):
        await venues_col.insert_one({
            "id": "tiansong_inn",
            "name": "天送幸福和苑",
            "description": "PMS 串接測試場域",
            "avatar_url": "",
            "created_at": datetime.utcnow().isoformat(),
            "config": {
                "ai_model": "T1",
                "greeting_message": "歡迎來到天送幸福和苑！",
                "handoff_keywords": ["真人", "客服", "人工", "管家"]
            },
        })
        print("[Venues] Created: 天送幸福和苑")
    else:
        await venues_col.update_one(
            {"id": "tiansong_inn", "config": {"$exists": False}},
            {"$set": {"config": {"ai_model": "T1", "greeting_message": "歡迎來到天送幸福和苑！", "handoff_keywords": ["真人", "客服", "人工", "管家"]}}}
        )
        print("[Venues] 天送幸福和苑 verified")

    # Seed basic knowledge for tiansong_inn if empty
    knowledge_count = await knowledge_col.count_documents({"venue_id": "tiansong_inn"})
    if knowledge_count == 0:
        now = datetime.utcnow().isoformat()
        base_knowledge = [
            {"title": "住宿概要", "content": "天送幸福和苑為模擬訂房測試場域，提供多種房型選擇。可透過 PMS 系統即時查詢空房與價格。", "category": "service"},
            {"title": "訂房方式", "content": "客戶可直接在 LINE 對話中詢問空房，AI 會即時查詢 PMS 系統並提供可訂房型、價格和庫存。點擊訂房按鈕即可進入訂房頁面完成預訂。", "category": "service"},
            {"title": "入住時間", "content": "入住時間為下午 15:00 後，退房時間為隔日上午 11:00 前。", "category": "rules"},
            {"title": "付款方式", "content": "目前支援線上信用卡付款。訂房完成後會透過 LINE 發送訂房確認資訊。", "category": "pricing"},
            {"title": "取消政策", "content": "入住前 3 天可免費取消。入住前 1-2 天取消收取 50% 費用。入住當天取消或未到不予退款。", "category": "rules"},
            {"title": "加人費用", "content": "成人加人費用依房型而異，兒童（8歲以下）另有優惠價格。詳細費用會在查詢房型時一併顯示。", "category": "pricing"},
        ]
        for i, k in enumerate(base_knowledge):
            kid = await get_next_id("knowledge")
            await knowledge_col.insert_one({
                "id": kid,
                "venue_id": "tiansong_inn",
                "title": k["title"],
                "content": k["content"],
                "category": k["category"],
                "source_type": "manual",
                "status": "approved",
                "is_active": True,
                "ai_confidence": None,
                "batch_id": None,
                "created_at": now,
                "updated_at": now,
            })
        print(f"[Venues] Seeded {len(base_knowledge)} knowledge items for 天送幸福和苑")
    
    # Clean up old test venues
    deleted = await venues_col.delete_many({
        "id": {"$nin": ["sensan_inn", "tiansong_inn"]},
        "name": {"$in": ["新場域", "測試場域"]}
    })
    if deleted.deleted_count > 0:
        print(f"[Venues] Cleaned up {deleted.deleted_count} test venues")


async def migrate():
    """Run full data migration from seed_data.json"""
    if await is_migrated():
        print("[Migration] Data already exists, skipping")
        await ensure_default_venues()
        return

    if not os.path.exists(SEED_FILE):
        print(f"[Migration] Seed file not found: {SEED_FILE}")
        return

    print("[Migration] Starting data migration...")
    try:
        await init_indexes()
    except Exception as e:
        print(f"[Migration] Index creation warning: {e}")

    with open(SEED_FILE, "r") as f:
        data = json.load(f)

    # --- Users ---
    await ensure_initial_admin()

    # --- Venues ---
    venues = data.get("venues", {}).get("venues", [])
    for v in venues:
        await venues_col.insert_one({
            "_id": v["id"],
            "id": v["id"],
            "name": v["name"],
            "description": v.get("description", ""),
            "created_at": datetime.utcnow().isoformat()
        })
    print(f"  Migrated {len(venues)} venues")

    # --- Tasks ---
    tasks = data.get("tasks", {}).get("tasks", [])
    max_task_id = 0
    for t in tasks:
        tid = t.get("task_id", 0)
        if tid > max_task_id:
            max_task_id = tid
        await tasks_col.update_one(
            {"task_id": tid},
            {"$set": {
                "task_id": tid,
                "venue_id": t.get("venue_id"),
                "agent_mode": t.get("agent_mode"),
                "customer_user_id": t.get("customer_user_id"),
                "customer_name": t.get("customer_name"),
                "customer_message": t.get("customer_message"),
                "ai_response": t.get("ai_response"),
                "customer_info": t.get("customer_info", {}),
                "customer_stage": t.get("customer_stage"),
                "status": t.get("status"),
                "assigned_manager": t.get("assigned_manager"),
                "claimed_at": t.get("claimed_at"),
                "completed_at": t.get("completed_at"),
                "created_at": t.get("created_at"),
                "cs_updated_at": t.get("cs_updated_at"),
                "notes": t.get("notes"),
            }},
            upsert=True
        )
    # Set counter
    await counters_col.update_one(
        {"_id": "tasks"},
        {"$set": {"seq": max_task_id}},
        upsert=True
    )
    print(f"  Migrated {len(tasks)} tasks (max_id={max_task_id})")

    # --- Knowledge ---
    knowledge = data.get("knowledge", {}).get("knowledge", [])
    max_k_id = 0
    for k in knowledge:
        kid = k.get("id", 0)
        if kid > max_k_id:
            max_k_id = kid
        await knowledge_col.update_one(
            {"id": kid},
            {"$set": {
                "id": kid,
                "venue_id": k.get("venue_id"),
                "title": k.get("title"),
                "content": k.get("content"),
                "category": k.get("category"),
                "source_type": k.get("source_type"),
                "status": k.get("status"),
                "is_active": k.get("is_active", True),
                "ai_confidence": k.get("ai_confidence"),
                "batch_id": k.get("batch_id"),
                "created_at": k.get("created_at"),
                "updated_at": k.get("updated_at"),
            }},
            upsert=True
        )
    await counters_col.update_one(
        {"_id": "knowledge"},
        {"$set": {"seq": max_k_id}},
        upsert=True
    )
    print(f"  Migrated {len(knowledge)} knowledge items (max_id={max_k_id})")

    # --- Batches ---
    batches = data.get("batches", {}).get("batches", [])
    max_b_id = 0
    for b in batches:
        bid = b.get("id", 0)
        if bid > max_b_id:
            max_b_id = bid
        await batches_col.update_one(
            {"id": bid},
            {"$set": {
                "id": bid,
                "venue_id": b.get("venue_id"),
                "source_type": b.get("source_type"),
                "status": b.get("status"),
                "total_extracted": b.get("total_extracted", 0),
                "total_approved": b.get("total_approved", 0),
                "pending_count": b.get("pending_count", 0),
                "rejected_count": b.get("rejected_count", 0),
                "created_by": b.get("created_by"),
                "error_message": b.get("error_message"),
                "created_at": b.get("created_at"),
                "completed_at": b.get("completed_at"),
            }},
            upsert=True
        )
    await counters_col.update_one(
        {"_id": "knowledge_batches"},
        {"$set": {"seq": max_b_id}},
        upsert=True
    )
    print(f"  Migrated {len(batches)} batches (max_id={max_b_id})")

    print("[Migration] Complete!")
