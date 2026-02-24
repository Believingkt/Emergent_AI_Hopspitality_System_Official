import { useState, useMemo, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  AlertCircle, MessageSquare, Calendar, DollarSign, HelpCircle, Clock,
  Lightbulb, Send, CheckCircle2, Sparkles, X, Loader2, RefreshCw,
  ChevronDown, ChevronUp, User, Bot, UserCheck, Edit3, CreditCard,
  Phone, Users, Home, Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const isPreviewMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === 'true';
};

// 訊息氣泡組件
const MessageBubble = ({ message, isLast }) => {
  const { sender_type, content, timestamp } = message;
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const styles = {
    customer: {
      container: 'justify-start',
      bubble: 'bg-[#1e3a5f] border-2 border-[#2d5a87] text-white rounded-2xl rounded-tl-sm',
      avatar: <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-white" /></div>,
      label: '客戶', labelClass: 'text-[#FF6B35]'
    },
    ai: {
      container: 'justify-start',
      bubble: 'bg-[#1a2f3d] border-2 border-[#00B4D8]/40 text-[#e0f7fa] rounded-2xl rounded-tl-sm',
      avatar: <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00B4D8] to-[#40E0D0] flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-white" /></div>,
      label: 'AI 小森', labelClass: 'text-[#00B4D8]'
    },
    manager: {
      container: 'justify-end',
      bubble: 'bg-[#1a3d2e] border-2 border-[#22c55e]/40 text-[#e8f5e9] rounded-2xl rounded-tr-sm',
      avatar: <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22c55e] to-[#4ade80] flex items-center justify-center flex-shrink-0"><UserCheck className="w-4 h-4 text-white" /></div>,
      label: '管家', labelClass: 'text-[#22c55e]'
    }
  };
  const s = styles[sender_type] || styles.customer;
  const isManager = sender_type === 'manager';

  return (
    <div className={`flex ${s.container} gap-2 ${isLast ? '' : 'mb-3'}`}>
      {!isManager && s.avatar}
      <div className={`max-w-[75%] ${isManager ? 'order-first' : ''}`}>
        <div className={`flex items-center gap-2 mb-0.5 ${isManager ? 'justify-end' : ''}`}>
          <span className={`text-xs font-semibold ${s.labelClass}`}>{s.label}</span>
          <span className="text-[#52525b] text-[10px]">{formatTime(timestamp)}</span>
        </div>
        <div className={`px-3 py-2 ${s.bubble} shadow-md`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
      {isManager && s.avatar}
    </div>
  );
};

// 客戶對話卡片（合併同一客戶的所有訊息）
const CustomerCard = ({ customer, token, onRefresh, showPaymentActions = false, isPaidView = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const info = customer.customer_info || {};
  const messages = customer.messages || [];
  const name = customer.customer_name || info.customer_name || `LINE 用戶`;
  const isPayment = customer.customer_stage === 'payment';

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 最新的客戶訊息作為預覽
  const latestCustomerMsg = [...messages].reverse().find(m => m.sender_type === 'customer');

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    try {
      const latestTaskId = customer.task_ids[customer.task_ids.length - 1];
      await axios.post(
        `${API_URL}/api/tasks/${latestTaskId}/reply`,
        { message: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('回覆已送出！');
      setReplyText('');
      setShowReplyInput(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('回覆送出失敗');
    } finally {
      setIsReplying(false);
    }
  };

  const handleConfirmPayment = async () => {
    setIsConfirmingPayment(true);
    try {
      await axios.post(
        `${API_URL}/api/venues/${customer.venue_id}/customers/${customer.customer_user_id}/confirm-payment`,
        { payment_amount: parseFloat(paymentAmount) || 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('匯款確認成功！');
      setIsConfirmingPayment(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('確認失敗：' + (err.response?.data?.detail || '請稍後再試'));
      setIsConfirmingPayment(false);
    }
  };

  // Calculate payment info
  const totalPrice = info.total_price || 0;
  const paidAmount = customer.payment_amount || info.payment_amount || 0;
  const remaining = totalPrice > 0 ? totalPrice - paidAmount : 0;

  return (
    <div className={`bg-[#0d1117] rounded-2xl border-2 overflow-hidden transition-all duration-300 shadow-xl ${
      isPaidView ? 'border-[#22c55e]/30 hover:border-[#22c55e]/60' 
      : isPayment ? 'border-[#22c55e]/20 hover:border-[#22c55e]/50' 
      : 'border-[#27272a] hover:border-[#FF6B35]/50'
    }`}>
      {/* Header */}
      <div className="p-4 cursor-pointer hover:bg-[#161b22] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              isPaidView ? 'bg-[#22c55e]/15 border-[#22c55e]/30' 
              : isPayment ? 'bg-[#22c55e]/15 border-[#22c55e]/30' 
              : 'bg-[#FF6B35]/15 border-[#FF6B35]/30'
            }`}>
              {isPaidView ? <CreditCard className="w-6 h-6 text-[#22c55e]" /> 
               : isPayment ? <DollarSign className="w-6 h-6 text-[#22c55e]" /> 
               : <MessageSquare className="w-6 h-6 text-[#FF6B35]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">{name}</span>
                <Badge variant="outline" className="text-xs bg-[#27272a] text-[#8b949e] border-[#27272a]">
                  {messages.length} 則對話
                </Badge>
                {info.room_type && (
                  <Badge variant="outline" className="text-xs bg-[#00B4D8]/10 text-[#00B4D8] border-[#00B4D8]/30">
                    {info.room_type}
                  </Badge>
                )}
              </div>
              <p className="text-[#8b949e] text-sm mt-0.5">{formatTime(customer.last_message_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={
              customer.status === '已處理' ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30' 
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }>
              {customer.status}
            </Badge>
            {expanded ? <ChevronUp className="w-5 h-5 text-[#8b949e]" /> : <ChevronDown className="w-5 h-5 text-[#8b949e]" />}
          </div>
        </div>

        {/* 預覽 */}
        {!expanded && latestCustomerMsg && (
          <div className="mt-3 pl-15">
            <p className="text-[#c9d1d9] text-sm line-clamp-2 bg-[#161b22] rounded-lg p-3 border border-[#27272a]">
              {latestCustomerMsg.content}
            </p>
          </div>
        )}
      </div>

      {/* 展開內容 */}
      {expanded && (
        <div className="border-t border-[#27272a]">
          {/* 客戶資訊卡 */}
          {(info.date || info.num_adults || info.room_type || isPaidView) && (
            <div className={`p-4 border-b ${isPaidView ? 'bg-[#22c55e]/5 border-[#22c55e]/20' : 'bg-[#0a0d12] border-[#27272a]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[#00B4D8]" />
                <span className="text-[#00B4D8] text-sm font-semibold">客戶資訊</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {customer.customer_name && (
                  <div className="bg-[#0d1117] rounded-lg p-2.5 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-0.5">姓名</p>
                    <p className="text-white font-medium text-sm">{customer.customer_name}</p>
                  </div>
                )}
                {customer.customer_phone && (
                  <div className="bg-[#0d1117] rounded-lg p-2.5 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-0.5">電話</p>
                    <p className="text-white font-medium text-sm">{customer.customer_phone}</p>
                  </div>
                )}
                {info.date && (
                  <div className="bg-[#0d1117] rounded-lg p-2.5 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-0.5">入住日期</p>
                    <p className="text-white font-medium text-sm">{info.date}</p>
                  </div>
                )}
                {info.room_type && (
                  <div className="bg-[#0d1117] rounded-lg p-2.5 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-0.5">房型</p>
                    <p className="text-white font-medium text-sm">{info.room_type}</p>
                  </div>
                )}
                {info.num_adults != null && (
                  <div className="bg-[#0d1117] rounded-lg p-2.5 border border-[#27272a]">
                    <p className="text-[#8b949e] text-xs mb-0.5">人數</p>
                    <p className="text-white font-medium text-sm">{info.num_adults} 大 {info.num_children || 0} 小</p>
                  </div>
                )}
                {isPaidView && paidAmount > 0 && (
                  <>
                    <div className="bg-[#22c55e]/10 rounded-lg p-2.5 border border-[#22c55e]/30">
                      <p className="text-[#22c55e] text-xs mb-0.5">已匯款金額</p>
                      <p className="text-[#22c55e] font-bold text-sm">${paidAmount.toLocaleString()}</p>
                    </div>
                    {totalPrice > 0 && (
                      <div className="bg-amber-500/10 rounded-lg p-2.5 border border-amber-500/30">
                        <p className="text-amber-400 text-xs mb-0.5">尾款金額</p>
                        <p className="text-amber-400 font-bold text-sm">${remaining.toLocaleString()}</p>
                      </div>
                    )}
                    {customer.payment_confirmed_at && (
                      <div className="bg-[#0d1117] rounded-lg p-2.5 border border-[#27272a]">
                        <p className="text-[#8b949e] text-xs mb-0.5">確認日期</p>
                        <p className="text-white font-medium text-sm">{formatTime(customer.payment_confirmed_at)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 對話歷史 */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-[#FF6B35] text-sm font-semibold">對話歷史（{messages.length} 則）</span>
            </div>
            <ScrollArea className="max-h-[400px] pr-2">
              <div className="space-y-1">
                {messages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} isLast={idx === messages.length - 1} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 操作區 */}
          {!isPaidView && (
            <div className="p-4 border-t border-[#27272a] space-y-3">
              {/* 確認匯款區塊 - 獨立卡片式設計 */}
              {showPaymentActions && !customer.payment_confirmed && (
                <div className="bg-gradient-to-br from-[#0a1a10] to-[#0d1117] rounded-2xl p-5 border-2 border-[#22c55e]/30 shadow-lg shadow-[#22c55e]/5">
                  {/* 標題列 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#22c55e] flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-base">確認訂金匯款</h4>
                        <p className="text-[#8b949e] text-xs">請輸入客戶實際匯款的訂金金額</p>
                      </div>
                    </div>
                    <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0 text-xs px-3 py-1">
                      <DollarSign className="w-3 h-3 mr-1" />
                      待確認
                    </Badge>
                  </div>

                  {/* 金額輸入區 */}
                  <div className="bg-[#0d1117] rounded-xl border border-[#27272a] p-4">
                    <label className="text-[#8b949e] text-xs font-medium mb-2 block">訂金金額</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center flex-1 bg-[#161b22] border-2 border-[#27272a] rounded-xl overflow-hidden focus-within:border-[#22c55e] transition-colors">
                        <span className="text-[#22c55e] font-bold text-lg px-4 py-3 bg-[#22c55e]/10 border-r border-[#27272a]">NT$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="flex-1 bg-transparent px-4 py-3 text-white text-xl font-bold placeholder:text-[#3f3f46] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <Button
                        onClick={handleConfirmPayment}
                        disabled={isConfirmingPayment || !paymentAmount}
                        className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-6 py-3 h-auto rounded-xl shadow-lg shadow-[#22c55e]/20 disabled:opacity-40 disabled:shadow-none transition-all"
                      >
                        {isConfirmingPayment ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            確認收款
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const HandoffAnalysis = ({ venue, autoRefresh = false, refreshInterval = 300000 }) => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const previewMode = isPreviewMode();

  const fetchGrouped = async () => {
    if (previewMode) {
      setCustomers([]);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/tasks/grouped`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.customers || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch grouped tasks:', err);
      setError('無法載入轉交對話數據');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token || previewMode) fetchGrouped();
  }, [token, previewMode]);

  useEffect(() => {
    if (!autoRefresh || (!token && !previewMode)) return;
    const interval = setInterval(fetchGrouped, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, token, previewMode]);

  // Split customers into 3 groups
  const paymentCustomers = useMemo(() => 
    customers.filter(c => c.customer_stage === 'payment' && !c.payment_confirmed), [customers]);
  const questionCustomers = useMemo(() => 
    customers.filter(c => c.customer_stage !== 'payment' && !c.payment_confirmed), [customers]);
  const paidCustomers = useMemo(() => 
    customers.filter(c => c.payment_confirmed), [customers]);

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
        <Button variant="outline" onClick={fetchGrouped} className="text-[#FF6B35] border-[#FF6B35] hover:bg-[#FF6B35]/10">
          <RefreshCw className="w-4 h-4 mr-2" /> 重新載入
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
            轉交對話列表
          </h2>
          <p className="text-[#8b949e] mt-1 ml-13">
            來自 LINE OA 的真實對話（已合併同一客戶）
            {lastUpdated && <span className="ml-2 text-[#52525b]">· 最後更新：{lastUpdated.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>}
            {autoRefresh && <span className="ml-2 text-[#22c55e]">· 每 5 分鐘自動更新</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchGrouped} className="border-[#27272a] text-[#8b949e] hover:text-white hover:border-[#FF6B35]">
          <RefreshCw className="w-4 h-4 mr-2" /> 重新整理
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-[#0d1117] rounded-2xl border-2 border-[#27272a]">
          <MessageSquare className="w-16 h-16 text-[#27272a]" />
          <p className="text-[#8b949e] text-lg">目前沒有待處理的轉交對話</p>
        </div>
      ) : (
        <Tabs defaultValue="payment" className="w-full">
          <TabsList className="bg-transparent border-0 p-0 gap-4 w-full justify-start mb-6 h-auto flex flex-wrap">
            {/* 待確認匯款 */}
            <TabsTrigger value="payment" className="group relative p-0 border-0 bg-transparent data-[state=active]:bg-transparent h-auto flex-shrink-0">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer group-data-[state=active]:border-[#22c55e] group-data-[state=active]:bg-[#22c55e]/15 group-data-[state=active]:shadow-xl group-data-[state=active]:shadow-[#22c55e]/20 group-data-[state=inactive]:border-[#27272a] group-data-[state=inactive]:bg-[#0d1117] group-data-[state=inactive]:opacity-50 hover:opacity-100">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-data-[state=active]:bg-[#22c55e] group-data-[state=inactive]:bg-[#22c55e]/20">
                  <DollarSign className="w-6 h-6 group-data-[state=active]:text-white group-data-[state=inactive]:text-[#22c55e]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#22c55e]">待確認匯款</span>
                    {paymentCustomers.length > 0 && <span className="bg-[#22c55e] text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{paymentCustomers.length}</span>}
                  </div>
                  <p className="text-[#8b949e] text-xs mt-0.5">客戶已匯款，請確認訂金</p>
                </div>
              </div>
            </TabsTrigger>

            {/* 待回覆問題 */}
            <TabsTrigger value="questions" className="group relative p-0 border-0 bg-transparent data-[state=active]:bg-transparent h-auto flex-shrink-0">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer group-data-[state=active]:border-[#FF6B35] group-data-[state=active]:bg-[#FF6B35]/15 group-data-[state=active]:shadow-xl group-data-[state=active]:shadow-[#FF6B35]/20 group-data-[state=inactive]:border-[#27272a] group-data-[state=inactive]:bg-[#0d1117] group-data-[state=inactive]:opacity-50 hover:opacity-100">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-data-[state=active]:bg-[#FF6B35] group-data-[state=inactive]:bg-[#FF6B35]/15">
                  <MessageSquare className="w-6 h-6 group-data-[state=active]:text-white group-data-[state=inactive]:text-[#FF6B35]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#FF6B35]">待回覆問題</span>
                    {questionCustomers.length > 0 && <span className="bg-[#FF6B35] text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{questionCustomers.length}</span>}
                  </div>
                  <p className="text-[#8b949e] text-xs mt-0.5">客戶詢問需要協助回覆</p>
                </div>
              </div>
            </TabsTrigger>

            {/* 已匯款 */}
            <TabsTrigger value="paid" className="group relative p-0 border-0 bg-transparent data-[state=active]:bg-transparent h-auto flex-shrink-0">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer group-data-[state=active]:border-[#00B4D8] group-data-[state=active]:bg-[#00B4D8]/15 group-data-[state=active]:shadow-xl group-data-[state=active]:shadow-[#00B4D8]/20 group-data-[state=inactive]:border-[#27272a] group-data-[state=inactive]:bg-[#0d1117] group-data-[state=inactive]:opacity-50 hover:opacity-100">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-data-[state=active]:bg-[#00B4D8] group-data-[state=inactive]:bg-[#00B4D8]/15">
                  <CreditCard className="w-6 h-6 group-data-[state=active]:text-white group-data-[state=inactive]:text-[#00B4D8]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#00B4D8]">已匯款</span>
                    {paidCustomers.length > 0 && <span className="bg-[#00B4D8] text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{paidCustomers.length}</span>}
                  </div>
                  <p className="text-[#8b949e] text-xs mt-0.5">已確認收到匯款的客戶</p>
                </div>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* 待確認匯款 */}
          <TabsContent value="payment" className="mt-0">
            {paymentCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-4 bg-[#22c55e]/5 rounded-2xl border-2 border-[#22c55e]/30">
                <CheckCircle2 className="w-12 h-12 text-[#22c55e]/50" />
                <p className="text-[#22c55e] text-lg">目前沒有待確認的匯款</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentCustomers.map(c => (
                  <CustomerCard key={c.customer_user_id} customer={c} token={token} onRefresh={fetchGrouped} showPaymentActions={true} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* 待回覆問題 */}
          <TabsContent value="questions" className="mt-0">
            {questionCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-4 bg-[#0d1117] rounded-2xl border-2 border-[#27272a]">
                <MessageSquare className="w-12 h-12 text-[#27272a]" />
                <p className="text-[#8b949e] text-lg">目前沒有待回覆的問題</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questionCustomers.map(c => (
                  <CustomerCard key={c.customer_user_id} customer={c} token={token} onRefresh={fetchGrouped} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* 已匯款 */}
          <TabsContent value="paid" className="mt-0">
            {paidCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-4 bg-[#00B4D8]/5 rounded-2xl border-2 border-[#00B4D8]/30">
                <CreditCard className="w-12 h-12 text-[#00B4D8]/50" />
                <p className="text-[#00B4D8] text-lg">尚無已確認匯款的客戶</p>
                <p className="text-[#8b949e] text-sm">在「待確認匯款」中確認後會顯示在這裡</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paidCustomers.map(c => (
                  <CustomerCard key={c.customer_user_id} customer={c} token={token} onRefresh={fetchGrouped} isPaidView={true} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
