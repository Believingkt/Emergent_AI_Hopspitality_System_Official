"""Load API keys from Notion page and cache in MongoDB"""
import httpx
from datetime import datetime
from database import config_col
import os

NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
NOTION_PAGE_ID = os.environ.get("NOTION_PAGE_ID", "")
NOTION_API_URL = "https://api.notion.com/v1"

# Key mapping: text label -> config key
KEY_MAP = {
    "Clause API": "claude_api_key",
    "Claude API": "claude_api_key",
    "OpenAI API": "openai_api_key",
    "LINE Channel Access Token": "line_channel_access_token",
    "LINE Channel Secrect": "line_channel_secret",
    "LINE Channel Secret": "line_channel_secret",
    "LINE Channel ID": "line_channel_id",
}


async def fetch_from_notion() -> dict:
    """Read API keys from Notion page blocks"""
    if not NOTION_API_KEY or not NOTION_PAGE_ID:
        print("[ConfigLoader] No Notion credentials, skipping")
        return {}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{NOTION_API_URL}/blocks/{NOTION_PAGE_ID}/children?page_size=100",
                headers={
                    "Authorization": f"Bearer {NOTION_API_KEY}",
                    "Notion-Version": "2022-06-28",
                }
            )
            resp.raise_for_status()
            data = resp.json()

        config = {}
        for block in data.get("results", []):
            if block["type"] == "paragraph":
                rich_text = block["paragraph"].get("rich_text", [])
                if not rich_text:
                    continue
                text = rich_text[0].get("plain_text", "")
                lines = [l.strip() for l in text.split("\n") if l.strip()]

                current_key = None
                for line in lines:
                    if line in KEY_MAP:
                        current_key = KEY_MAP[line]
                    elif current_key:
                        config[current_key] = line
                        current_key = None

        print(f"[ConfigLoader] Loaded {len(config)} keys from Notion")
        return config

    except Exception as e:
        print(f"[ConfigLoader] Notion fetch error: {e}")
        return {}


async def load_config() -> dict:
    """Load config: try Notion first, fallback to MongoDB cache"""
    # Try Notion
    notion_config = await fetch_from_notion()

    if notion_config:
        # Cache to MongoDB
        await config_col.update_one(
            {"key": "api_keys"},
            {"$set": {
                "value": notion_config,
                "updated_at": datetime.utcnow().isoformat(),
                "source": "notion"
            }},
            upsert=True
        )
        return notion_config

    # Fallback to cache
    cached = await config_col.find_one({"key": "api_keys"})
    if cached:
        print("[ConfigLoader] Using cached config from MongoDB")
        return cached.get("value", {})

    print("[ConfigLoader] WARNING: No config available!")
    return {}


async def get_config() -> dict:
    """Get current config from MongoDB cache"""
    cached = await config_col.find_one({"key": "api_keys"})
    if cached:
        return cached.get("value", {})
    return await load_config()


async def get_config_value(key: str) -> str:
    """Get a specific config value; falls back to the uppercase env var (e.g. OPENAI_API_KEY)"""
    config = await get_config()
    return config.get(key) or os.environ.get(key.upper(), "")
