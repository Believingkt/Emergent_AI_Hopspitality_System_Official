import asyncio
from database import venues_col

async def cleanup():
    result = await venues_col.delete_many({"id": {"$nin": ["sensan_inn"]}})
    print(f"Deleted {result.deleted_count} test venues")

asyncio.run(cleanup())
