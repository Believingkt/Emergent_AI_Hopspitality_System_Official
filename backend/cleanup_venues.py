import asyncio
from database import venues_col

async def cleanup():
    result = await venues_col.delete_many({"id": {"$nin": ["sensan_inn"]}})
    print(f"Deleted {result.deleted_count} test venues")
    remaining = await venues_col.find({}).to_list(100)
    for v in remaining:
        print(f"  Remaining: {v['id']} - {v['name']}")

asyncio.run(cleanup())
