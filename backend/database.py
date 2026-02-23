"""MongoDB database connection and helpers"""
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

def _extract_db_from_url(url):
    """Extract database name from MongoDB URL using multiple methods"""
    # Method 1: Try regex for mongodb+srv:// or mongodb:// URLs
    # Format: mongodb+srv://user:pass@host/DATABASE?options
    # or: mongodb://user:pass@host:port/DATABASE?options
    match = re.search(r'mongodb(?:\+srv)?://[^/]+/([^?/]+)', url)
    if match:
        db_name = match.group(1).strip()
        if db_name:
            return db_name
    
    # Method 2: Check authSource parameter (sometimes the authorized DB is there)
    match = re.search(r'authSource=([^&]+)', url)
    if match:
        return match.group(1).strip()
    
    return None

# Step 1: Try to extract DB from MONGO_URL
_db_from_url = _extract_db_from_url(MONGO_URL)

# Step 2: Create client
client = AsyncIOMotorClient(MONGO_URL)

# Step 3: Determine which database to use
if _db_from_url:
    db = client[_db_from_url]
    print(f"[Database] Using DB from MONGO_URL: {_db_from_url}")
else:
    # Try get_default_database first
    try:
        db = client.get_default_database()
        print(f"[Database] Using default DB: {db.name}")
    except Exception:
        # Last resort: use DB_NAME env var
        DB_NAME = os.environ.get("DB_NAME", "lakeze_platform")
        db = client[DB_NAME]
        print(f"[Database] Using DB from env: {DB_NAME}")

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
