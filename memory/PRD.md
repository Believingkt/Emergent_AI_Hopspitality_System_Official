# 多場域 AI 管家協作平台 - PRD

## 專案概述
為「森山寫照」及其關聯場域建立的專業網頁管理平台，作為管家團隊的中央指揮中心，用於管理來自多個物業的 AI 聊天機器人所轉交的客戶對話。

## 品牌識別
- **品牌名稱**: Lakeze 人客多
- **設計風格**: Lakeze Prestige - 深橄欖綠色沈穩風格
- **主色調**: #3D4A2C (Deep Olive)
- **背景色**: #F5F5F0 (Stone White)
- **強調色**: #D4AF37 (Gold)

## 技術架構
- **前端**: React + Tailwind CSS + Shadcn UI
- **後端 API**: https://line-ai-bot-xiaosen.onrender.com/api (外部)
- **WebSocket**: wss://line-ai-bot-xiaosen.onrender.com/ws (外部)
- **認證**: JWT Token (localStorage)

## 核心功能

### 已實現功能 (2026-02-16)

#### 1. 登入頁面 ✅
- Email/密碼表單
- JWT 認證流程
- 錯誤訊息顯示
- 響應式設計（桌面/手機）

#### 2. 主儀表板 - 三欄式佈局 ✅
- **左欄**: 任務列表（待處理/處理中/已完成 三個 Tab）
- **中欄**: 任務詳情視圖（客戶資訊、對話歷史、管家備註、操作按鈕）
- **右欄**: 團隊活動動態（在線管家列表、即時活動 Feed）

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

#### 6. PMS 整合模擬 ✅
- 查詢房間可用性按鈕
- 日期範圍選擇器
- 顯示 API 原始 JSON 回應

#### 7. WebSocket 即時更新 ✅
- 連線狀態顯示
- 在線管家列表
- 活動動態 Feed
- 監聽 task_created、task_updated 事件

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

### P0 - 核心功能（待外部 API 完成測試）
- [ ] 與實際後端 API 整合測試
- [ ] WebSocket 事件處理驗證

### P1 - 增強功能
- [ ] 任務搜尋/篩選功能
- [ ] 通知系統（新任務提醒）
- [ ] 管家績效統計報表

### P2 - 優化項目
- [ ] 離線模式支援
- [ ] 行動裝置優化（平板版面）
- [ ] 深色模式切換

## 測試狀態
- **前端 UI**: 95% 通過
- **API 連接**: 待有效帳號測試
- **WebSocket**: 已設定，待後端驗證

## 更新紀錄
- **2026-02-16**: MVP 完成 - 登入、儀表板、設定頁、WebSocket 架構
