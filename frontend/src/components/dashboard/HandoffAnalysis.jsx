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

// 模擬轉交對話數據
const generateMockHandoffs = () => {
  const reasons = Object.keys(HANDOFF_REASONS);
  const handoffs = [];
  
  const mockMessages = [
    { customer: '請問週六晚上還有空房嗎？想要山景房', reason: 'availability', aiResponse: '我幫您查詢一下，請稍候...' },
    { customer: '你們的雙人房一晚多少錢？含早餐嗎？', reason: 'pricing', aiResponse: '關於價格的詳細資訊，我請專人為您說明' },
    { customer: '我想帶寵物入住，可以嗎？需要加錢嗎？', reason: 'special', aiResponse: '寵物入住的相關規定，讓我請管家為您詳細說明' },
    { customer: '上次入住房間有異味，這次能換房嗎？', reason: 'complaint', aiResponse: '非常抱歉造成您的困擾，我馬上請管家為您處理' },
    { customer: '想預約下個月的假日，怎麼訂比較划算？', reason: 'booking', aiResponse: '讓我請專人為您推薦最適合的方案' },
    { customer: '你們有提供接駁服務嗎？從火車站', reason: 'other', aiResponse: '關於接駁服務，請讓我轉給管家為您安排' },
  ];
  
  for (let i = 0; i < 8; i++) {
    const mock = mockMessages[i % mockMessages.length];
    handoffs.push({
      id: `handoff-${i + 1}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000 * 4).toISOString(),
      customerMessage: mock.customer,
      aiResponse: mock.aiResponse,
      reason: mock.reason,
      customerName: ['王小明', '李美玲', '陳大華', '林小芬', '張先生', '黃太太'][i % 6],
      hasLearned: Math.random() > 0.7,
    });
  }
  
  return handoffs;
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
  const [handoffs, setHandoffs] = useState(() => generateMockHandoffs());
  
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <AlertCircle className="w-5 h-5 text-[#FF6B35]" />
          轉交真人分析
        </h2>
        <p className="text-[#a1a1aa] text-sm mt-1">了解為什麼需要轉交真人處理</p>
      </div>
      
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
          今日轉交對話
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
    </div>
  );
};
