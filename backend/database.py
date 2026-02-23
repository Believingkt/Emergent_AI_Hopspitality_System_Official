"""MongoDB database connection and helpers"""
import os
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

# Extract database name from MONGO_URL if present, otherwise use DB_NAME env var
def _get_db_name():
    """Parse DB name from MONGO_URL connection string, fallback to DB_NAME env"""
    try:
        parsed = urlparse(MONGO_URL)
        # Path contains the database name (e.g., /mydb or /mydb?options)
        db_from_url = parsed.path.strip("/").split("?")[0] if parsed.path else ""
        if db_from_url and db_from_url != "":
            print(f"[Database] Using DB name from MONGO_URL: {db_from_url}")
            return db_from_url
    except Exception as e:
        print(f"[Database] URL parse error: {e}")

    db_name = os.environ.get("DB_NAME", "lakeze_platform")
    print(f"[Database] Using DB name from env: {db_name}")
    return db_name

DB_NAME = _get_db_name()

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
        # Don't crash on index creation failure (e.g., Atlas permission issues)
        print(f"[Database] Index creation warning (non-fatal): {e}")
