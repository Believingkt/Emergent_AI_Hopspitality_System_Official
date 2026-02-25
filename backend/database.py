"""MongoDB database connection and helpers"""
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

def _resolve_db_name(url):
    """Determine the correct database name.
    
    Priority order:
    1. DB_NAME environment variable (explicitly set by developer)
    2. Database name from MONGO_URL path 
    3. Default fallback
    
    NOTE: appName in MONGO_URL is for connection telemetry, NOT the database name.
    """
    
    # Priority 1: DB_NAME env var (most reliable - set by developer)
    db_name = os.environ.get("DB_NAME", "")
    if db_name and db_name != "test_database":
        print(f"[Database] Using DB from DB_NAME env: {db_name}")
        return db_name
    
    # Priority 2: Extract from MONGO_URL path (mongodb://host/DATABASE?params)
    match = re.search(r'mongodb(?:\+srv)?://[^/]+/([^?/]+)', url)
    if match and match.group(1).strip():
        db_name = match.group(1).strip()
        print(f"[Database] Using DB from URL path: {db_name}")
        return db_name
    
    # Priority 3: Default fallback
    fallback = "lakeze_platform"
    print(f"[Database] Using default DB: {fallback}")
    return fallback


DB_NAME = _resolve_db_name(MONGO_URL)
client = AsyncIOMotorClient(MONGO_URL)
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
bookings_col = db["bookings"]


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
