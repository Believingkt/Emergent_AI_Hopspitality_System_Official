# 多場域 AI 管家協作平台 - PRD

## 專案概述
為「森山寫照」及其關聯場域建立的專業網頁管理平台，作為管家團隊的中央指揮中心，用於管理來自多個物業的 AI 聊天機器人所轉交的客戶對話。

## 品牌識別 (Updated: 2026-02-16)
- **品牌名稱**: Lakeze 人客多
- **設計風格**: 活潑現代深色主題 (Neon Cyber-Concierge)
- **主色調**: #FF6B35 (Electric Orange)
- **輔助色**: #00B4D8 (Cyan Blue)
- **強調色**: #40E0D0 (Teal)
- **背景色**: #09090b (Deep Charcoal)
- **卡片背景**: #18181b
- **邊框色**: #27272a

## 技術架構
- **前端**: React + Tailwind CSS + Shadcn UI
- **後端 API**: https://line-ai-bot-xiaosen.onrender.com/api (外部)
- **WebSocket**: wss://line-ai-bot-xiaosen.onrender.com/ws (外部, Socket.IO)
- **認證**: JWT Token (localStorage)

## 核心功能

### 已實現功能

#### 1. 登入頁面 ✅ (Updated: 2026-02-16)
- 深色主題設計
- **主標題**: 「AI 智能接待，釋放您的時間創造更大價值」
- **副標**: 讓 AI 處理瑣碎的詢問與接單工作，您專注於旅宿事業的策略發展
- **品牌價值統計**: 96% 成交率、260% 收入成長、10萬+ 接單經驗
- **服務特色標籤**:
  - 多場域集中管理
  - LINE 智能真人切換
  - PMS 庫存直連
  - 支持動態報價
  - 成交率與詢問率分析
- Email/密碼表單
- JWT 認證流程

#### 2. 運營管理中心（儀表板升級）✅ (2026-02-18)

**2.1 業績總覽 Tab ✅ (Updated: 2026-02-18 - 營收趨勢圖修復)**
- **日期選擇器**：日曆選擇器，顯示完整日期範圍
- **核心指標卡片**（4 大數字）
- **營收趨勢圖** ✅ (FIXED: 2026-02-18)：
  - **直條圖**：橘色（今年）+ 灰色（去年）對比
  - **折線圖**：青綠色趨勢線，穿過各月數據點
  - 底部數據卡片顯示每月營收和成長率
  - 圖例和總結統計
- **星鏈計畫（銷售漏斗）**
- **房況即時看板** ✅
- **AI 效能分析** ✅
- **ROI 與成本效益** ✅
- **客戶來源分析** ✅
- **預警系統** ✅
- **未成交分析** ✅

**2.2 轉交分析 Tab ✅ (Updated: 2026-02-16)**
- 真實 LINE OA 對話數據
- AI 學習流程

**2.3 AI 學習 Tab ✅ (Updated: 2026-02-18 - T1 Prompt 管理)**
- **場域選擇器**：可切換不同場域
- **客服模型版本顯示**：v3.2
- **學習輸入 Tabs**：
  - 上傳檔案
  - 輸入網址
  - 自訂規則
- **AI 銷售模型選擇**：
  - T1 模型（預設，使用中）
  - T2 模型（標記為「專業版」需升級）
- **T1 Prompt 管理** ✅ (NEW: 2026-02-18)：
  - 編輯 AI 銷售話術的核心指令
  - Textarea 編輯器
  - 儲存 Prompt 按鈕
  - 版本和更新時間顯示
- **與圖文選單協作**：開關控制
- **已學習內容**：顯示知識庫條目
- **版本歷史**：可回滾至上一版本
- **測試對話**：模擬客戶對話測試

#### 3. 設定頁面 ✅
- 場域管理
- 管家管理
- LINE OA 憑證管理

#### 4. 後端 API 整合 ✅ (Updated: 2026-02-18)
- **已整合 API**：
  - `POST /api/auth/login` - 登入
  - `GET /api/venues` - 場域列表
  - `POST /api/tasks/{task_id}/reply` - 管家回覆
  - `GET /api/venues/{venue_id}/knowledge` - 知識庫讀取
  - `POST /api/venues/{venue_id}/knowledge` - 知識庫寫入 ✅ (NEW)
  - `DELETE /api/venues/{venue_id}/knowledge/{id}` - 知識庫刪除
  - `GET /api/t1/prompt` - T1 Prompt 讀取 ✅ (NEW)
  - `POST /api/t1/prompt` - T1 Prompt 更新 ✅ (NEW)

## 更新紀錄

### 2026-02-18 Session 6 (Current)
- **營收趨勢圖修復**：
  - 修正 SVG polyline 的 viewBox 和 points 計算
  - 折線圖（趨勢線）現在正確顯示
  - 直條圖和折線圖完美結合
- **T1 Prompt 管理功能**：
  - 新增 T1 Prompt 編輯器組件
  - 實現 `handleSaveT1Prompt` 函數
  - 整合 `POST /api/t1/prompt` API
- **知識庫寫入 API**：
  - 確認 `handleAddKnowledge` 函數正確實現
  - 已測試 `POST /api/venues/{id}/knowledge` API
- **環境變數修正**：
  - 修正 `REACT_APP_BACKEND_URL` 為正確的外部 API

### 2026-02-18 Session 5
- 管家回覆 API 串接
- 知識庫讀取 API 串接
- UI 修改（星鏈計畫、日期選擇器）

## 待辦事項 / Backlog

### P0 - 必須完成
- [x] 修復營收趨勢圖折線 ✅
- [x] 串接 T1 Prompt 管理 API ✅
- [x] 串接知識庫寫入 API ✅

### P1 - 增強功能
- [ ] 串接圖文選單同步 API (`POST /api/venues/{id}/richmenu/sync`)
- [ ] 串接 PMS 庫存查詢 API (`GET /api/pms/{venue_id}/availability`)
- [ ] 通知系統（新任務提醒）

### P2 - 優化項目
- [ ] 清理專案（刪除 `/app/backend` 目錄）
- [ ] 實作圖文選單協作功能
- [ ] 管家績效報表

## 測試帳號
- **Email**: kenneth@lakeze.com
- **Password**: lakeze2026

## 已知問題
- **CORS 問題**：預覽環境 URL 需要在後端 FRONTEND_URL 中配置才能正常登入
- 預覽模式 (`?preview=true`) 可繞過登入進行 UI 測試

## 數據說明
### 真實數據 (LIVE)
- 轉交分析 Tab - 從 /api/tasks 獲取
- 知識庫 - 從 /api/venues/{id}/knowledge 獲取
- T1 Prompt - 從 /api/t1/prompt 獲取

### 模擬數據 (MOCKED)
- 業績指標 (PerformanceDashboard)
- 房況預測 (RoomStatusDashboard)
- AI 效能 (AIPerformanceDashboard)
- ROI 分析 (ROIDashboard)
- 渠道分析 (ChannelAnalysisDashboard)
- 預警系統 (AlertsAndAnalysisDashboard)
