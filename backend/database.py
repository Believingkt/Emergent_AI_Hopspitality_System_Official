"""MongoDB database connection and helpers"""
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

def _resolve_db_name(url):
    """Determine the correct database name from MONGO_URL.
    
    Priority:
    1. Database name from URL path (e.g., mongodb+srv://user:pass@host/DBNAME)
    2. appName parameter AS-IS (no transformation)
    3. Username from URL AS-IS (for Atlas)
    4. DB_NAME environment variable
    5. Default fallback
    """
    
    # Method 1: Extract DB name from URL path (mongodb://host/DATABASE?params)
    match = re.search(r'mongodb(?:\+srv)?://[^/]+/([^?/]+)', url)
    if match and match.group(1).strip():
        db_name = match.group(1).strip()
        print(f"[Database] Using DB from URL path: {db_name}")
        return db_name
    
    # Method 2: Use appName parameter AS-IS (common in Emergent Atlas URLs)
    match = re.search(r'appName=([^&]+)', url)
    if match and match.group(1).strip():
        db_name = match.group(1).strip()
        print(f"[Database] Using DB from appName: {db_name}")
        return db_name
    
    # Method 3: Use username from Atlas URL AS-IS
    if "mongodb.net" in url or "mongodb+srv" in url:
        match = re.search(r'mongodb(?:\+srv)?://([^:]+):', url)
        if match and match.group(1).strip():
            db_name = match.group(1).strip()
            print(f"[Database] Using DB from Atlas username: {db_name}")
            return db_name
    
    # Method 4: DB_NAME env var (for local development)
    db_name = os.environ.get("DB_NAME", "")
    if db_name and db_name != "test_database":
        print(f"[Database] Using DB from env: {db_name}")
        return db_name
    
    # Method 5: Default fallback
    fallback = "lakeze_platform"
    print(f"[Database] Using default DB: {fallback}")
    return fallback


client = AsyncIOMotorClient(MONGO_URL)

# Resolve database: try get_default_database first, then manual resolution
try:
    db = client.get_default_database()
    DB_NAME = db.name
    print(f"[Database] Connected to default database: {DB_NAME}")
except Exception:
    DB_NAME = _resolve_db_name(MONGO_URL)
    db = client[DB_NAME]
    print(f"[Database] Connected to database: {DB_NAME}")

# Collections
users_col = db["users"]
venues_col = db["venues"]
tasks_col = db["tasks"]
knowledge_col = db["knowledge"]
batches_col = db["knowledge_batches"]
config_col = db["system_config"]
counters_col = db["counters"]
versions_col = db["knowledge_versions"]
version_items_col = db["knowledge_version_items"]


async def get_next_id(collection_name: str) -> int:
    """Auto-increment ID generator"""
    result = await counters_col.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return result["seq"]


async def init_indexes():
    """Create necessary indexes - gracefully handle errors"""
    try:
        await users_col.create_index("email", unique=True)
        await venues_col.create_index("id", unique=True)
        await tasks_col.create_index("task_id", unique=True)
        await tasks_col.create_index("venue_id")
        await tasks_col.create_index("customer_user_id")
        await knowledge_col.create_index("venue_id")
        await knowledge_col.create_index([("venue_id", 1), ("is_active", 1)])
        await batches_col.create_index("venue_id")
        await config_col.create_index("key", unique=True)
        await versions_col.create_index("venue_id")
        print("[Database] Indexes created successfully")
    except Exception as e:
        print(f"[Database] Index creation warning (non-fatal): {e}")
