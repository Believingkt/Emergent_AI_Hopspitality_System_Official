# 🚀 後端 API 需求文件 - P2 知識庫版本管理

**專案：** 多場域 AI 管家協作平台
**日期：** 2026-07-XX
**發送給：** Manus 後端/資料庫團隊
**發送者：** Kenneth / 人客多團隊

---

## 📋 背景說明

我們已完成 P1 的「AI 知識學習中心」功能（知識萃取、批次審核、知識 CRUD）。
現在需要加上**知識庫版本管理**系統，讓客戶可以：

1. 將目前已確認的知識庫「發佈」為一個新版本（快照）
2. 查看所有歷史版本列表
3. 查看某一版本的知識內容（與目前版本對比）
4. 回滾到上一個版本（基礎版限制回滾一個版本）

**核心概念：**
- 每次「發佈」相當於對目前所有 `status = approved` 的知識做一次 **快照 (snapshot)**
- AI 聊天機器人永遠使用**最新已發佈版本**的知識來回答問題
- 客戶在知識管理中新增/修改/刪除的知識是「草稿狀態」，需要明確「發佈」才會讓 AI 使用

**權限說明：**
- 這些 API 都是**客戶端專用**，所有操作限定在客戶自己的 `venue_id` 範圍內
- 後端需驗證 `venue_id` 屬於當前登入用戶

---

## 🔄 版本管理流程圖

```
客戶新增/修改知識 → 知識庫（草稿池）→ 點擊「發佈新版本」→ 建立快照 → AI 開始使用新版本
                                                                    ↓
                                              版本歷史：v3.2 → v3.1 → v3.0 → ...
                                                                    ↓
                                              需要時可「回滾」到上一個版本
```

---

## 🎯 需要開發的 API 端點

### 1. 發佈新版本

**用途：** 客戶確認目前知識庫內容後，發佈為新版本，AI 開始使用此版本回答問題

```
POST /api/venues/{venue_id}/knowledge/publish
```

**Request Body：**
```json
{
  "description": "新增價格優惠回覆規則、強化日期查詢邏輯",  // 選填，版本說明
  "change_summary": "學習了 3 個新規則、更新了報價流程"      // 選填，變更摘要
}
```

**Expected Response：**
```json
{
  "success": true,
  "version": {
    "version_id": "ver_20260718_001",
    "version_number": "v3.3",
    "venue_id": "venue_001",
    "description": "新增價格優惠回覆規則、強化日期查詢邏輯",
    "change_summary": "學習了 3 個新規則、更新了報價流程",
    "knowledge_count": 156,
    "published_by": "user_001",
    "published_by_name": "王管理員",
    "published_at": "2026-07-18T14:30:00Z",
    "is_current": true
  },
  "message": "版本 v3.3 已發佈，AI 將開始使用新知識"
}
```

**處理邏輯：**
1. 計算新版本號（取最新版本號 +0.1，或用自增序號）
2. 將目前所有 `status = approved` 的知識項目做快照（複製或關聯記錄）
3. 標記此版本為 `is_current = true`，並將上一個版本設為 `is_current = false`
4. AI 系統切換為讀取此版本的知識
5. 返回新版本資訊

**邊界情況：**
- 如果知識庫沒有任何變更（與上一版本完全一樣），可以允許發佈但給予提示
- 如果沒有任何 `approved` 知識，返回錯誤提示

---

### 2. 取得版本歷史列表

**用途：** 顯示該場域所有已發佈的版本記錄

```
GET /api/venues/{venue_id}/knowledge/versions
```

**Query Parameters：**
- `page`: 頁碼（預設 1）
- `limit`: 每頁數量（預設 20）

