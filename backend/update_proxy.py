import asyncio
from database import venues_col

async def update():
    result = await venues_col.update_one(
        {"id": "tiansong_inn"},
        {"$set": {
            "pms_config.proxy_url": "http://139.59.248.231:8080",
            "pms_config.proxy_api_key": "lakeze-pms-proxy-2025"
        }}
    )
    print(f"Updated: {result.modified_count}")
    
    venue = await venues_col.find_one({"id": "tiansong_inn"})
    config = venue.get("pms_config", {})
    print(f"  proxy_url: {config.get('proxy_url')}")
    print(f"  has_credentials: {bool(config.get('account_id'))}")
    print(f"  use_production: {config.get('use_production')}")

asyncio.run(update())
