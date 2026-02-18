import { useState, useMemo, useEffect } from 'react';
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
  Send,
  CheckCircle2,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  UserCheck,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// 轉交原因類別
const HANDOFF_REASONS = {
  payment: { label: '待確認匯款', icon: DollarSign, color: 'text-[#22c55e]', bgColor: 'bg-[#22c55e]/15', borderColor: 'border-[#22c55e]/30' },
  pricing: { label: '價格詢問', icon: DollarSign, color: 'text-[#22c55e]', bgColor: 'bg-[#22c55e]/15', borderColor: 'border-[#22c55e]/30' },
  availability: { label: '房間/時段確認', icon: Calendar, color: 'text-[#00B4D8]', bgColor: 'bg-[#00B4D8]/15', borderColor: 'border-[#00B4D8]/30' },
  special: { label: '特殊需求', icon: HelpCircle, color: 'text-[#FF6B35]', bgColor: 'bg-[#FF6B35]/15', borderColor: 'border-[#FF6B35]/30' },
  complaint: { label: '投訴/問題', icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/30' },
  booking: { label: '預約流程', icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30' },
  other: { label: '其他', icon: MessageSquare, color: 'text-[#a1a1aa]', bgColor: 'bg-[#27272a]', borderColor: 'border-[#27272a]' },
};

// 根據客戶訊息內容智能判斷轉交原因
const detectHandoffReason = (customerMessage) => {
  const message = (customerMessage || '').toLowerCase();
  
  if (message.includes('價') || message.includes('錢') || message.includes('多少') || message.includes('費用') || message.includes('划算')) {
    return 'pricing';
  }
  if (message.includes('空房') || message.includes('有房') || message.includes('日期') || message.includes('週') || message.includes('時段')) {
    return 'availability';
  }
  if (message.includes('寵物') || message.includes('狗') || message.includes('貓') || message.includes('特殊') || message.includes('需求') || message.includes('婚禮')) {
    return 'special';
  }
  if (message.includes('投訴') || message.includes('問題') || message.includes('異味') || message.includes('抱歉') || message.includes('不好')) {
    return 'complaint';
  }
  if (message.includes('訂') || message.includes('預約') || message.includes('怎麼') || message.includes('流程') || message.includes('匯款')) {
    return 'booking';
  }
  
  return 'other';
};

// 訊息氣泡組件
const MessageBubble = ({ message, isLast }) => {
  const { sender_type, content, timestamp } = message;
  
  const formatTime = (ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };
  
  // 根據 sender_type 決定樣式
  const getMessageStyle = () => {
    switch (sender_type) {
      case 'customer':
        return {
          containerClass: 'justify-start',
          bubbleClass: 'bg-[#1e3a5f] border-2 border-[#2d5a87] text-white rounded-2xl rounded-tl-sm',
          avatar: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] flex items-center justify-center flex-shrink-0 shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
          ),
          label: '客戶',
          labelClass: 'text-[#FF6B35]'
        };
      case 'ai':
        return {
          containerClass: 'justify-start',
          bubbleClass: 'bg-[#1a2f3d] border-2 border-[#00B4D8]/40 text-[#e0f7fa] rounded-2xl rounded-tl-sm',
          avatar: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00B4D8] to-[#40E0D0] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
          ),
          label: 'AI 小森',
          labelClass: 'text-[#00B4D8]'
        };
      case 'manager':
        return {
          containerClass: 'justify-end',
          bubbleClass: 'bg-[#1a3d2e] border-2 border-[#22c55e]/40 text-[#e8f5e9] rounded-2xl rounded-tr-sm',
          avatar: (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22c55e] to-[#4ade80] flex items-center justify-center flex-shrink-0 shadow-lg">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          ),
          label: '管家',
          labelClass: 'text-[#22c55e]'
        };
      default:
        return {
          containerClass: 'justify-start',
          bubbleClass: 'bg-[#27272a] text-white rounded-2xl',
          avatar: null,
          label: '系統',
          labelClass: 'text-[#a1a1aa]'
        };
    }
  };
  
  const style = getMessageStyle();
  const isManager = sender_type === 'manager';
  
  return (
    <div className={`flex ${style.containerClass} gap-3 ${isLast ? '' : 'mb-4'}`}>
      {!isManager && style.avatar}
      <div className={`max-w-[75%] ${isManager ? 'order-first' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isManager ? 'justify-end' : ''}`}>
          <span className={`text-xs font-semibold ${style.labelClass}`}>{style.label}</span>
          <span className="text-[#52525b] text-xs">{formatTime(timestamp)}</span>
        </div>
        <div className={`px-4 py-3 ${style.bubbleClass} shadow-md`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
      {isManager && style.avatar}
    </div>
  );
};

// AI 學習確認對話框
const AILearningDialog = ({ isOpen, onClose, onConfirm, conversations, managerResponse }) => {
  const [learnedSummary, setLearnedSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  
  // 生成 AI 學習總結
  useEffect(() => {
    if (isOpen && managerResponse) {
      // 找出客戶的問題
      const customerMessages = conversations.filter(m => m.sender_type === 'customer');
      const lastCustomerMessage = customerMessages[customerMessages.length - 1]?.content || '';
      
      const summary = `當客戶詢問「${lastCustomerMessage.slice(0, 30)}${lastCustomerMessage.length > 30 ? '...' : ''}」時，
應該回覆：「${managerResponse.slice(0, 100)}${managerResponse.length > 100 ? '...' : ''}」`;
      
      setLearnedSummary(summary);
      setConfirmed(false);
      setIsEditing(false);
    }
  }, [isOpen, managerResponse, conversations]);
  
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true);
    } else {
      onConfirm(learnedSummary);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#18181b] rounded-2xl border border-[#27272a] max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">AI 學習確認</h3>
              <p className="text-[#a1a1aa] text-sm">確認 AI 學到的回覆規則</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#52525b] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-4">
          {!confirmed ? (
            <>
              <div className="bg-[#27272a]/50 rounded-xl p-4 border border-[#27272a]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#00B4D8]" />
                  <span className="text-[#00B4D8] text-sm font-semibold">AI 學到的內容</span>
                </div>
                {isEditing ? (
                  <Textarea
                    value={learnedSummary}
                    onChange={(e) => setLearnedSummary(e.target.value)}
                    className="min-h-[120px] bg-[#1a1a1a] border-[#27272a] text-white rounded-lg resize-none text-sm"
                  />
                ) : (
                  <p className="text-white text-sm leading-relaxed">{learnedSummary}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-[#a1a1aa] text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>AI 將會學習管家的回覆方式，未來遇到類似問題時自動應用</span>
              </div>
            </>
          ) : (
            <div className="bg-[#22c55e]/10 rounded-xl p-4 border border-[#22c55e]/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                <span className="text-[#22c55e] font-semibold">請確認以下學習內容正確</span>
              </div>
              <p className="text-white text-sm leading-relaxed">{learnedSummary}</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-[#27272a] flex justify-between">
          {!confirmed ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                className="text-[#a1a1aa] hover:text-white"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? '完成編輯' : '手動調整'}
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
              >
                確認學習內容
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setConfirmed(false)}
                className="text-[#a1a1aa] hover:text-white"
              >
                返回修改
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                確認提交學習
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// 對話卡片組件 - 重新設計
const ConversationCard = ({ task, token, onRefresh, isPaymentSection = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [managerResponse, setManagerResponse] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  
  // 判斷是否為付款確認階段
  const isPaymentStage = task.customer_stage === 'payment';
  
  // 根據 customer_stage 或訊息內容判斷原因
  const getReasonKey = () => {
    if (isPaymentStage) return 'payment';
    return detectHandoffReason(task.customer_message);
  };
  
  const reason = HANDOFF_REASONS[getReasonKey()] || HANDOFF_REASONS.other;
  const ReasonIcon = reason.icon;
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', { 
      month: 'numeric', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // 載入完整對話歷史
  const loadConversations = async () => {
    if (conversations.length > 0) return;
    
    setLoadingConv(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/tasks/${task.task_id}/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(response.data.messages || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error('載入對話歷史失敗');
    } finally {
      setLoadingConv(false);
    }
  };
  
  // 展開時載入對話
  useEffect(() => {
    if (expanded) {
      loadConversations();
    }
  }, [expanded]);
  
  // 檢查是否有管家回覆
  const hasManagerResponse = conversations.some(m => m.sender_type === 'manager');
  
  // 發送管家回覆
  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error('請輸入回覆內容');
      return;
    }
    
    setIsReplying(true);
    try {
      await axios.post(
        `${API_URL}/api/tasks/${task.task_id}/reply`,
        { message: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('回覆已送出！');
      setReplyText('');
      setShowReplyInput(false);
      // 重新載入對話
      const response = await axios.get(
        `${API_URL}/api/tasks/${task.task_id}/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(response.data.messages || []);
      // 刷新任務列表
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Reply failed:', err);
      toast.error('回覆送出失敗：' + (err.response?.data?.detail || '請稍後再試'));
    } finally {
      setIsReplying(false);
    }
  };
  
  // 處理 AI 學習確認
  const handleLearnConfirm = async (summary) => {
    try {
      // 調用知識庫 API 新增學習內容
      await axios.post(
        `${API_URL}/api/venues/${task.venue_id || 'sensan_inn'}/knowledge`,
        {
          category: 'ai_learning',
          title: `來自對話 ${task.task_id} 的學習`,
          content: summary
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('AI 學習請求已提交！');
    } catch (err) {
      console.error('AI Learning failed:', err);
      toast.error('學習請求失敗：' + (err.response?.data?.detail || '請稍後再試'));
    }
  };

  // 確認收到訂金
  const handleConfirmPayment = async () => {
    if (!task.venue_id || !task.customer_user_id) {
      toast.error('缺少必要資訊，無法確認匯款');
      return;
    }
    
    setIsConfirmingPayment(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/venues/${task.venue_id}/customers/${task.customer_user_id}/confirm-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('訂金確認成功！AI 已切換為禮賓模式。');
      // 刷新任務列表
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Confirm payment failed:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || '請稍後再試';
      toast.error(`訂金確認失敗：${errorMsg}`);
    } finally {
      setIsConfirmingPayment(false);
    }
  };
  
  return (
    <div className="bg-[#0d1117] rounded-2xl border-2 border-[#27272a] overflow-hidden hover:border-[#FF6B35]/50 transition-all duration-300 shadow-xl">
      {/* Header - 可點擊展開 */}
      <div 
        className="p-4 cursor-pointer hover:bg-[#161b22] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${reason.bgColor} flex items-center justify-center border ${reason.borderColor}`}>
              <ReasonIcon className={`w-6 h-6 ${reason.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">{task.customer_name}</span>
                <Badge variant="outline" className={`${reason.bgColor} ${reason.color} ${reason.borderColor} text-xs`}>
                  {reason.label}
                </Badge>
              </div>
              <p className="text-[#8b949e] text-sm mt-0.5">{formatTime(task.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={task.status === '已處理' 
                ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30' 
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }
            >
              {task.status}
            </Badge>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-[#8b949e]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#8b949e]" />
            )}
          </div>
        </div>
        
        {/* 預覽訊息 */}
        {!expanded && (
          <div className="mt-3 pl-15">
            <p className="text-[#c9d1d9] text-sm line-clamp-2 bg-[#161b22] rounded-lg p-3 border border-[#27272a]">
              {task.customer_message}
            </p>
          </div>
        )}
      </div>
      
      {/* 展開的對話內容 */}
      {expanded && (
        <div className="border-t border-[#27272a]">
          {/* 付款確認區塊 - 僅在 payment 階段顯示 */}
          {isPaymentStage && task.customer_info && (
            <div className="p-5 bg-[#22c55e]/5 border-b border-[#22c55e]/30">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#22c55e]" />
                <span className="text-[#22c55e] text-sm font-semibold">客戶預約資訊</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {task.customer_info.date && (
                  <div className="bg-[#0d1117] rounded-lg p-3 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-1">入住日期</p>
                    <p className="text-white font-medium">{task.customer_info.date}</p>
                  </div>
                )}
                {task.customer_info.room_type && (
                  <div className="bg-[#0d1117] rounded-lg p-3 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-1">房型</p>
                    <p className="text-white font-medium">{task.customer_info.room_type}</p>
                  </div>
                )}
                {(task.customer_info.num_adults !== undefined) && (
                  <div className="bg-[#0d1117] rounded-lg p-3 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-1">人數</p>
                    <p className="text-white font-medium">
                      {task.customer_info.num_adults} 大 {task.customer_info.num_children || 0} 小
                    </p>
                  </div>
                )}
                {task.customer_info.total_price && (
                  <div className="bg-[#0d1117] rounded-lg p-3 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-1">訂金金額</p>
                    <p className="text-[#22c55e] font-bold text-lg">NT$ {task.customer_info.total_price.toLocaleString()}</p>
                  </div>
                )}
              </div>
              <Button
                onClick={handleConfirmPayment}
                disabled={isConfirmingPayment}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-3"
              >
                {isConfirmingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    確認中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    確認收到訂金
                  </>
                )}
              </Button>
              <p className="text-[#8b949e] text-xs text-center mt-2">
                確認後，AI 將自動發送訂金確認訊息給客戶，並切換為禮賓服務模式 (SG1)
              </p>
            </div>
          )}
          
          {/* 對話歷史區 */}
          <div className="p-5 bg-[#0d1117]">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#00B4D8]" />
              <span className="text-[#00B4D8] text-sm font-semibold">LINE OA 完整對話</span>
            </div>
            
            {loadingConv ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1 pr-4">
                  {conversations.map((msg, idx) => (
                    <MessageBubble 
                      key={msg.id} 
                      message={msg} 
                      isLast={idx === conversations.length - 1}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          {/* AI 學習區 */}
          <div className="p-5 bg-[#161b22] border-t border-[#27272a]">
            {/* 管家回覆輸入區 */}
            {!hasManagerResponse && (
              <div className="mb-4">
                {showReplyInput ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="w-4 h-4 text-[#FF6B35]" />
                      <span className="text-[#FF6B35] text-sm font-semibold">回覆客戶</span>
                    </div>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="輸入您要回覆客戶的內容..."
                      className="min-h-[100px] bg-[#0d1117] border-[#27272a] text-white rounded-lg resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowReplyInput(false);
                          setReplyText('');
                        }}
                        className="text-[#8b949e] hover:text-white"
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleSendReply}
                        disabled={isReplying || !replyText.trim()}
                        className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
                      >
                        {isReplying ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        發送回覆
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowReplyInput(true)}
                    className="w-full bg-[#FF6B35]/15 hover:bg-[#FF6B35]/25 text-[#FF6B35] border border-[#FF6B35]/30"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    回覆客戶
                  </Button>
                )}
              </div>
            )}
            
            {/* AI 學習按鈕 */}
            {hasManagerResponse ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#22c55e]">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">管家已回覆此對話</span>
                </div>
                <Button
                  onClick={() => {
                    const mgr = conversations.find(m => m.sender_type === 'manager');
                    setManagerResponse(mgr?.content || '');
                    setShowLearning(true);
                  }}
                  className="bg-gradient-to-r from-[#FF6B35] to-[#00B4D8] hover:opacity-90 text-white"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  讓 AI 學習此回覆
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-[#8b949e] mb-2">
                  <Clock className="w-4 h-4" />
                  <span>等待管家回覆中...</span>
                </div>
                <p className="text-[#52525b] text-sm">管家回覆後，您可以讓 AI 學習此回覆方式</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* AI 學習對話框 */}
      <AILearningDialog
        isOpen={showLearning}
        onClose={() => setShowLearning(false)}
        onConfirm={handleLearnConfirm}
        conversations={conversations}
        managerResponse={managerResponse}
      />
    </div>
  );
};

// 檢查是否為預覽模式
const isPreviewMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === 'true';
};

// 預覽模式的模擬數據
const PREVIEW_TASKS = [
  {
    task_id: 'preview-1',
    venue_id: 'sensan_inn',
    customer_user_id: 'U_preview_001',
    customer_name: 'Kenneth 天鈴',
    customer_message: '我已經匯款了，再麻煩您確認',
    customer_stage: 'payment',
    agent_mode: 'T1_booking',
    customer_info: {
      date: '2026-03-15',
      num_adults: 2,
      num_children: 1,
      room_type: '豪華雙人房',
      customer_name: 'Kenneth 天鈴',
      customer_phone: '0912345678',
      total_price: 8000,
      payment_confirmed: false
    },
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    venue_name: '森山寫照'
  },
  {
    task_id: 'preview-2',
    venue_id: 'sensan_inn',
    customer_user_id: 'U_preview_002',
    customer_name: 'Lionel',
    customer_message: '價格可以優惠嗎？我們有 4 個人',
    customer_stage: 'inquiry',
    agent_mode: 'T1_booking',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    venue_name: '森山寫照'
  },
  {
    task_id: 'preview-3',
    venue_id: 'sensan_inn',
    customer_user_id: 'U_preview_003',
    customer_name: '小美',
    customer_message: '可以帶寵物嗎？我們有一隻小狗',
    customer_stage: 'inquiry',
    agent_mode: 'T1_booking',
    status: 'completed',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    venue_name: '森山寫照'
  },
  {
    task_id: 'preview-4',
    venue_id: 'sensan_inn',
    customer_user_id: 'U_preview_004',
    customer_name: '王先生',
    customer_message: '訂金已匯，帳號後五碼 12345',
    customer_stage: 'payment',
    agent_mode: 'T1_booking',
    customer_info: {
      date: '2026-03-20',
      num_adults: 2,
      num_children: 0,
      room_type: '精緻四人房',
      customer_name: '王先生',
      total_price: 12000,
      payment_confirmed: false
    },
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    venue_name: '森山寫照'
  },
];

export const HandoffAnalysis = ({ venue, autoRefresh = false, refreshInterval = 300000 }) => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const previewMode = isPreviewMode();
  
  // 從 API 獲取任務列表
  const fetchTasks = async () => {
    // 預覽模式使用模擬數據
    if (previewMode) {
      setTasks(PREVIEW_TASKS);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTasks(response.data.tasks || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('無法載入轉交對話數據');
      toast.error('載入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (token || previewMode) {
      fetchTasks();
    }
  }, [token, previewMode]);
  
  // 自動更新（每 5 分鐘）
  useEffect(() => {
    if (!autoRefresh || (!token && !previewMode)) return;
    
    const interval = setInterval(() => {
      fetchTasks();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, token, previewMode]);
  
  // 計算各原因的數量
  const reasonStats = useMemo(() => {
    const stats = {};
    Object.keys(HANDOFF_REASONS).forEach(key => {
      stats[key] = tasks.filter(t => detectHandoffReason(t.customer_message) === key).length;
    });
    return Object.entries(stats)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
  }, [tasks]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#FF6B35]" />
        <p className="text-[#8b949e]">正在載入 LINE OA 對話數據...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-400">{error}</p>
        <Button 
          variant="outline" 
          onClick={fetchTasks}
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
          <h2 className="text-2xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            轉交真人分析
          </h2>
          <p className="text-[#8b949e] mt-1 ml-13">
            來自 LINE OA 的真實對話 · 支持 AI 學習
            {lastUpdated && (
              <span className="ml-2 text-[#52525b]">
                · 最後更新：{lastUpdated.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {autoRefresh && (
              <span className="ml-2 text-[#22c55e]">· 每 5 分鐘自動更新</span>
            )}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchTasks}
          className="border-[#27272a] text-[#8b949e] hover:text-white hover:border-[#FF6B35]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重新整理
        </Button>
      </div>
      
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-[#0d1117] rounded-2xl border-2 border-[#27272a]">
          <MessageSquare className="w-16 h-16 text-[#27272a]" />
          <p className="text-[#8b949e] text-lg">目前沒有待處理的轉交對話</p>
        </div>
      ) : (
        <>
          {/* 轉交原因分佈 */}
          <div className="bg-[#0d1117] rounded-2xl p-5 border-2 border-[#27272a]">
            <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wide mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              轉交原因分佈
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {reasonStats.map(([key, count]) => {
                const reason = HANDOFF_REASONS[key];
                const ReasonIcon = reason.icon;
                const percentage = ((count / tasks.length) * 100).toFixed(0);
                
                return (
                  <div key={key} className={`p-4 rounded-xl ${reason.bgColor} border ${reason.borderColor}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ReasonIcon className={`w-5 h-5 ${reason.color}`} />
                      <span className={`font-semibold ${reason.color}`}>{reason.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{count}</span>
                      <span className="text-[#8b949e] text-sm">則 ({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 對話列表 */}
          <div>
            <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wide mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              LINE OA 轉交對話 ({tasks.length} 則)
            </h3>
            <div className="space-y-4">
              {tasks.map(task => (
                <ConversationCard 
                  key={task.task_id} 
                  task={task}
                  token={token}
                  onRefresh={fetchTasks}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
