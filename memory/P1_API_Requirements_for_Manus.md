# 🚀 後端 API 需求文件 - P1 優先級

**專案：** 多場域 AI 管家協作平台
**日期：** 2026-02-18
**發送給：** Manus 後端/資料庫團隊
**發送者：** Kenneth / 人客多團隊

---

## 📋 背景說明

我們正在為客戶端（旅宿業者如森山寫照）開發「AI 知識學習中心」功能。這個功能讓客戶可以：
1. 上傳文字/檔案讓 AI 自動提取知識點
2. 審核 AI 提取的知識草稿（確認/拒絕/編輯）
3. 管理已生效的場域知識庫

**重要權限說明：**
- 這些 API 都是**客戶端專用**，所有操作都限定在客戶自己的 `venue_id` 範圍內
- 後端需驗證 `venue_id` 屬於當前登入用戶
- T1 底層 Prompt 不在此範圍內（那是 Admin 專屬）

---

## 🎯 需要開發的 API 端點

### 1. AI 知識提取（核心功能）

**用途：** 客戶貼上文字或上傳檔案，觸發 AI 自動提取知識點

```
POST /api/venues/{venue_id}/knowledge/extract
```

**Request Body：**
```json
{
  "content_type": "text" | "file" | "url",
  "content": "客戶貼上的文字內容...",
  "file_url": "https://...",  // 如果是檔案上傳
  "source_url": "https://..." // 如果是網址
}
```

**Expected Response：**
```json
{
  "success": true,
  "batch_id": "batch_20260218_001",
  "message": "已開始處理，預計提取 5-10 條知識點",
  "status": "processing"
}
```

**處理邏輯：**
1. 接收內容後，呼叫 OpenAI API 進行知識提取
2. 將提取結果存入 `knowledge_items` 表，狀態設為 `pending`
3. 建立一個 `learning_batch` 記錄，關聯所有提取的知識項目
4. 可以是同步或非同步處理（建議非同步，前端會輪詢狀態）

---

### 2. 學習批次列表

**用途：** 顯示客戶的學習歷史記錄

```
GET /api/venues/{venue_id}/knowledge/batches
```

**Query Parameters：**
- `status`: `all` | `processing` | `pending_review` | `completed`（可選）
- `limit`: 數量限制（預設 20）

**Expected Response：**
```json
{
  "batches": [
    {
      "batch_id": "batch_20260218_001",
      "created_at": "2026-02-18T10:30:00Z",
      "source_type": "text",
      "status": "pending_review",
      "total_items": 8,
      "approved_count": 3,
      "rejected_count": 1,
      "pending_count": 4
    }
  ]
}
```

---

### 3. 批次詳情（審核頁面用）

**用途：** 取得單一批次的所有知識項目，供客戶逐條審核

```
GET /api/venues/{venue_id}/knowledge/batches/{batch_id}
```

**Expected Response：**
```json
{
  "batch_id": "batch_20260218_001",
  "created_at": "2026-02-18T10:30:00Z",
  "source_type": "text",
  "original_content": "客戶原始貼上的內容...",
  "status": "pending_review",
  "knowledge_items": [
    {
      "id": 101,
      "status": "pending",
      "category": "房型介紹",
      "title": "豪華雙人房特色",
      "content": "豪華雙人房配有獨立陽台，可欣賞山景...",
      "original_text": "AI 從原文中提取的片段",
      "ai_confidence": 0.92,
      "created_at": "2026-02-18T10:30:05Z"
    },
    {
      "id": 102,
      "status": "approved",
      "category": "價格資訊",
      "title": "平日房價",
      "content": "平日雙人房定價 NT$3,800...",
      "original_text": "...",
      "ai_confidence": 0.88,
      "created_at": "2026-02-18T10:30:05Z"
    }
  ]
}
```

---

### 4. 單條知識審核 - 確認

**用途：** 客戶確認某條 AI 提取的知識是正確的

```
PUT /api/venues/{venue_id}/knowledge/{knowledge_id}/approve
```

**Expected Response：**
```json
{
  "success": true,
  "knowledge_id": 101,
  "status": "approved",
  "message": "知識已確認並生效"
}
```

**處理邏輯：**
- 將 `status` 從 `pending` 改為 `approved`
- 該知識項目正式納入場域知識庫，AI 對話時可引用

---

### 5. 單條知識審核 - 拒絕

**用途：** 客戶拒絕某條 AI 提取錯誤的知識

```
PUT /api/venues/{venue_id}/knowledge/{knowledge_id}/reject
```

**Request Body（可選）：**
```json
{
  "reason": "內容不正確" // 可選，記錄拒絕原因
}
```

**Expected Response：**
```json
{
  "success": true,
  "knowledge_id": 102,
  "status": "rejected",
  "message": "已拒絕此知識項目"
}
```

---

### 6. 單條知識 - 編輯後儲存

**用途：** 客戶微調 AI 提取的內容後儲存（同時確認）

```
PUT /api/venues/{venue_id}/knowledge/{knowledge_id}
```

**Request Body：**
```json
{
  "category": "房型介紹",
  "title": "豪華雙人房特色（已修改）",
  "content": "客戶修改後的內容..."
}
```

**Expected Response：**
```json
{
  "success": true,
  "knowledge": {
    "id": 101,
    "status": "approved",
    "category": "房型介紹",
    "title": "豪華雙人房特色（已修改）",
    "content": "客戶修改後的內容...",
    "updated_at": "2026-02-18T11:00:00Z"
  }
}
```

---

### 7. 批次一鍵全部確認

**用途：** 客戶快速確認整個批次的所有 pending 項目

```
POST /api/venues/{venue_id}/knowledge/batches/{batch_id}/approve-all
```

**Expected Response：**
```json
{
  "success": true,
  "approved_count": 4,
  "message": "已確認 4 條知識項目"
}
```

---

## 📊 資料庫 Schema 建議

### learning_batches 表
```sql
CREATE TABLE learning_batches (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(50) UNIQUE NOT NULL,
  venue_id VARCHAR(50) NOT NULL,
  source_type VARCHAR(20) NOT NULL, -- 'text', 'file', 'url'
  original_content TEXT,
  source_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'processing', -- 'processing', 'pending_review', 'completed'
  total_items INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### knowledge_items 表（可能已存在，需新增欄位）
```sql
-- 新增欄位
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS batch_id VARCHAR(50);
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
-- status: 'pending', 'approved', 'rejected'
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS original_text TEXT;
```

---

## 🔐 權限驗證要點

1. **所有 API 都必須驗證 JWT Token**
2. **驗證 `venue_id` 屬於當前用戶**
   ```python
   # 範例邏輯
   user_venues = get_user_venues(current_user.id)
   if venue_id not in user_venues:
       raise HTTPException(403, "無權存取此場域")
   ```
3. **批次和知識項目的 venue_id 必須匹配**

---

## 📝 前端整合時程

當這些 API 準備好後，前端（Emergent 團隊）將：
1. 串接「開始學習」按鈕 → `POST /extract`
2. 實作「批次審核」頁面 → `GET /batches/{id}`
3. 實作知識卡片的「確認/拒絕/編輯」功能

**請在 API 準備好後通知我們，我們會進行前端整合測試。**

---

## ❓ 待確認問題

1. AI 知識提取要用同步還是非同步處理？
2. 知識提取的 OpenAI Prompt 模板需要我們提供還是你們設計？
3. 是否需要支援檔案上傳（PDF/DOC）？如果需要，檔案存儲方案是？

---

感謝 Manus 團隊的支援！有任何問題請隨時聯繫。

**Kenneth**
人客多團隊
