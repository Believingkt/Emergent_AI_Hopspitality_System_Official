#!/bin/bash
# ============================================
# PMS Proxy 一鍵部署腳本
# 在 DigitalOcean Droplet 上執行此腳本
# ============================================

echo "🚀 正在設定 PMS Proxy..."

# 金鑰可用 PROXY_API_KEY=xxx bash setup_proxy.sh 指定，未指定則隨機產生
PROXY_API_KEY="${PROXY_API_KEY:-$(openssl rand -hex 24)}"

# 更新系統
apt-get update -y && apt-get upgrade -y

# 安裝 Python
apt-get install -y python3 python3-pip python3-venv

# 建立專案目錄
mkdir -p /opt/pms-proxy
cd /opt/pms-proxy

# 建立虛擬環境
python3 -m venv venv
source venv/bin/activate

# 安裝依賴
pip install fastapi uvicorn httpx

# 寫入 proxy 程式
cat > proxy.py << 'PYEOF'
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI(title="PMS API Proxy")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ALLOWED_TARGETS = [
    "https://booking.travelmap.com.tw/api/CIDDistributor.ashx",
    "https://booking.taiwantravelmap.com/api/CIDDistributor.ashx",
]

PROXY_API_KEY = os.environ["PROXY_API_KEY"]

@app.get("/health")
async def health():
    return {"status": "ok", "service": "pms-proxy"}

@app.post("/relay")
async def relay(request: Request):
    auth = request.headers.get("X-Proxy-Key", "")
    if auth != PROXY_API_KEY:
        raise HTTPException(403, "Invalid proxy key")
    body = await request.json()
    target_url = body.get("target_url", "")
    payload = body.get("payload", {})
    headers = body.get("headers", {})
    if target_url not in ALLOWED_TARGETS:
        raise HTTPException(400, "Target not allowed")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(target_url, json=payload, headers=headers)
            try:
                resp_body = resp.json()
            except:
                resp_body = resp.text
            return {"status_code": resp.status_code, "body": resp_body}
    except Exception as e:
        raise HTTPException(502, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
PYEOF

# 建立 systemd 服務（開機自動啟動）
cat > /etc/systemd/system/pms-proxy.service << SVCEOF
[Unit]
Description=PMS API Proxy
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pms-proxy
Environment=PROXY_API_KEY=${PROXY_API_KEY}
ExecStart=/opt/pms-proxy/venv/bin/uvicorn proxy:app --host 0.0.0.0 --port 8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

# 啟動服務
systemctl daemon-reload
systemctl enable pms-proxy
systemctl start pms-proxy

# 開啟防火牆
ufw allow 8080/tcp
ufw allow 22/tcp
ufw --force enable

echo ""
echo "✅ PMS Proxy 部署完成！"
echo ""
echo "📍 Proxy URL: http://$(curl -s ifconfig.me):8080"
echo "📍 Health Check: http://$(curl -s ifconfig.me):8080/health"
echo ""
echo "🔑 Proxy API Key: ${PROXY_API_KEY}"
echo "   請設定到 Railway backend 的 PMS_PROXY_API_KEY"
echo "📌 固定 IP: $(curl -s ifconfig.me)"
echo ""
echo "請將此 IP 提供給 PMS 提供方加入白名單"
