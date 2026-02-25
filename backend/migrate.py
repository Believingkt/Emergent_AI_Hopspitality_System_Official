"""Data migration: Import seed data from Manus backend export"""
import json
import os
import bcrypt
from datetime import datetime
from database import (
    db, users_col, venues_col, tasks_col, knowledge_col,
    batches_col, counters_col, init_indexes
)

SEED_FILE = os.path.join(os.path.dirname(__file__), "seed_data.json")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def is_migrated() -> bool:
    """Check if data has been migrated already"""
    count = await users_col.count_documents({})
    return count > 0


async def ensure_default_passwords():
    """Ensure default user accounts have correct password hashes.
    This runs on every startup to fix any corrupted password hashes."""
    
    if not os.path.exists(SEED_FILE):
        return
    
    with open(SEED_FILE, "r") as f:
        data = json.load(f)
    
    users = data.get("users", [])
    for u in users:
        email = u["email"]
        password = u["password"]
        
        user = await users_col.find_one({"email": email})
        if not user:
            # User doesn't exist, create it
            await users_col.insert_one({
                "email": email,
                "name": u["name"],
                "password_hash": hash_password(password),
                "role": u["role"],
                "created_at": datetime.utcnow().isoformat()
            })
            print(f"[Password] Created user: {email}")
            continue
        
        # Verify current password hash works
        current_hash = user.get("password_hash", "")
        try:
            if current_hash and bcrypt.checkpw(password.encode(), current_hash.encode()):
                continue  # Password is correct, skip
        except Exception:
            pass  # Hash is corrupted, will be reset below
        
        # Password hash is missing or corrupted, reset it
        new_hash = hash_password(password)
        await users_col.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash}}
        )
        print(f"[Password] Fixed password hash for: {email}")



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
    
    # Ensure tiansong_inn with LINE and PMS config
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
            "line_credentials": {
                "channel_id": "2009222522",
                "channel_secret": "d1c0551f0fc6678f480e2af97df4d085",
                "user_id": "U7dc6caaff2acf64c01ededc29bcd9da4",
                "channel_access_token": "b3v0LtGT8z6qGQ3htV93TFJHfzADOIVczVzNyE3X8rH/udlGgA+s51KGGJPoZPSmVU1YtQmOUTJHwyOaXjplZsB5X9FweUR8GX/mHz8Dp/A9tKdqLdFlCk2WBf6J1Kbg/fQjROb+NokYI1ydplO3ZgdB04t89/1O/w1cDnyilFU="
            },
            "pms_config": {
                "provider": "travelmap",
                "uat_url": "https://booking.travelmap.com.tw/api/CIDDistributor.ashx",
                "prod_url": "https://booking.taiwantravelmap.com/api/CIDDistributor.ashx",
                "cid_code": "LakezeEvent",
                "account_id": "LakezeEvent",
                "password": "^yEsYWt4uU",
                "proxy_url": "http://139.59.248.231:8080",
                "proxy_api_key": "lakeze-pms-proxy-2025",
                "use_production": False
            }
        })
        print("[Venues] Created: 天送幸福和苑 (with LINE + PMS config)")
    else:
        print("[Venues] 天送幸福和苑 already exists")
    
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
        await ensure_default_passwords()
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
    users = data.get("users", [])
    for u in users:
        await users_col.insert_one({
            "_id": u["email"],
            "email": u["email"],
            "name": u["name"],
            "password_hash": hash_password(u["password"]),
            "role": u["role"],
            "created_at": datetime.utcnow().isoformat()
        })
    print(f"  Migrated {len(users)} users")

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
