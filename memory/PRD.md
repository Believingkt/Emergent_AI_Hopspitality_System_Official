# 多場域 AI 管家協作平台 - PRD

## 專案概述
為「森山寫照」及其關聯場域建立的專業網頁管理平台，作為管家團隊的中央指揮中心，用於管理來自多個物業的 AI 聊天機器人所轉交的客戶對話。

## 技術架構
- **前端**: React + Tailwind CSS + Shadcn UI
- **後端 API**: https://line-ai-bot-xiaosen.onrender.com/api (外部 - Manus 團隊)
- **認證**: JWT Token (localStorage)

## 核心功能

### 已實現功能

#### 1. 登入頁面 ✅
- 深色主題設計
- Email/密碼表單
- JWT 認證流程

#### 2. 運營管理中心（儀表板）✅

**手機版 Tab 導航優化** ✅ (Updated: 2026-02-18)
- 手機版（< md）：垂直堆疊的大按鈕設計，每個高度 56px
- 桌面版（≥ md）：水平排列的標準 Tab
- 每個 Tab 都有清晰的圖標和完整文字標籤

**2.1 業績總覽 Tab ✅**
- 日期選擇器
- 核心指標卡片（4 大數字）
- **營收趨勢圖**：直條圖（今年/去年）+ 折線圖（趨勢線）
- 星鏈計畫（銷售漏斗）
- 房況即時看板
- AI 效能分析

**2.2 轉交分析 Tab ✅**
- 真實 LINE OA 對話數據
- 管家回覆功能

**2.3 AI 學習 Tab ✅ (Updated: 2026-02-18 - P1 功能整合)**
- **場域選擇器**：可切換不同場域
- **版本顯示**：基於知識庫數量
- **學習輸入方式**：
  - **上傳檔案** - 支援 PDF、Word、Excel、CSV、TXT、圖片（OCR）
  - **貼上文字** - LINE 對話、房型介紹等
- **AI 萃取流程** ✅ (NEW)：
  - 上傳/貼上後自動呼叫 `POST /api/venues/{venue_id}/knowledge/extract`
  - 顯示進度狀態（處理中 → 萃取完成）
  - 萃取完成後自動彈出審核 Modal
- **批次審核 Modal** ✅ (NEW)：
  - 顯示所有萃取的知識草稿
  - 單條確認/拒絕/編輯功能
  - 一鍵全部確認
  - 狀態標記（待審核/已確認/已拒絕）
- **與圖文選單協作**：開關控制
- **已學習內容**：顯示知識庫條目
- **版本歷史**：可回滾
- **測試對話**：模擬客戶測試

**2.4 知識管理 Tab ✅ (NEW: 2026-02-19 - v7.4.0 整合)**
- **統計卡片**：總知識數、生效中、手動新增、AI 萃取
- **搜尋功能**：按標題或內容搜尋
- **篩選功能**：
  - 狀態篩選：全部/生效中/已停用
  - 分類篩選：價格/設施/規則/餐飲/服務/交通位置/其他
- **知識列表**：
  - 顯示標題、分類標籤、來源（手動/AI萃取）、狀態
  - 每條知識有編輯/停用按鈕
- **新增知識**：彈出表單（標題、內容、分類）
- **編輯知識**：彈出預填表單
- **停用知識**：確認後軟刪除

#### 3. 設定頁面 ✅
- 場域管理
- 管家管理
- LINE OA 憑證管理

#### 4. 後端 API 整合 ✅ (Updated: 2026-02-19)

**已整合的 API**：

| API | 方法 | 用途 | 狀態 |
|-----|------|------|------|
| `/api/auth/login` | POST | 登入 | ✅ |
| `/api/venues` | GET | 場域列表 | ✅ |
| `/api/venues/{id}/knowledge` | GET | 知識庫讀取 | ✅ |
| `/api/venues/{id}/knowledge` | POST | 新增知識 | ✅ |
| `/api/venues/{id}/knowledge/{kid}` | PUT | 編輯知識 | ✅ |
| `/api/venues/{id}/knowledge/{kid}` | DELETE | 停用知識 | ✅ |
| `/api/venues/{id}/knowledge/stats` | GET | **知識統計** | ✅ v7.4.0 |
| `/api/venues/{id}/knowledge/extract` | POST | AI 知識萃取 | ✅ |
| `/api/venues/{id}/knowledge/batches` | GET | 批次列表 | ✅ |
| `/api/venues/{id}/knowledge/batches/{bid}` | GET | 批次詳情 | ✅ |
| `/api/venues/{id}/knowledge/{kid}/approve` | PUT | 確認知識 | ✅ |
| `/api/venues/{id}/knowledge/{kid}/reject` | PUT | 拒絕知識 | ✅ |
| `/api/venues/{id}/knowledge/batches/{bid}/approve-all` | POST | 一鍵全部確認 | ✅ |
| `/api/tasks/{task_id}/reply` | POST | 管家回覆 | ✅ |

**待整合的 API (版本管理 - 進階)**：

| API | 方法 | 用途 | 狀態 |
|-----|------|------|------|
| `/api/venues/{id}/knowledge/publish` | POST | 發佈新版本 | ⏳ |
| `/api/venues/{id}/knowledge/versions` | GET | 版本歷史 | ⏳ |
| `/api/venues/{id}/knowledge/versions/{vid}` | GET | 查看版本內容 | ⏳ |
| `/api/venues/{id}/knowledge/versions/{vid}/rollback` | POST | 回滾版本 | ⏳ |

## 更新紀錄

### 2026-02-18 Session 6 (Current)
- **P1 功能整合 - AI 知識學習流程**：
  - 實作檔案上傳功能（支援 PDF、Word、Excel、CSV、TXT、圖片）
  - 實作貼上文字功能（LINE 對話等）
  - 整合 AI 萃取 API（同步處理，10-30 秒完成）
  - 新增批次審核 Modal（確認/拒絕/編輯）
  - 新增一鍵全部確認功能
  - 移除「輸入網址」Tab（目前不支援）
- **權限邊界修正**：
  - 移除 T1 Prompt 編輯器（僅限 Admin）
  - 移除 AI 銷售模型選擇（T1/T2）
- **營收趨勢圖修復**：折線圖（趨勢線）正確顯示

## 待辦事項 / Backlog

### P0 - 完成
- [x] 營收趨勢圖折線修復
- [x] T1/知識庫權限邊界修正
- [x] AI 知識萃取流程
- [x] 批次審核功能

### P1 - 待測試
- [ ] 真實 API 測試（需要 CORS 設定完成）
- [ ] 檔案上傳 10MB 限制測試
- [ ] 圖片 OCR 功能測試

### P2 - 後續優化
- [ ] 串接圖文選單同步 API
- [ ] 串接 PMS 庫存查詢 API
- [ ] 通知系統（新任務提醒）
- [ ] 清理專案

## 測試帳號
- **Email**: kenneth@lakeze.com
- **Password**: lakeze2026

## 已知問題
- **CORS 問題**：預覽環境 URL 需要在後端 FRONTEND_URL 中配置
- 需要設定：`FRONTEND_URL=https://manager.lakeze.co,https://model-integrate.preview.emergentagent.com`

## API 規格文件
- `/app/memory/P1_API_Requirements_for_Manus.md` - P1 API 需求文件（AI 知識萃取）
- `/app/memory/P2_Version_Management_API_for_Manus.md` - P2 API 需求文件（知識庫版本管理）
