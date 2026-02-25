"""
PMS API Proxy Server
===================
Deploy this on a VPS with fixed IP to relay PMS API requests.
The PMS provider will whitelist this VPS's IP address.

Usage:
  1. Deploy on DigitalOcean/Vultr/etc VPS
  2. Give the VPS IP to PMS provider for whitelisting
  3. Set PROXY_URL in Emergent app to point to this relay

Setup (run on VPS):
  curl -fsSL https://raw.githubusercontent.com/pypa/pip/main/get-pip.py | python3
  pip3 install fastapi uvicorn httpx
  python3 pms_proxy.py

Or with the one-liner setup script (see setup_proxy.sh)
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import json

app = FastAPI(title="PMS API Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allowed PMS API targets (security: only forward to known PMS URLs)
ALLOWED_TARGETS = [
    "https://booking.travelmap.com.tw/api/CIDDistributor.ashx",  # UAT
    "https://booking.taiwantravelmap.com/api/CIDDistributor.ashx",  # Production
]

# Simple API key for proxy authentication
PROXY_API_KEY = os.environ.get("PROXY_API_KEY", "lakeze-pms-proxy-2025")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pms-proxy"}


@app.post("/relay")
async def relay_pms_request(request: Request):
    """Relay a PMS API request through this fixed-IP proxy"""
    
    # Verify proxy API key
    auth = request.headers.get("X-Proxy-Key", "")
    if auth != PROXY_API_KEY:
        raise HTTPException(403, "Invalid proxy key")
    
    try:
        body = await request.json()
    except:
        raise HTTPException(400, "Invalid JSON body")
    
    # Extract relay parameters
    target_url = body.get("target_url", "")
    payload = body.get("payload", {})
    headers = body.get("headers", {})
    
    # Security: only allow known PMS URLs
    if target_url not in ALLOWED_TARGETS:
        raise HTTPException(400, f"Target URL not allowed: {target_url}")
    
    # Forward request to PMS API
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                target_url,
                json=payload,
                headers=headers
            )
            
            return {
                "status_code": resp.status_code,
                "body": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            }
    except Exception as e:
        raise HTTPException(502, f"PMS API request failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    print(f"Starting PMS Proxy on port {port}")
    print(f"Allowed targets: {ALLOWED_TARGETS}")
    uvicorn.run(app, host="0.0.0.0", port=port)
