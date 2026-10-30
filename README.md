# Lakeze 多場域 AI 管家協作平台

- `backend/` — FastAPI + MongoDB，部署在 Railway（設定見 `backend/railway.json`）
- `frontend/` — React (CRA + craco)，透過 `REACT_APP_BACKEND_URL` 連到後端

## Railway 部署（後端）

1. 在 Railway 專案新增 **MongoDB** 服務。
2. 新增服務連到此 GitHub repo，**Root Directory 設為 `backend`**。
3. 設定環境變數（範例見 `backend/.env.example`）：
   - `MONGO_URL=${{MongoDB.MONGO_URL}}`
   - `DB_NAME`、`JWT_SECRET`（≥32 字元）、`CORS_ORIGINS`、`APP_URL`
   - `OPENAI_API_KEY`、`CLAUDE_API_KEY`（或用 `NOTION_API_KEY` / `NOTION_PAGE_ID` 從 Notion 載入）
4. 掛一個 Volume 到 `/data`，並設 `UPLOAD_DIR=/data/uploads`，上傳檔案才不會在重新部署時遺失。
5. Generate Domain，健康檢查：`/api/health`。
6. 前端 `REACT_APP_BACKEND_URL` 改成 Railway 網域，LINE webhook URL 也要一併更新。

## 本機開發

```bash
cd backend && pip install -r requirements.txt && uvicorn server:app --reload --port 8001
```
