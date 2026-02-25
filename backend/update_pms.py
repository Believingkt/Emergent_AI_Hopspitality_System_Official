import asyncio
from database import venues_col

async def update():
    result = await venues_col.update_one(
        {"id": "tiansong_inn"},
        {"$set": {
            "pms_config.account_id": "LakezeEvent",
            "pms_config.password": "^yEsYWt4uU",
        }}
    )
    print(f"Updated credentials: {result.modified_count}")
    
    venue = await venues_col.find_one({"id": "tiansong_inn"})
    config = venue.get("pms_config", {})
    print(f"  account_id: {config.get('account_id')}")
    print(f"  has_password: {bool(config.get('password'))}")
    print(f"  proxy_url: {config.get('proxy_url')}")
    print(f"  use_production: {config.get('use_production')}")

asyncio.run(update())
