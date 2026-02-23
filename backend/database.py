"""MongoDB database connection and helpers"""
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

def _resolve_db_name(url):
    """Determine the correct database name from MONGO_URL"""
    
    # Method 1: Extract DB name from URL path (mongodb://host/DATABASE)
    match = re.search(r'mongodb(?:\+srv)?://[^/]+/([^?/]+)', url)
    if match and match.group(1).strip():
        db_name = match.group(1).strip()
        print(f"[Database] Using DB from URL path: {db_name}")
        return db_name
    
    # Method 2: For Emergent Atlas - derive from appName parameter
    # Pattern: appName=model-integrate → database = model_integrate
    match = re.search(r'appName=([^&]+)', url)
    if match:
        app_name = match.group(1).strip()
        db_name = app_name.replace("-", "_")
        print(f"[Database] Using DB from appName '{app_name}': {db_name}")
        return db_name
    
    # Method 3: Derive from username in URL
    # Pattern: mongodb+srv://USERNAME:pass@host → database = USERNAME with - replaced by _
    match = re.search(r'mongodb(?:\+srv)?://([^:]+):', url)
    if match:
        username = match.group(1).strip()
        db_name = username.replace("-", "_")
        print(f"[Database] Using DB from username '{username}': {db_name}")
        return db_name
    
    # Method 4: Fall back to DB_NAME env var
    db_name = os.environ.get("DB_NAME", "lakeze_platform")
    print(f"[Database] Using DB from env: {db_name}")
    return db_name

DB_NAME = _resolve_db_name(MONGO_URL)
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

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
