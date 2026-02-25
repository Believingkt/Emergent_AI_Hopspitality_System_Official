import asyncio
from database import venues_col

async def cleanup():
    result = await venues_col.delete_many({"id": {"$nin": ["sensan_inn", "tiansong_inn"]}})
    print(f"Deleted {result.deleted_count} test venues")
    all_v = await venues_col.find({}).to_list(100)
    for v in all_v:
        print(f"  {v['id']} - {v['name']}")

asyncio.run(cleanup())
