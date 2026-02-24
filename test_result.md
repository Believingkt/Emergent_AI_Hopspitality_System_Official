#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "多場域 AI 管家協作平台 - Emergent 自建後端版本。已完成 Step 1：MongoDB 後端 + Notion 配置 + Manus 資料遷移。新需求：1) 改善訂金金額輸入UI避免與對話混淆 2) 新增場域功能（含付費提示、頭貼上傳、名稱編輯、引導設定）"

backend:
  - task: "MongoDB 後端 + 資料遷移"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "完成 FastAPI + MongoDB 後端，從 Manus 遷移 47 tasks, 36 knowledge, 10 batches, 2 users"

  - task: "Notion Config Loader"
    implemented: true
    working: true
    file: "backend/config_loader.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "啟動時從 Notion 讀取 5 個 API Keys (Claude, OpenAI, LINE Token/Secret/ID) 並緩存到 MongoDB"

  - task: "Knowledge CRUD + AI Extract"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "知識庫完整 CRUD + OpenAI AI 萃取 + 批次審核 + 版本管理(P2)"

  - task: "Venue CRUD + Avatar Upload"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "新增 POST /api/venues (建立場域), PUT /api/venues/{id} (更新名稱), POST /api/venues/{id}/avatar (上傳頭貼), GET /api/venues 返回 avatar_url"
        - working: true
        - agent: "testing"
        - comment: "✅ 完整測試通過 - 所有 Venue CRUD API 正常工作: 登入驗證、場域取得、新增場域(預設名稱'新場域')、更新名稱描述、頭貼上傳(/api/uploads/)、avatar_url 正確返回。其他 API 如 Knowledge CRUD、Tasks 群組查詢也正常。共27項測試全通過。"

  - task: "LINE Messaging 串接"
    implemented: false
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
        - agent: "main"
        - comment: "Step 2 待開發：收發 LINE 訊息 + Webhook 即時同步"

  - task: "Notion 知識庫串接"
    implemented: false
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
        - agent: "main"
        - comment: "Step 3 待開發：從 Notion 頁面讀取知識作為知識庫來源"

frontend:
  - task: "完整前端 UI"
    implemented: true
    working: true
    file: "frontend/src/"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "登入、儀表板(4 tabs)、設定頁面、手機版，全部正常"

  - task: "訂金金額輸入UI改善"
    implemented: true
    working: true
    file: "frontend/src/components/dashboard/HandoffAnalysis.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
        - agent: "main"
        - comment: "將訂金確認從簡單input+button改為卡片式設計：NT$貨幣前綴、大字體金額輸入、明確標題「確認訂金匯款」、與對話區域完全區隔"

  - task: "場域新增功能"
    implemented: true
    working: true
    file: "frontend/src/components/layout/Header.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
        - agent: "main"
        - comment: "Header場域選擇器含頭貼+新增按鈕、付費提示Dialog、建立成功引導(3步驟)、設定頁場域名稱編輯+頭貼上傳"

metadata:
  created_by: "main_agent"
  version: "3.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "訂金金額輸入UI改善"
    - "場域新增功能"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
    - message: "新增了3個功能：1) Venue CRUD API (POST/PUT/avatar upload) 2) 訂金輸入UI卡片式重設計 3) Header場域選擇器含頭貼+新增+引導+設定頁編輯。請測試後端新增的 venue CRUD API endpoints。登入帳號: kenneth@lakeze.com / lakeze2026"
    - agent: "testing"
    - message: "✅ 後端測試完成 - 所有27項測試通過: Venue CRUD APIs (建立/更新/頭貼上傳)、認證、Knowledge管理、Tasks查詢 全部正常運作。系統穩定無重大問題。"