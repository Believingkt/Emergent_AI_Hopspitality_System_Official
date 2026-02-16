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

#### 1. 登入頁面 ✅
- 深色主題設計
- 品牌價值主張展示 (96% 成交率、260% 收入成長、10萬+ 接單經驗)
- Email/密碼表單
- JWT 認證流程

#### 2. 運營管理中心（儀表板升級）✅ (2026-02-16)

**2.1 運營概況 Tab**
- 今日訊息統計（總數、AI處理、轉交真人、今日成交）
- 成交率儀表盤（目標 4%、達標/未達標顯示）
- 即時分析建議：
  - 成交率 < 4% 時顯示改善建議
  - 詢問量 < 100 則時顯示流量警告
- 當班管家顯示（右側）

**2.2 轉交分析 Tab**
- 轉交原因分佈圖表（價格詢問、房間確認、特殊需求、投訴、預約流程、其他）
- 今日轉交對話列表
- 每個對話卡片顯示：
  - 客戶名稱、時間、轉交原因標籤
  - 客戶訊息（橘色頭像）
  - AI 回覆（青藍色氣泡）
  - 「希望 AI 學習此回答規則」按鈕
  - 展開後可輸入回覆規則或上傳對話截圖

**2.3 當班管家 Tab**
- 森山寫照預設管家：安安、立棠
- 當班狀態顯示（早班 08:00-16:00 / 晚班 16:00-24:00）
- 本週排班預覽（7天）
- 團隊績效指標（回覆及時率、平均評分、本月成交、平均回覆時間）

#### 3. 設定頁面（管理員）✅
- 場域管理：查看/編輯場域設定
- 管家管理：查看/新增管家帳號

#### 4. PMS 整合模擬 ✅
- 查詢房間可用性（日期選擇器）

#### 5. WebSocket 即時更新 ✅
- Socket.IO 連線（輪詢模式）
- 連線狀態顯示

## 使用者角色
1. **管家 (Manager)**: 可存取儀表板
2. **管理員 (Admin)**: 可存取設定頁面

## 數據說明

### 模擬數據（MOCKED）
目前以下功能使用模擬數據，需要後端 API 支援才能顯示真實數據：
- `VenueStats` - generateMockStats() 產生隨機統計
- `HandoffAnalysis` - generateMockHandoffs() 產生範例對話
- `ManagerSchedule` - generateShiftSchedule() 產生排班（安安、立棠固定）

### 需要的 API 端點
- `GET /api/venues/{venue_id}/stats` - 場域統計數據
- `GET /api/venues/{venue_id}/handoffs` - 轉交對話列表
- `POST /api/ai/learn` - 提交 AI 學習請求
- `GET /api/managers/schedule` - 管家排班
- `PUT /api/managers/schedule` - 更新排班

## 測試狀態
- **前端 UI**: 100% 通過
- **API 連接**: 正常（登入、場域、任務）
- **WebSocket**: Socket.IO 輪詢模式運作

## 測試帳號
- **Email**: kenneth@lakeze.com
- **Password**: lakeze2026

## 更新紀錄
- **2026-02-16 Session 2**: 
  - UI/UX 重新設計（深色主題、橘藍配色）
  - 儀表板升級為「運營管理中心」
  - 新增：運營概況、轉交分析、當班管家功能
  - 新增：成交率儀表、即時分析、AI 學習回饋功能
- **2026-02-16 Session 1**: MVP 完成

## 待辦事項 / Backlog

### P0 - 必須整合
- [ ] 將模擬數據改為真實 API 調用
- [ ] AI 學習功能後端實作

### P1 - 增強功能
- [ ] 通知系統（新任務提醒）
- [ ] 管家績效報表（週/月）
- [ ] 數據匯出功能

### P2 - 優化項目
- [ ] 離線模式支援
- [ ] 深色/淺色模式切換