**Expected Response：**
```json
{
  "versions": [
    {
      "version_id": "ver_20260718_001",
      "version_number": "v3.3",
      "description": "新增價格優惠回覆規則、強化日期查詢邏輯",
      "change_summary": "學習了 3 個新規則、更新了報價流程",
      "knowledge_count": 156,
      "published_by_name": "王管理員",
      "published_at": "2026-07-18T14:30:00Z",
      "is_current": true,
      "can_rollback": false,
      "diff_from_previous": {
        "added": 3,
        "modified": 2,
        "removed": 0
      }
    },
    {
      "version_id": "ver_20260710_001",
      "version_number": "v3.2",
      "description": "加入淡季促銷話術、更新房型介紹",
      "change_summary": "學習了 5 個新規則、新增房型資訊",
      "knowledge_count": 151,
      "published_by_name": "陳管家",
      "published_at": "2026-07-10T10:00:00Z",
      "is_current": false,
      "can_rollback": true,
      "diff_from_previous": {
        "added": 5,
        "modified": 1,
        "removed": 0
      }
    },
    {
      "version_id": "ver_20260701_001",
      "version_number": "v3.1",
      "description": "基礎版本，包含標準接單流程",
      "change_summary": "初始化模型、建立基礎對話流程",
      "knowledge_count": 145,
      "published_by_name": "王管理員",
      "published_at": "2026-07-01T09:00:00Z",
      "is_current": false,
      "can_rollback": false,
      "diff_from_previous": null
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

**`can_rollback` 規則（基礎版）：**
- 當前版本 (`is_current = true`)：`can_rollback = false`（已經是目前版本）
- 前一個版本（排序第 2 位）：`can_rollback = true`（基礎版只能回滾一版）
- 更早的版本：`can_rollback = false`（需升級專業版才可回滾）

---

### 3. 查看指定版本的知識內容

**用途：** 查看某一歷史版本中包含的所有知識項目（用於對比或審核）

```
GET /api/venues/{venue_id}/knowledge/versions/{version_id}
```

**Expected Response：**
```json
{
  "version": {
    "version_id": "ver_20260710_001",
    "version_number": "v3.2",
    "description": "加入淡季促銷話術、更新房型介紹",
    "change_summary": "學習了 5 個新規則、新增房型資訊",
    "knowledge_count": 151,
    "published_by_name": "陳管家",
    "published_at": "2026-07-10T10:00:00Z",
    "is_current": false
  },
  "knowledge_items": [
    {
      "id": "know_001",
      "category": "價格資訊",
      "title": "平日房價",
      "content": "平日雙人房定價 NT$3,800，假日 NT$4,500",
      "source_type": "manual",
      "created_at": "2026-06-15T10:00:00Z"
    },
    {
      "id": "know_002",
      "category": "房型介紹",
      "title": "豪華雙人房特色",
      "content": "豪華雙人房配有獨立陽台，可欣賞山景...",
      "source_type": "ai_extract",
      "created_at": "2026-07-01T09:30:00Z"
    }
  ],
  "diff_from_current": {
    "added_in_current": [
      {
        "id": "know_160",
        "title": "新增的知識標題",
        "category": "服務"
      }
    ],
    "removed_in_current": [],
    "modified_in_current": [
      {
        "id": "know_001",
        "title": "平日房價",
        "field_changed": "content"
      }
    ]
  }
}
```

**說明：**
- `knowledge_items`：該版本快照時包含的所有知識
- `diff_from_current`：與目前最新版本的差異對比（**選填，方便前端顯示差異**）

---

### 4. 回滾到指定版本

**用途：** 將知識庫回滾到之前的某個版本，AI 將使用回滾後的版本

```
POST /api/venues/{venue_id}/knowledge/versions/{version_id}/rollback
```

**Request Body：**
```json
{
  "reason": "新版本的報價規則有誤，先回滾到上一版"  // 選填，回滾原因
}
```

**Expected Response：**
```json
{
  "success": true,
  "message": "已回滾到版本 v3.2，AI 將使用此版本的知識",
  "rollback_info": {
    "from_version": {
      "version_id": "ver_20260718_001",
      "version_number": "v3.3"
    },
    "to_version": {
      "version_id": "ver_20260710_001",
      "version_number": "v3.2"
    },
    "rollback_at": "2026-07-18T16:00:00Z",
    "rollback_by": "王管理員",
    "reason": "新版本的報價規則有誤，先回滾到上一版"
  },
  "current_version": {
    "version_id": "ver_20260710_001",
    "version_number": "v3.2",
    "knowledge_count": 151,
    "is_current": true
  }
}
```

**處理邏輯：**
1. 驗證該版本是否 `can_rollback = true`（基礎版只能回滾一版）
2. 將目標版本的知識快照恢復為目前的「已生效知識庫」
3. 標記目標版本為 `is_current = true`
4. **保留被回滾的版本記錄**（不刪除，標記為 `rolled_back = true`）
5. AI 系統切換為讀取回滾版本的知識
6. 記錄回滾操作的 audit log

**錯誤回應（基礎版限制）：**
```json
{
  "success": false,
  "error": "UPGRADE_REQUIRED",
  "message": "基礎版僅支援回滾至上一個版本。如需回滾到更早的版本，請升級至專業版。"
}
```

---

## 📊 資料庫 Schema 建議

### knowledge_versions 表（新建）

```sql
CREATE TABLE knowledge_versions (
  id SERIAL PRIMARY KEY,
  version_id VARCHAR(50) UNIQUE NOT NULL,      -- 如 'ver_20260718_001'
  venue_id VARCHAR(50) NOT NULL,               -- 關聯場域
  version_number VARCHAR(20) NOT NULL,         -- 如 'v3.3'（顯示用）
  description TEXT,                            -- 版本說明
  change_summary TEXT,                         -- 變更摘要
  knowledge_count INT DEFAULT 0,               -- 該版本的知識總數
  published_by VARCHAR(50) NOT NULL,           -- 發佈者 user_id
  published_by_name VARCHAR(100),              -- 發佈者姓名
  published_at TIMESTAMP DEFAULT NOW(),        -- 發佈時間
  is_current BOOLEAN DEFAULT TRUE,             -- 是否為目前使用中版本
  rolled_back BOOLEAN DEFAULT FALSE,           -- 是否已被回滾
  rolled_back_at TIMESTAMP,                    -- 回滾時間
  rolled_back_by VARCHAR(50),                  -- 回滾者
  rollback_reason TEXT,                        -- 回滾原因
  
  -- 與上一版本的差異統計
  diff_added INT DEFAULT 0,
  diff_modified INT DEFAULT 0,
  diff_removed INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_kv_venue ON knowledge_versions(venue_id);
CREATE INDEX idx_kv_current ON knowledge_versions(venue_id, is_current);
```

### knowledge_version_items 表（新建 - 版本快照）

```sql
CREATE TABLE knowledge_version_items (
  id SERIAL PRIMARY KEY,
  version_id VARCHAR(50) NOT NULL,             -- 關聯版本
  knowledge_id VARCHAR(50) NOT NULL,           -- 原始知識 ID
  venue_id VARCHAR(50) NOT NULL,               -- 場域 ID
  category VARCHAR(50),                        -- 分類
  title VARCHAR(500) NOT NULL,                 -- 標題
  content TEXT NOT NULL,                       -- 內容（快照當時的內容）
  source_type VARCHAR(20),                     -- 來源：'manual' | 'ai_extract'
  original_created_at TIMESTAMP,               -- 原始知識建立時間
  snapshot_at TIMESTAMP DEFAULT NOW(),         -- 快照時間
  
  FOREIGN KEY (version_id) REFERENCES knowledge_versions(version_id)
);

-- 索引
CREATE INDEX idx_kvi_version ON knowledge_version_items(version_id);
CREATE INDEX idx_kvi_venue ON knowledge_version_items(venue_id);
```

### 回滾操作日誌表（建議新建）

```sql
CREATE TABLE knowledge_rollback_log (
  id SERIAL PRIMARY KEY,
  venue_id VARCHAR(50) NOT NULL,
  from_version_id VARCHAR(50) NOT NULL,
  to_version_id VARCHAR(50) NOT NULL,
  reason TEXT,
  performed_by VARCHAR(50) NOT NULL,
  performed_by_name VARCHAR(100),
  performed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 版本號規則建議

| 情境 | 版本號變化 | 說明 |
|------|-----------|------|
| 新增知識後發佈 | v3.2 → v3.3 | 小版本 +1 |
| 大量更新後發佈 | v3.9 → v4.0 | 到達 .9 自動進位 |
| 回滾後重新發佈 | v3.3(回滾) → v3.2(回滾後) → v3.4(重新發佈) | 版本號持續遞增，不重複 |

**建議做法：** 後端自動管理版本號，前端只顯示不控制。

---

## 🔐 權限與限制

### 基礎版限制
| 功能 | 基礎版 | 專業版（未來） |
|------|--------|---------------|
| 發佈新版本 | ✅ | ✅ |
| 查看版本歷史 | ✅ 全部可看 | ✅ |
| 查看版本內容 | ✅ | ✅ |
| 回滾至上一版本 | ✅ 僅限前一個版本 | ✅ 任意版本 |
| 版本差異對比 | ❌ | ✅ |

### API 權限驗證
```python
# 所有 API 都必須驗證
1. JWT Token 有效性
2. venue_id 屬於當前用戶
3. 回滾操作時檢查方案等級（基礎版/專業版）
```

---

## 📝 前端整合計畫

當這些 API 準備好後，前端將：

1. **版本歷史區塊** — 目前為硬編碼模擬資料，改為呼叫 `GET /versions` 取得真實資料
2. **發佈按鈕** — 在知識管理或 AI 學習頁面新增「發佈新版本」按鈕，呼叫 `POST /publish`
3. **版本詳情** — 點擊版本可展開查看內容，呼叫 `GET /versions/{vid}`
4. **回滾功能** — 回滾按鈕呼叫 `POST /versions/{vid}/rollback`，加上確認彈窗
5. **目前版本顯示** — 頁面頂部顯示目前使用中的版本號和發佈時間

---

## ❓ 待確認問題

1. **快照方式**：建議用獨立的 `knowledge_version_items` 表做完整複製（較穩定），還是只記錄差異（省空間但回滾較複雜）？
2. **版本號格式**：使用 `v3.2` 這種格式可以嗎？還是要改用語意化版本（如 `2026.07.18.1`）？
3. **AI 切換機制**：發佈/回滾後，AI 聊天機器人是立即使用新版本，還是有短暫的同步延遲？需要通知 AI 服務更新嗎？
4. **專業版判斷**：用戶方案等級存在哪裡？回滾 API 需要檢查什麼欄位來判斷是基礎版還是專業版？
5. **版本上限**：需要限制保留的版本數量嗎？例如基礎版最多保留 10 個版本？

---

## 📐 API 端點總覽

| # | API | 方法 | 用途 | 優先級 |
|---|-----|------|------|--------|
| 1 | `/api/venues/{venue_id}/knowledge/publish` | POST | 發佈新版本 | 🔴 高 |
| 2 | `/api/venues/{venue_id}/knowledge/versions` | GET | 版本歷史列表 | 🔴 高 |
| 3 | `/api/venues/{venue_id}/knowledge/versions/{version_id}` | GET | 查看版本內容 | 🟡 中 |
| 4 | `/api/venues/{venue_id}/knowledge/versions/{version_id}/rollback` | POST | 回滾版本 | 🟡 中 |

---

**請在 API 準備好後通知我們，我們會進行前端整合測試。**

感謝 Manus 團隊的支援！有任何問題請隨時聯繫。

**Kenneth**
人客多團隊
