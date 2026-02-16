import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { 
  AlertCircle, 
  MessageSquare, 
  Calendar,
  DollarSign,
  HelpCircle,
  Clock,
  Lightbulb,
  Upload,
  Send,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://line-ai-bot-xiaosen.onrender.com';

// 轉交原因類別
const HANDOFF_REASONS = {
  pricing: { label: '價格詢問', icon: DollarSign, color: 'text-[#22c55e]', bgColor: 'bg-[#22c55e]/15', borderColor: 'border-[#22c55e]/30' },
  availability: { label: '房間/時段確認', icon: Calendar, color: 'text-[#00B4D8]', bgColor: 'bg-[#00B4D8]/15', borderColor: 'border-[#00B4D8]/30' },
  special: { label: '特殊需求', icon: HelpCircle, color: 'text-[#FF6B35]', bgColor: 'bg-[#FF6B35]/15', borderColor: 'border-[#FF6B35]/30' },
  complaint: { label: '投訴/問題', icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/30' },
  booking: { label: '預約流程', icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30' },
  other: { label: '其他', icon: MessageSquare, color: 'text-[#a1a1aa]', bgColor: 'bg-[#27272a]', borderColor: 'border-[#27272a]' },
};

// 根據客戶訊息內容智能判斷轉交原因
const detectHandoffReason = (customerMessage) => {
  const message = customerMessage.toLowerCase();
  
  if (message.includes('價') || message.includes('錢') || message.includes('多少') || message.includes('費用') || message.includes('划算')) {
    return 'pricing';
  }
  if (message.includes('空房') || message.includes('有房') || message.includes('日期') || message.includes('週') || message.includes('時段') || message.includes('預約')) {
    return 'availability';
  }
  if (message.includes('寵物') || message.includes('狗') || message.includes('貓') || message.includes('特殊') || message.includes('需求') || message.includes('婚禮') || message.includes('辦')) {
    return 'special';
  }
  if (message.includes('投訴') || message.includes('問題') || message.includes('異味') || message.includes('抱歉') || message.includes('不好')) {
    return 'complaint';
  }
  if (message.includes('訂') || message.includes('預') || message.includes('怎麼') || message.includes('流程') || message.includes('匯款')) {
    return 'booking';
  }
  
  return 'other';
};

// 將 API 任務數據轉換為轉交對話格式
const transformTaskToHandoff = (task) => {
  return {
    id: `task-${task.task_id}`,
    timestamp: task.created_at,
    customerMessage: task.customer_message,
    aiResponse: task.ai_response,
    reason: detectHandoffReason(task.customer_message),
    customerName: task.customer_name || '未知客戶',
    status: task.status,
    hasLearned: false,
  };
};

const HandoffCard = ({ handoff, onLearn }) => {
  const [showLearnInput, setShowLearnInput] = useState(false);
  const [learnText, setLearnText] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  
  const reason = HANDOFF_REASONS[handoff.reason] || HANDOFF_REASONS.other;
  const ReasonIcon = reason.icon;
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmitLearn = () => {
    if (!learnText.trim() && !uploadedImage) {
      toast.error('請輸入回覆規則或上傳截圖');
      return;
    }
    onLearn(handoff.id, { text: learnText, image: uploadedImage });
    setShowLearnInput(false);
    setLearnText('');
    setUploadedImage(null);
    toast.success('已提交 AI 學習請求');
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="bg-[#18181b] rounded-xl border border-[#27272a] overflow-hidden hover:border-[#FF6B35]/30 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${reason.bgColor} flex items-center justify-center`}>
            <ReasonIcon className={`w-4 h-4 ${reason.color}`} />
          </div>
          <div>
            <span className="text-white font-medium">{handoff.customerName}</span>
            <span className="text-[#71717a] text-sm ml-2">{formatTime(handoff.timestamp)}</span>
          </div>
        </div>
        <Badge variant="outline" className={`${reason.bgColor} ${reason.color} ${reason.borderColor}`}>
          {reason.label}
        </Badge>
      </div>
      
      {/* Conversation */}
      <div className="p-4 space-y-3">
        {/* Customer Message */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-medium">客</span>
          </div>
          <div className="flex-1 bg-[#27272a] p-3 rounded-lg rounded-tl-none">
            <p className="text-white text-sm">{handoff.customerMessage}</p>
          </div>
        </div>
        
        {/* AI Response */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#40E0D0] to-[#00B4D8] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 bg-[#00B4D8]/10 p-3 rounded-lg rounded-tl-none border border-[#00B4D8]/30">
            <p className="text-[#00B4D8] text-sm">{handoff.aiResponse}</p>
          </div>
        </div>
      </div>
      
      {/* Learn Button / Input */}
      <div className="p-4 border-t border-[#27272a]">
        {handoff.hasLearned ? (
          <div className="flex items-center gap-2 text-[#22c55e] text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>已加入 AI 學習</span>
          </div>
        ) : showLearnInput ? (
          <div className="space-y-3">
            <Textarea
              value={learnText}
              onChange={(e) => setLearnText(e.target.value)}
              placeholder="輸入希望 AI 學習的回覆規則...&#10;例如：遇到價格詢問時，先確認日期和人數，再報價"
              className="min-h-[80px] bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg resize-none text-sm"
            />
            
            {/* Image Upload */}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-3 py-2 bg-[#27272a] rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/70 transition-colors text-sm">
                  <ImageIcon className="w-4 h-4" />
                  上傳對話截圖
                </div>
              </label>
              
              {uploadedImage && (
                <div className="relative">
                  <img src={uploadedImage} alt="uploaded" className="h-10 w-10 rounded object-cover" />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowLearnInput(false)}
                className="text-[#a1a1aa] hover:text-white"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitLearn}
                className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
              >
                <Send className="w-3 h-3 mr-1" />
                提交學習
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLearnInput(true)}
            className="text-[#FF6B35] hover:text-[#FF6B35]/80 hover:bg-[#FF6B35]/10 w-full"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            希望 AI 學習此回答規則
          </Button>
        )}
      </div>
    </div>
  );
};

export const HandoffAnalysis = ({ venue }) => {
  const { token } = useAuth();
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 從 API 獲取真實對話數據
  const fetchHandoffs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const tasks = response.data.tasks || [];
      const transformedHandoffs = tasks.map(transformTaskToHandoff);
      setHandoffs(transformedHandoffs);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('無法載入轉交對話數據');
      toast.error('載入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (token) {
      fetchHandoffs();
    }
  }, [token]);
  
  // 計算各原因的數量
  const reasonStats = useMemo(() => {
    const stats = {};
    Object.keys(HANDOFF_REASONS).forEach(key => {
      stats[key] = handoffs.filter(h => h.reason === key).length;
    });
    return Object.entries(stats)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
  }, [handoffs]);
  
  const handleLearn = (handoffId, data) => {
    setHandoffs(prev => prev.map(h => 
      h.id === handoffId ? { ...h, hasLearned: true } : h
    ));
    // 這裡可以發送 API 請求到後端
    console.log('Learn request:', { handoffId, data });
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
        <p className="text-[#a1a1aa]">正在載入真實對話數據...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-red-400">{error}</p>
        <Button 
          variant="outline" 
          onClick={fetchHandoffs}
          className="text-[#FF6B35] border-[#FF6B35] hover:bg-[#FF6B35]/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重新載入
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <AlertCircle className="w-5 h-5 text-[#FF6B35]" />
            轉交真人分析
          </h2>
          <p className="text-[#a1a1aa] text-sm mt-1">來自 LINE OA 的真實對話數據</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={fetchHandoffs}
          className="text-[#a1a1aa] hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重新整理
        </Button>
      </div>
      
      {handoffs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-4 bg-[#18181b] rounded-xl border border-[#27272a]">
          <MessageSquare className="w-12 h-12 text-[#52525b]" />
          <p className="text-[#a1a1aa]">目前沒有待處理的轉交對話</p>
        </div>
      ) : (
        <>
          {/* Reason Distribution */}
          <div className="bg-[#18181b] rounded-xl p-5 border border-[#27272a]">
            <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide mb-4">
              轉交原因分佈
            </h3>
            <div className="space-y-3">
              {reasonStats.map(([key, count]) => {
                const reason = HANDOFF_REASONS[key];
                const ReasonIcon = reason.icon;
                const percentage = ((count / handoffs.length) * 100).toFixed(0);
                
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${reason.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <ReasonIcon className={`w-4 h-4 ${reason.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white text-sm">{reason.label}</span>
                        <span className="text-[#a1a1aa] text-sm">{count} 則 ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${reason.bgColor.replace('/15', '')}`}
                          style={{ width: `${percentage}%`, backgroundColor: reason.color.replace('text-', '').includes('[') ? reason.color.match(/\[(.*?)\]/)[1] : undefined }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Handoff List */}
          <div>
            <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              LINE OA 轉交對話 ({handoffs.length} 則)
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {handoffs.map(handoff => (
                  <HandoffCard 
                    key={handoff.id} 
                    handoff={handoff}
                    onLearn={handleLearn}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
};
