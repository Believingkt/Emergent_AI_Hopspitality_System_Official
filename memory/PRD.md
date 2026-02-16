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
- **Logo URLs**:
  - 主 Logo: https://customer-assets.emergentagent.com/job_430b19cf-7dc2-4179-a7b4-72c8b0096192/artifacts/k9ookbrh_%E4%BA%BA%E5%AE%A2%E5%A4%9Alogo%20%281%29.png
  - 人客多 Logo: https://customer-assets.emergentagent.com/job_430b19cf-7dc2-4179-a7b4-72c8b0096192/artifacts/6ffwi2v3_%E4%BA%BA%E5%AE%A2%E5%A4%9A%E7%89%B9%E8%A8%B1%E5%8A%A0%E7%9B%9F%E9%A0%AD%E8%B2%BC.png

## 技術架構
- **前端**: React + Tailwind CSS + Shadcn UI
- **後端 API**: https://line-ai-bot-xiaosen.onrender.com/api (外部)
- **WebSocket**: wss://line-ai-bot-xiaosen.onrender.com/ws (外部, Socket.IO)
- **認證**: JWT Token (localStorage)

## 核心功能

### 已實現功能 (2026-02-16)

#### 1. 登入頁面 ✅
- 深色主題設計
- 品牌價值主張展示 (96% 成交率、260% 收入成長、10萬+ 接單經驗)
- Email/密碼表單
- JWT 認證流程
- 響應式設計（桌面/手機）

#### 2. 主儀表板 - 三欄式佈局 ✅
- **側邊欄**: Logo、導航圖標、用戶頭像、登出按鈕
- **左欄**: 任務列表（待處理/處理中/已完成 三個 Tab）
- **中欄**: 任務詳情視圖（客戶資訊、對話歷史、管家備註、操作按鈕）
- **右欄**: 團隊活動動態（在線管家列表、即時活動 Feed）
- **行動版**: 單欄佈局，任務列表與詳情切換，團隊動態以 Sheet 抽屜呈現

#### 3. 任務操作功能 ✅
- 認領任務 (POST /api/tasks/{task_id}/claim)
- 取消認領 (POST /api/tasks/{task_id}/unclaim)
- 完成任務 (POST /api/tasks/{task_id}/complete)
- 更新備註 (PUT /api/tasks/{task_id})

#### 4. 場域選擇器 ✅
- Header 區域下拉選單
- 根據場域篩選任務列表

#### 5. 設定頁面（管理員）✅
- **場域管理**: 查看/編輯場域設定（AI 模型、知識庫 URL）
- **管家管理**: 查看管家列表、新增管家帳號
- 深色主題設計

#### 6. PMS 整合模擬 ✅
- 查詢房間可用性按鈕
- 日期範圍選擇器
- 顯示 API 原始 JSON 回應

#### 7. WebSocket 即時更新 ✅
- 連線狀態顯示（使用 Socket.IO）
- 在線管家列表
- 活動動態 Feed
- 監聽 task_created、task_updated 事件

#### 8. UI/UX 重新設計 ✅ (2026-02-16)
- 從淺色主題轉換為深色主題
- 從橄欖綠色系轉換為橘藍色系
- 圓角卡片設計 (rounded-xl)
- 發光按鈕效果 (btn-glow)
- 玻璃效果頂部導覽 (glassmorphism)
- 響應式行動裝置支援

## 使用者角色
1. **管家 (Manager)**: 可存取儀表板、認領/處理任務
2. **管理員 (Admin)**: 可存取設定頁面、管理場域和管家

## API 端點對應
- `POST /api/auth/login` - 登入
- `GET /api/auth/me` - 取得當前使用者
- `GET /api/venues` - 取得場域列表
- `GET /api/venues/{venue_id}/config` - 取得場域設定
- `PUT /api/venues/{venue_id}/config` - 更新場域設定
- `GET /api/tasks` - 取得任務列表
- `POST /api/tasks/{task_id}/claim` - 認領任務
- `POST /api/tasks/{task_id}/unclaim` - 取消認領
- `POST /api/tasks/{task_id}/complete` - 完成任務
- `PUT /api/tasks/{task_id}` - 更新任務備註
- `GET /api/managers` - 取得管家列表
- `POST /api/managers` - 新增管家
- `GET /api/pms/{venue_id}/availability` - 查詢 PMS 房間可用性

## 待辦事項 / Backlog

### P1 - 增強功能
- [ ] 任務搜尋/篩選功能
- [ ] 通知系統（新任務提醒）
- [ ] 管家績效統計報表

### P2 - 優化項目
- [ ] 離線模式支援
- [ ] 深色/淺色模式切換
- [ ] 平板版面優化

## 測試狀態
- **前端 UI**: 95% 通過
- **API 連接**: 正常
- **WebSocket**: Socket.IO 輪詢模式正常運作

## 測試帳號
- **Email**: kenneth@lakeze.com
- **Password**: lakeze2026

## 更新紀錄
- **2026-02-16 (Session 2)**: UI/UX 重新設計完成 - 深色主題、橘藍配色、響應式支援
- **2026-02-16 (Session 1)**: MVP 完成 - 登入、儀表板、設定頁、WebSocket 架構
