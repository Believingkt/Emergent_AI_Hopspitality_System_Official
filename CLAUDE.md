# 專案說明

## 溝通語言
- 所有回覆、進度說明、問題提問一律使用**繁體中文**，包含工作過程中的中途狀態更新。
- Git commit 訊息也使用繁體中文。

## 架構
- `backend/`：FastAPI + MongoDB，部署在 Railway 專案 `lakeze-ai-hospitality` 的 `backend` 服務（根目錄 `/backend`，啟動指令見 `backend/Procfile`）
- `frontend/`：React（CRA + craco），部署在同專案的 `frontend` 服務，以 `serve` 提供正式版 build
- 環境變數範例見 `backend/.env.example`、`frontend/.env.example`

## 安全原則
- 密碼、Token、API 金鑰一律不可寫進程式碼或文件，放 Railway 環境變數或資料庫（後台設定頁）
- 帳號密碼由後台「系統設定 → 管家管理」管理
