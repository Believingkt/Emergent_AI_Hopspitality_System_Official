# 多場域 AI 管家協作平台 - PRD

## 專案概述
為「森山寫照」及其關聯場域建立的專業網頁管理平台，作為管家團隊的中央指揮中心，用於管理來自多個物業的 AI 聊天機器人所轉交的客戶對話。

## 權限架構 (Updated: 2026-02-18)

### 角色定義
| 角色 | 使用者 | 說明 |
|------|--------|------|
| **Admin（Kenneth）** | Kenneth / 人客多團隊 | 系統擁有者，掌控 T1 底層、所有場域設定 |
| **Client（客戶）** | 森山寫照 / 天送幸福和苑等旅宿業者 | 場域經營者，只能管理自己場域的知識 |

### 功能權限矩陣
| 功能 | Admin | Client |
|------|:-----:|:------:|
| T1 底層 Prompt 讀寫 | ✅ | ❌ |
| 場域列表（全部/自己的） | ✅ 全部 | ✅ 自己的 |
| 場域知識 CRUD | ✅ 全部 | ✅ 自己的 |
| AI 學習餵給 | ✅ | ✅ 自己的 |
| 任務管理 | ✅ 全部 | ✅ 自己的 |
| 管家管理 | ✅ | ❌ |
| 系統設定（LINE Token） | ✅ | ❌ |

## 技術架構
- **前端**: React + Tailwind CSS + Shadcn UI
- **後端 API**: https://line-ai-bot-xiaosen.onrender.com/api (外部)
- **認證**: JWT Token (localStorage)

## 核心功能

### 已實現功能

#### 1. 登入頁面 ✅
- 深色主題設計
- Email/密碼表單
- JWT 認證流程

#### 2. 運營管理中心（儀表板）✅ (Updated: 2026-02-18)

**2.1 業績總覽 Tab ✅**
- 日期選擇器
- 核心指標卡片（4 大數字）
- **營收趨勢圖** ✅：直條圖（今年/去年）+ 折線圖（趨勢線）
- 星鏈計畫（銷售漏斗）
- 房況即時看板
- AI 效能分析
- ROI 與成本效益

**2.2 轉交分析 Tab ✅**
- 真實 LINE OA 對話數據
- 管家回覆功能

**2.3 AI 學習 Tab ✅ (Updated: 2026-02-18 - 權限修正)**
- **場域選擇器**：可切換不同場域
- **版本顯示**：基於知識庫數量
- **學習輸入 Tabs**：
  - 上傳檔案
  - 輸入網址
  - 自訂規則
- ~~AI 銷售模型選擇~~ **[已移除 - 客戶端不應看到]**
- ~~T1 Prompt 管理~~ **[已移除 - 僅限 Admin]**
- **與圖文選單協作**：開關控制
- **已學習內容**：顯示知識庫條目
- **版本歷史**：可回滾
- **測試對話**：模擬客戶測試

#### 3. 設定頁面 ✅
- 場域管理
- 管家管理
- LINE OA 憑證管理

#### 4. 後端 API 整合 ✅
- **已整合 API（客戶端可用）**：
  - `POST /api/auth/login` - 登入
  - `GET /api/venues` - 場域列表（自己的）
  - `POST /api/tasks/{task_id}/reply` - 管家回覆
  - `GET /api/venues/{venue_id}/knowledge` - 知識庫讀取
  - `POST /api/venues/{venue_id}/knowledge` - 知識庫寫入
  - `DELETE /api/venues/{venue_id}/knowledge/{id}` - 知識庫刪除

- **Admin 專用 API（客戶端不可用）**：
  - `GET /api/t1/prompt` - T1 Prompt 讀取
  - `POST /api/t1/prompt` - T1 Prompt 更新
  - `GET/PUT /api/venues/{id}/config` - 場域設定

## 更新紀錄

### 2026-02-18 Session 6
- **營收趨勢圖修復**：折線圖（趨勢線）正確顯示
- **權限邊界修正**：
  - 移除 T1 Prompt 編輯器（僅限 Admin）
  - 移除 AI 銷售模型選擇（T1/T2）
  - 客戶端只能管理自己場域的知識庫
- **環境變數確認**：REACT_APP_BACKEND_URL 正確指向外部 API

### 2026-02-18 Session 5
- 管家回覆 API 串接
- 知識庫讀取 API 串接
- UI 修改（星鏈計畫、日期選擇器）

## 待辦事項 / Backlog

### P1 - 增強功能
- [ ] 串接 AI 學習 API (`POST /api/venues/{venue_id}/knowledge/extract`)
- [ ] 串接學習批次管理 API (`GET /api/venues/{venue_id}/knowledge/batches`)
- [ ] 實作知識審核功能（確認/拒絕/編輯）
- [ ] 串接圖文選單同步 API (`POST /api/venues/{id}/richmenu/sync`)

### P2 - 優化項目
- [ ] 串接 PMS 庫存查詢 API
- [ ] 清理專案（刪除 `/app/backend` 目錄）

## 測試帳號
- **Email**: kenneth@lakeze.com / test@lakeze.com
- **Password**: lakeze2026 / test2026

## 已知問題
- **CORS 問題**：預覽環境 URL 需要在後端 FRONTEND_URL 中配置才能正常登入
- 需要在 Render 後端設定：`FRONTEND_URL=https://manager.lakeze.co,https://ai-ops.preview.emergentagent.com`

## 數據說明
### 真實數據 (LIVE)
- 轉交分析 Tab - 從 /api/tasks 獲取
- 知識庫 - 從 /api/venues/{id}/knowledge 獲取

### 模擬數據 (MOCKED)
- 業績指標 (PerformanceDashboard)
- 房況預測
- AI 效能
- ROI 分析
