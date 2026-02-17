import { useState, useRef } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { 
  Brain,
  Upload,
  Link,
  FileText,
  PenLine,
  CheckCircle2,
  Loader2,
  X,
  Plus,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Globe,
  File,
  Building2,
  History,
  MessageCircle,
  Send,
  LayoutGrid,
  Clock,
  Undo2,
  Lock,
  Zap,
  Bot,
  Users,
  UserPlus
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

// 模擬場域數據
const VENUES = [
  { id: 'senshan', name: '森山寫照', logo: null, isActive: true },
  { id: 'lakeze', name: '湖澤會館', logo: null, isActive: false },
  { id: 'mountain', name: '山林小屋', logo: null, isActive: false },
];

// 模擬版本歷史
const VERSION_HISTORY = [
  { 
    version: 'v3.2', 
    date: '2026-02-17', 
    isCurrent: true,
    summary: '新增價格優惠回覆規則、強化日期查詢邏輯、優化寵物政策說明',
    changes: ['學習了 3 個新規則', '更新了報價流程', '改進了問候語'],
    canRollback: false
  },
  { 
    version: 'v3.1', 
    date: '2026-02-10', 
    isCurrent: false,
    summary: '加入淡季促銷話術、更新房型介紹',
    changes: ['學習了 5 個新規則', '新增房型資訊'],
    canRollback: true // 基礎版只能回滾上一個版本
  },
  { 
    version: 'v3.0', 
    date: '2026-02-01', 
    isCurrent: false,
    summary: '基礎版本，包含標準接單流程',
    changes: ['初始化模型', '建立基礎對話流程'],
    canRollback: false,
    requiresUpgrade: true
  },
  { 
    version: 'v2.9', 
    date: '2026-01-25', 
    isCurrent: false,
    summary: '舊版本',
    changes: [],
    canRollback: false,
    requiresUpgrade: true
  },
];

// 模擬已學習的規則總結
const LEARNED_RULES_SUMMARY = {
  totalRules: 156,
  categories: [
    { name: '價格與報價', count: 42, examples: ['詢問價格時先確認日期人數', '提供早鳥優惠資訊'] },
    { name: '房型介紹', count: 35, examples: ['詳細說明各房型特色', '推薦適合的房型'] },
    { name: '預約流程', count: 28, examples: ['說明訂金支付方式', '確認入住時間'] },
    { name: '設施與服務', count: 25, examples: ['介紹周邊景點', '說明早餐服務'] },
    { name: '特殊需求', count: 18, examples: ['寵物政策說明', '加床服務'] },
    { name: '其他', count: 8, examples: ['問候語', '結束語'] },
  ]
};

// 預設測試問題
const PRESET_QUESTIONS = [
  '請問 3/15-3/17 兩大一小住宿多少錢？',
  '可以帶狗狗入住嗎？',
  '有停車位嗎？',
  '早餐包含嗎？幾點供應？',
  '現在有什麼優惠活動？',
  '請問怎麼預約？需要付訂金嗎？',
];

// 模擬 AI 回覆
const simulateAIResponse = (question) => {
  const responses = {
    '請問 3/15-3/17 兩大一小住宿多少錢？': '您好！感謝您的詢問 ❤️\n\n3/15-3/17 兩晚，2大1小的話，我推薦您入住我們的「山景雙人房」，可加床（小朋友免費）。\n\n📌 房價：平日 $3,800/晚 × 2晚 = $7,600\n📌 含早餐、免費停車\n\n目前有早鳥優惠，提前 14 天預訂可享 9 折！\n\n請問要幫您保留嗎？',
    '可以帶狗狗入住嗎？': '您好！我們非常歡迎毛小孩入住喔 🐕\n\n📌 寵物友善房型：山景雙人房、湖景四人房\n📌 寵物清潔費：$500/隻/次\n📌 需自備寵物用品（睡墊、食盆等）\n\n請問您的狗狗是什麼品種、多大呢？',
    '有停車位嗎？': '有的！我們提供免費停車服務 🚗\n\n📌 戶外停車場可停約 10 台車\n📌 如開大型車輛請提前告知\n\n請問還有其他問題嗎？',
    '早餐包含嗎？幾點供應？': '是的，我們的房價都含早餐喔！🍳\n\n📌 早餐時間：08:00 - 10:00\n📌 供應地點：1樓餐廳\n📌 菜色：中西式自助早餐\n\n如有特殊飲食需求（素食、過敏等），請提前告知我們～',
    '現在有什麼優惠活動？': '目前有以下優惠活動：🎉\n\n1️⃣ 早鳥優惠：提前 14 天預訂享 9 折\n2️⃣ 連住優惠：連住 3 晚以上享 85 折\n3️⃣ 平日優惠：週日至週四入住減 $500\n\n以上優惠可擇一使用，請問您預計什麼時候入住呢？',
    '請問怎麼預約？需要付訂金嗎？': '預約流程很簡單！📝\n\n1️⃣ 確認日期和房型\n2️⃣ 支付 30% 訂金（可線上刷卡或轉帳）\n3️⃣ 收到訂房確認信\n4️⃣ 入住當天付清尾款\n\n訂金可於入住前 7 天免費取消，7 天內取消會扣除訂金。\n\n請問要幫您查詢空房嗎？',
  };
  return responses[question] || '感謝您的詢問！請問您想了解什麼呢？我可以幫您查詢房況、報價，或回答任何關於住宿的問題 😊';
};

export const AILearningTab = () => {
  const [currentVenue, setCurrentVenue] = useState('senshan');
  const [venueLogos, setVenueLogos] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [urls, setUrls] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [richMenuEnabled, setRichMenuEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState('T1');
  const [testInput, setTestInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const currentVenueData = VENUES.find(v => v.id === currentVenue);
  const currentVersion = VERSION_HISTORY.find(v => v.isCurrent);
  const currentLogo = venueLogos[currentVenue];

  // 模擬已學習的內容
  const learnedContent = [
    { type: 'file', name: '森山寫照房型介紹.pdf', date: '2026-02-15', status: 'learned' },
    { type: 'url', name: 'https://lakeze.com/faq', date: '2026-02-14', status: 'learned' },
    { type: 'rule', name: '客戶詢問價格時，先確認入住日期', date: '2026-02-13', status: 'learned' },
  ];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setIsUploading(true);
      setTimeout(() => {
        const newFiles = files.map(file => ({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          status: 'pending'
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setIsUploading(false);
      }, 1000);
    }
  };

  const handleAddUrl = () => {
    if (newUrl.trim() && (newUrl.startsWith('http://') || newUrl.startsWith('https://'))) {
      setUrls(prev => [...prev, { url: newUrl, status: 'pending' }]);
      setNewUrl('');
    }
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules(prev => [...prev, { rule: newRule, status: 'pending' }]);
      setNewRule('');
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUrl = (index) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveRule = (index) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitLearning = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'learned' })));
      setUrls(prev => prev.map(u => ({ ...u, status: 'learned' })));
      setRules(prev => prev.map(r => ({ ...r, status: 'learned' })));
      setIsProcessing(false);
    }, 2000);
  };

  const handleSendTestMessage = (message) => {
    const msg = message || testInput;
    if (!msg.trim()) return;
    
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setTestInput('');
    setIsTyping(true);
    
    setTimeout(() => {
      const response = simulateAIResponse(msg);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleRollback = (version) => {
    if (version.requiresUpgrade) {
      alert('基礎版僅支援回滾至上一個版本。如需回滾到更早的版本，請升級至專業版。');
      return;
    }
    if (!version.canRollback) {
      alert('此版本無法回滾。基礎版僅支援回滾至上一個版本。');
      return;
    }
    if (confirm(`確定要回滾到 ${version.version} 嗎？這將會覆蓋目前的設定。`)) {
      alert(`已回滾到 ${version.version}`);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVenueLogos(prev => ({
          ...prev,
          [currentVenue]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const pendingCount = uploadedFiles.filter(f => f.status === 'pending').length +
                       urls.filter(u => u.status === 'pending').length +
                       rules.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Venue Header - 大型場域顯示區 */}
      <div className="bg-gradient-to-r from-[#1a1f26] to-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* 場域 LOGO 和名稱 */}
          <div className="flex items-center gap-5">
            {/* LOGO 上傳區 */}
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="relative w-20 h-20 rounded-2xl bg-[#27272a] border-2 border-dashed border-[#3f3f46] flex items-center justify-center cursor-pointer hover:border-[#FF6B35] transition-colors group overflow-hidden"
            >
              <input 
                ref={logoInputRef}
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {currentLogo ? (
                <>
                  <img src={currentLogo} alt={currentVenueData?.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Building2 className="w-8 h-8 text-[#52525b] mx-auto mb-1" />
                  <span className="text-[10px] text-[#52525b]">上傳 LOGO</span>
                </div>
              )}
            </div>
            
            {/* 場域名稱和說明 */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white">{currentVenueData?.name}</h1>
                <Badge className="bg-[#FF6B35]/15 text-[#FF6B35] border-0">目前場域</Badge>
              </div>
              <p className="text-[#8b949e] text-sm">正在管理此場域的 AI 學習內容</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-[#52525b]">
                  <Bot className="w-3.5 h-3.5" />
                  <span>客服模型 {currentVersion?.version}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#52525b]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>已學習 {LEARNED_RULES_SUMMARY.totalRules} 條規則</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 場域切換選擇器 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8b949e]">切換場域：</span>
            <Select value={currentVenue} onValueChange={setCurrentVenue}>
              <SelectTrigger className="w-[180px] bg-[#27272a] border-[#3f3f46] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a]">
                {VENUES.map(venue => (
                  <SelectItem 
                    key={venue.id} 
                    value={venue.id}
                    className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white"
                  >
                    <div className="flex items-center gap-2">
                      {venueLogos[venue.id] ? (
                        <img src={venueLogos[venue.id]} alt={venue.name} className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <Building2 className="w-4 h-4 text-[#52525b]" />
                      )}
                      {venue.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* AI 學習中心標題 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            AI 學習中心
          </h2>
          <p className="text-[#8b949e] mt-1 text-sm">上傳資料、輸入規則，優化您的 AI 銷售風格</p>
        </div>
        
        {pendingCount > 0 && (
          <Button 
            onClick={handleSubmitLearning}
            disabled={isProcessing}
            className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                開始學習 ({pendingCount} 項)
              </>
            )}
          </Button>
        )}
      </div>

      {/* Current Version Banner */}
      <div className="bg-gradient-to-r from-[#FF6B35]/10 to-[#00B4D8]/10 rounded-xl p-4 border border-[#FF6B35]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">客服模型 {currentVersion?.version}</span>
                <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">目前版本</Badge>
              </div>
              <p className="text-xs text-[#8b949e]">
                生效日期：{currentVersion?.date} · {currentVersion?.summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Learning & Rules */}
        <div className="xl:col-span-2 space-y-6">
          {/* Learning Input Tabs */}
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="bg-[#18181b] border border-[#27272a] p-1 rounded-xl">
              <TabsTrigger 
                value="upload"
                className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                上傳檔案
              </TabsTrigger>
              <TabsTrigger 
                value="url"
                className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4"
              >
                <Globe className="w-4 h-4 mr-2" />
                輸入網址
              </TabsTrigger>
              <TabsTrigger 
                value="rules"
                className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4"
              >
                <PenLine className="w-4 h-4 mr-2" />
                自訂規則
              </TabsTrigger>
            </TabsList>

            {/* 上傳檔案 */}
            <TabsContent value="upload" className="mt-4">
              <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/15 flex items-center justify-center">
                    <File className="w-4 h-4 text-[#FF6B35]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">上傳 PDF 或文件</h3>
                    <p className="text-xs text-[#8b949e]">AI 會從中學習您的業務資訊</p>
                  </div>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#27272a] rounded-xl p-6 text-center cursor-pointer hover:border-[#FF6B35]/50 transition-colors"
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 text-[#FF6B35] mx-auto mb-3 animate-spin" />
                  ) : (
                    <Upload className="w-10 h-10 text-[#52525b] mx-auto mb-3" />
                  )}
                  <p className="text-sm text-[#8b949e]">點擊或拖曳檔案</p>
                  <p className="text-xs text-[#52525b]">PDF、DOC、TXT，最大 10MB</p>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#1a1f26] rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#FF6B35]" />
                          <span className="text-white text-sm">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.status === 'learned' ? (
                            <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">已學習</Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">待處理</Badge>
                          )}
                          <button onClick={() => handleRemoveFile(idx)} className="text-[#52525b] hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 輸入網址 */}
            <TabsContent value="url" className="mt-4">
              <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#00B4D8]/15 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-[#00B4D8]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">輸入網址</h3>
                    <p className="text-xs text-[#8b949e]">AI 會爬取網頁內容並學習</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <Input 
                    placeholder="https://example.com/your-page"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="bg-[#1a1f26] border-[#27272a] text-white flex-1"
                  />
                  <Button onClick={handleAddUrl} className="bg-[#00B4D8] hover:bg-[#0096B4] text-white">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {urls.length > 0 && (
                  <div className="space-y-2">
                    {urls.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#1a1f26] rounded-lg p-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Link className="w-4 h-4 text-[#00B4D8] flex-shrink-0" />
                          <span className="text-white text-sm truncate">{item.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'learned' ? (
                            <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">已學習</Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">待處理</Badge>
                          )}
                          <button onClick={() => handleRemoveUrl(idx)} className="text-[#52525b] hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 自訂規則 */}
            <TabsContent value="rules" className="mt-4">
              <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#22c55e]/15 flex items-center justify-center">
                    <PenLine className="w-4 h-4 text-[#22c55e]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">自訂規則</h3>
                    <p className="text-xs text-[#8b949e]">直接告訴 AI 特定的回覆規則</p>
                  </div>
                </div>

                <div className="mb-4">
                  <Textarea 
                    placeholder="例如：當客戶詢問價格時，先確認入住日期和人數..."
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    className="bg-[#1a1f26] border-[#27272a] text-white min-h-[80px] mb-2"
                  />
                  <Button onClick={handleAddRule} className="bg-[#22c55e] hover:bg-[#16a34a] text-white">
                    <Plus className="w-4 h-4 mr-1" />
                    新增規則
                  </Button>
                </div>

                {rules.length > 0 && (
                  <div className="space-y-2">
                    {rules.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between bg-[#1a1f26] rounded-lg p-2.5">
                        <div className="flex items-start gap-2 flex-1">
                          <BookOpen className="w-4 h-4 text-[#22c55e] mt-0.5 flex-shrink-0" />
                          <span className="text-white text-sm">{item.rule}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {item.status === 'learned' ? (
                            <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">已學習</Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">待處理</Badge>
                          )}
                          <button onClick={() => handleRemoveRule(idx)} className="text-[#52525b] hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* AI 模型選擇 */}
          <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/15 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">AI 銷售模型</h3>
                <p className="text-sm text-[#8b949e]">選擇 AI 與客戶互動的風格</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* T1 模型 */}
              <div 
                onClick={() => setSelectedModel('T1')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedModel === 'T1' 
                    ? 'border-[#FF6B35] bg-[#FF6B35]/10' 
                    : 'border-[#27272a] bg-[#1a1f26] hover:border-[#3f3f46]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">T1 模型</span>
                    <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">預設</Badge>
                    {selectedModel === 'T1' && (
                      <Badge className="bg-[#FF6B35]/15 text-[#FF6B35] border-0 text-xs">使用中</Badge>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedModel === 'T1' ? 'border-[#FF6B35]' : 'border-[#3f3f46]'
                  }`}>
                    {selectedModel === 'T1' && (
                      <div className="w-3 h-3 rounded-full bg-[#FF6B35]" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#8b949e]">簡潔有力，逐步引導客戶訂房和付費</p>
              </div>

              {/* T2 模型 */}
              <div 
                onClick={() => {
                  setSelectedModel('T2');
                  setTimeout(() => {
                    alert('T2 模型為專業版功能，請升級後使用。目前將繼續使用 T1 模型。');
                    setSelectedModel('T1');
                  }, 100);
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                  selectedModel === 'T2' 
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/10' 
                    : 'border-[#27272a] bg-[#1a1f26] hover:border-[#3f3f46]'
                }`}
              >
                {/* 專業版標籤 */}
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white border-0 text-xs px-2 shadow-lg">
                    <Lock className="w-3 h-3 mr-1" />
                    專業版
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">T2 模型</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedModel === 'T2' ? 'border-[#8B5CF6]' : 'border-[#3f3f46]'
                  }`}>
                    {selectedModel === 'T2' && (
                      <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#8b949e]">主動考量客戶整體需求，協助成交</p>
                <p className="text-xs text-[#52525b] mt-2">升級專業版即可使用此模型</p>
              </div>
            </div>
          </div>

          {/* 圖文選單設定 - 工程師協助設定 */}
          <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">圖文選單設定</h3>
                <p className="text-sm text-[#8b949e]">讓 AI 與 LINE OA 圖文選單協作</p>
              </div>
            </div>
            
            {/* 警告提示 */}
            <div className="mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">請勿自行操作</p>
                  <p className="text-xs text-[#8b949e] mt-1">
                    此功能需要由我們的工程師協助設定。請將您的 LINE OA 管理員權限授予我們的工程師，以確保系統正常運作。
                  </p>
                </div>
              </div>
            </div>
            
            {/* LINE Channel Access Token */}
            <div className="mb-4">
              <label className="text-sm text-[#8b949e] mb-2 block">LINE Channel Access Token</label>
              <div className="flex gap-2">
                <Input 
                  type="password"
                  placeholder="由工程師設定"
                  disabled
                  className="bg-[#1a1f26] border-[#27272a] text-[#52525b] flex-1"
                />
                <Button 
                  disabled
                  className="bg-[#27272a] text-[#52525b] cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 mr-1" />
                  儲存
                </Button>
              </div>
              <p className="text-xs text-[#52525b] mt-1">此欄位由工程師協助填寫</p>
            </div>
            
            {/* 同步按鈕 */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">從 LINE 同步圖文選單</p>
                  <p className="text-xs text-[#52525b]">同步後，AI 將可識別圖文選單的按鈕</p>
                </div>
                <Button 
                  disabled
                  className="bg-[#27272a] text-[#52525b] cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  從 LINE 同步
                </Button>
              </div>
            </div>
            
            {/* 已同步的關鍵字（模擬已設定的狀態） */}
            <div className="p-4 bg-[#1a1f26] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span className="text-sm text-white">已同步關鍵字</span>
                </div>
                <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">
                  3 個
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-[#27272a] text-[#8b949e] border-0">我想訂房</Badge>
                <Badge className="bg-[#27272a] text-[#8b949e] border-0">查看房價</Badge>
                <Badge className="bg-[#27272a] text-[#8b949e] border-0">查看設施</Badge>
              </div>
              <p className="text-xs text-[#52525b]">
                最後同步：2026-02-17 10:30 · 當用戶點擊這些按鈕時，AI 將不會重複回覆
              </p>
            </div>
            
            {/* 聯繫工程師 */}
            <div className="mt-4 p-3 bg-[#8B5CF6]/10 rounded-lg border border-[#8B5CF6]/20">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#8B5CF6]" />
                <p className="text-sm text-[#8B5CF6]">
                  需要設定圖文選單？請聯繫我們的工程師協助。
                </p>
              </div>
            </div>
          </div>

          {/* Learned Rules Summary */}
          <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">已學習規則總結</h3>
                  <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">
                    {LEARNED_RULES_SUMMARY.totalRules} 條
                  </Badge>
                </div>
                <p className="text-xs text-[#8b949e]">
                  模型版本：{currentVersion?.version} · 生效日期：{currentVersion?.date}
                </p>
              </div>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              {LEARNED_RULES_SUMMARY.categories.map((cat, idx) => (
                <AccordionItem 
                  key={idx} 
                  value={`item-${idx}`}
                  className="border border-[#27272a] rounded-lg bg-[#1a1f26] px-3"
                >
                  <AccordionTrigger className="text-white text-sm hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <span>{cat.name}</span>
                      <Badge className="bg-[#FF6B35]/15 text-[#FF6B35] border-0 text-xs">
                        {cat.count}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-[#8b949e] text-sm pb-3">
                    <ul className="space-y-1">
                      {cat.examples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#52525b]">•</span>
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Version History */}
          <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <History className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">版本歷史</h3>
                <p className="text-xs text-[#8b949e]">基礎版僅支援回滾至上一個版本</p>
              </div>
            </div>

            <div className="space-y-2">
              {VERSION_HISTORY.map((version, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border ${
                    version.isCurrent 
                      ? 'bg-[#FF6B35]/10 border-[#FF6B35]/30' 
                      : 'bg-[#1a1f26] border-[#27272a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{version.version}</span>
                      {version.isCurrent && (
                        <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs">目前</Badge>
                      )}
                      {version.canRollback && (
                        <Badge className="bg-[#00B4D8]/15 text-[#00B4D8] border-0 text-xs">可回滾</Badge>
                      )}
                      {version.requiresUpgrade && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          需升級
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#52525b]">{version.date}</span>
                      {!version.isCurrent && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleRollback(version)}
                          disabled={!version.canRollback && !version.requiresUpgrade}
                          className={`h-7 px-2 text-xs ${
                            version.canRollback 
                              ? 'text-[#00B4D8] hover:text-[#00B4D8] hover:bg-[#00B4D8]/10' 
                              : version.requiresUpgrade
                                ? 'text-amber-400 hover:text-amber-400 hover:bg-amber-400/10'
                                : 'text-[#3f3f46] cursor-not-allowed'
                          }`}
                        >
                          <Undo2 className="w-3 h-3 mr-1" />
                          {version.requiresUpgrade ? '升級回滾' : '回滾'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#8b949e]">{version.summary}</p>
                </div>
              ))}
            </div>
            
            {/* 升級提示 */}
            <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">升級至專業版</p>
                  <p className="text-xs text-[#8b949e]">可回滾至任意歷史版本，並享有更多進階功能</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Test Chat */}
        <div className="xl:col-span-1">
          <div className="bg-[#0d1117] rounded-2xl border-2 border-[#27272a] h-[700px] flex flex-col sticky top-4">
            {/* Chat Header */}
            <div className="p-4 border-b border-[#27272a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00B4D8]/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#00B4D8]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">測試對話</h3>
                  <p className="text-xs text-[#8b949e]">測試 {currentVersion?.version} 的回覆效果</p>
                </div>
              </div>
            </div>
            
            {/* 角色說明 */}
            <div className="p-3 border-b border-[#27272a] bg-[#FF6B35]/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center">
                  <Users className="w-3 h-3 text-white" />
                </div>
                <p className="text-xs text-[#FF6B35]">
                  <span className="font-semibold">您正在扮演客戶</span> · 輸入客戶可能會問的問題來測試 AI 回覆
                </p>
              </div>
            </div>

            {/* Preset Questions */}
            <div className="p-3 border-b border-[#27272a] bg-[#1a1f26]/50">
              <p className="text-xs text-[#8b949e] mb-2">常見客戶問題：</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_QUESTIONS.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendTestMessage(q)}
                    className="text-xs px-2 py-1 rounded-full bg-[#27272a] text-[#8b949e] hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] transition-colors truncate max-w-[150px]"
                  >
                    {q.length > 15 ? q.substring(0, 15) + '...' : q}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  {/* 模擬客戶加入場景 */}
                  <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 flex items-center justify-center mb-4">
                    <UserPlus className="w-8 h-8 text-[#22c55e]" />
                  </div>
                  <p className="text-white text-sm font-medium mb-2">模擬：客戶剛加入 LINE</p>
                  <p className="text-[#8b949e] text-xs mb-4">
                    想像您是一位剛加入 LINE 官方帳號的客戶，<br/>
                    正準備詢問第一個問題
                  </p>
                  <div className="w-full max-w-[200px] space-y-2">
                    <p className="text-[#52525b] text-xs mb-2">試試這些開場白：</p>
                    <button
                      onClick={() => handleSendTestMessage('你好')}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-[#27272a] text-[#8b949e] hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] transition-colors"
                    >
                      "你好"
                    </button>
                    <button
                      onClick={() => handleSendTestMessage('請問還有空房嗎？')}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-[#27272a] text-[#8b949e] hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] transition-colors"
                    >
                      "請問還有空房嗎？"
                    </button>
                    <button
                      onClick={() => handleSendTestMessage('我想訂房')}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-[#27272a] text-[#8b949e] hover:bg-[#FF6B35]/20 hover:text-[#FF6B35] transition-colors"
                    >
                      "我想訂房"
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-[#FF6B35] text-white rounded-br-md' 
                          : 'bg-[#1a1f26] text-[#c9d1d9] rounded-bl-md border border-[#27272a]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1f26] rounded-2xl rounded-bl-md px-4 py-2 border border-[#27272a]">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#52525b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-[#52525b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-[#52525b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-[#27272a]">
              <p className="text-xs text-[#52525b] mb-2 text-center">以客戶身份輸入問題</p>
              <div className="flex gap-2">
                <Input 
                  placeholder="扮演客戶：輸入您的問題..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                  className="bg-[#1a1f26] border-[#27272a] text-white flex-1"
                />
                <Button 
                  onClick={() => handleSendTestMessage()}
                  className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-center gap-2 text-xs text-[#52525b]">
        <AlertTriangle className="w-3 h-3" />
        <span>AI 學習後的效果可能需要數小時才會完全反映在對話中</span>
      </div>
    </div>
  );
};
