import { useState, useRef } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
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
  File
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";

export const AILearningTab = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [urls, setUrls] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

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
    // 模擬處理
    setTimeout(() => {
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'learned' })));
      setUrls(prev => prev.map(u => ({ ...u, status: 'learned' })));
      setRules(prev => prev.map(r => ({ ...r, status: 'learned' })));
      setIsProcessing(false);
    }, 2000);
  };

  const pendingCount = uploadedFiles.filter(f => f.status === 'pending').length +
                       urls.filter(u => u.status === 'pending').length +
                       rules.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            AI 學習中心
          </h2>
          <p className="text-[#8b949e] mt-1 ml-13">上傳資料、輸入規則，優化您的 AI 銷售風格</p>
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

      {/* 三種輸入方式 */}
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
        <TabsContent value="upload" className="mt-6">
          <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/15 flex items-center justify-center">
                <File className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">上傳 PDF 或文件</h3>
                <p className="text-sm text-[#8b949e]">支援 PDF、DOC、TXT 格式，AI 會從中學習您的業務資訊</p>
              </div>
            </div>

            {/* 上傳區域 */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#27272a] rounded-xl p-8 text-center cursor-pointer hover:border-[#FF6B35]/50 transition-colors"
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
                <Loader2 className="w-12 h-12 text-[#FF6B35] mx-auto mb-4 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
              )}
              <p className="text-[#8b949e] mb-2">點擊或拖曳檔案到此處</p>
              <p className="text-xs text-[#52525b]">支援 PDF、DOC、TXT，最大 10MB</p>
            </div>

            {/* 已上傳檔案列表 */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-medium text-[#8b949e]">待學習檔案</h4>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#1a1f26] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#FF6B35]" />
                      <div>
                        <p className="text-white text-sm">{file.name}</p>
                        <p className="text-xs text-[#52525b]">{file.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'learned' ? (
                        <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">已學習</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-400 border-0">待處理</Badge>
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
        <TabsContent value="url" className="mt-6">
          <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#00B4D8]/15 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#00B4D8]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">輸入網址</h3>
                <p className="text-sm text-[#8b949e]">AI 會爬取網頁內容並學習，適合官網、FAQ 頁面等</p>
              </div>
            </div>

            {/* 輸入框 */}
            <div className="flex gap-3 mb-6">
              <Input 
                placeholder="https://example.com/your-page"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="bg-[#1a1f26] border-[#27272a] text-white flex-1"
              />
              <Button onClick={handleAddUrl} className="bg-[#00B4D8] hover:bg-[#0096B4] text-white">
                <Plus className="w-4 h-4 mr-1" />
                新增
              </Button>
            </div>

            {/* 已新增網址列表 */}
            {urls.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[#8b949e]">待學習網址</h4>
                {urls.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#1a1f26] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Link className="w-5 h-5 text-[#00B4D8]" />
                      <p className="text-white text-sm truncate max-w-md">{item.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'learned' ? (
                        <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">已學習</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-400 border-0">待處理</Badge>
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
        <TabsContent value="rules" className="mt-6">
          <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 flex items-center justify-center">
                <PenLine className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">自訂規則</h3>
                <p className="text-sm text-[#8b949e]">直接告訴 AI 特定的回覆規則或業務邏輯</p>
              </div>
            </div>

            {/* 輸入框 */}
            <div className="mb-6">
              <Textarea 
                placeholder="例如：當客戶詢問價格時，先確認入住日期和人數，再提供報價..."
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="bg-[#1a1f26] border-[#27272a] text-white min-h-[100px] mb-3"
              />
              <Button onClick={handleAddRule} className="bg-[#22c55e] hover:bg-[#16a34a] text-white">
                <Plus className="w-4 h-4 mr-1" />
                新增規則
              </Button>
            </div>

            {/* 已新增規則列表 */}
            {rules.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[#8b949e]">待學習規則</h4>
                {rules.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between bg-[#1a1f26] rounded-lg p-3">
                    <div className="flex items-start gap-3 flex-1">
                      <BookOpen className="w-5 h-5 text-[#22c55e] mt-0.5" />
                      <p className="text-white text-sm">{item.rule}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {item.status === 'learned' ? (
                        <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">已學習</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-400 border-0">待處理</Badge>
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

      {/* 已學習內容 */}
      <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">已學習內容</h3>
              <p className="text-sm text-[#8b949e]">AI 已經學習並應用的資料</p>
            </div>
          </div>
          <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">
            {learnedContent.length} 項
          </Badge>
        </div>

        <div className="space-y-2">
          {learnedContent.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between bg-[#1a1f26] rounded-lg p-3">
              <div className="flex items-center gap-3">
                {item.type === 'file' && <FileText className="w-5 h-5 text-[#FF6B35]" />}
                {item.type === 'url' && <Globe className="w-5 h-5 text-[#00B4D8]" />}
                {item.type === 'rule' && <BookOpen className="w-5 h-5 text-[#22c55e]" />}
                <div>
                  <p className="text-white text-sm">{item.name}</p>
                  <p className="text-xs text-[#52525b]">學習日期：{item.date}</p>
                </div>
              </div>
              <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">已應用</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* 提示 */}
      <div className="flex items-center gap-2 text-xs text-[#52525b]">
        <AlertTriangle className="w-3 h-3" />
        <span>AI 學習後的效果可能需要 1-2 天才會完全反映在對話中</span>
      </div>
    </div>
  );
};
