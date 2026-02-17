import { useState, useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  AlertTriangle,
  TrendingDown,
  BedDouble,
  MessageSquareX,
  Bell,
  CheckCircle2,
  X,
  ChevronRight,
  Clock
} from 'lucide-react';

// 模擬預警數據
const generateAlerts = () => [
  {
    id: 1,
    type: 'revenue',
    severity: 'warning',
    title: '營收下滑預警',
    message: '本月營收較上月下降 8.5%，建議加強行銷活動',
    timestamp: new Date(Date.now() - 3600000 * 2),
    actionText: '查看詳情',
    read: false,
  },
  {
    id: 2,
    type: 'vacancy',
    severity: 'critical',
    title: '空房預警',
    message: '2/28-3/2 連續 3 天入住率低於 40%，共 15 間空房待銷售',
    timestamp: new Date(Date.now() - 3600000 * 5),
    actionText: '設定促銷',
    read: false,
  },
  {
    id: 3,
    type: 'feedback',
    severity: 'info',
    title: '客戶反饋提醒',
    message: '有 2 則客戶詢問未獲滿意回覆，建議檢視 AI 學習',
    timestamp: new Date(Date.now() - 3600000 * 8),
    actionText: '查看對話',
    read: true,
  },
  {
    id: 4,
    type: 'conversion',
    severity: 'warning',
    title: '轉換率異常',
    message: '本週轉換率 9.2%，低於平均值 12.8%',
    timestamp: new Date(Date.now() - 3600000 * 24),
    actionText: '分析原因',
    read: true,
  },
];

// 模擬未成交原因
const generateLostReasons = () => ({
  reasons: [
    { reason: '價格考慮', count: 28, percentage: 35 },
    { reason: '日期沒空房', count: 22, percentage: 27.5 },
    { reason: '只是詢問/比價', count: 18, percentage: 22.5 },
    { reason: '特殊需求無法滿足', count: 8, percentage: 10 },
    { reason: '其他', count: 4, percentage: 5 },
  ],
  topQuestions: [
    { question: '有沒有空房？', count: 89 },
    { question: '價格多少？', count: 76 },
    { question: '可以帶寵物嗎？', count: 34 },
    { question: '有停車場嗎？', count: 28 },
    { question: '早餐包含嗎？', count: 25 },
  ],
  totalLost: 80,
  couldBeConverted: 35, // 可能挽回的
});

// 嚴重程度顏色
const getSeverityStyle = (severity) => {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', icon: AlertTriangle };
    case 'warning':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: TrendingDown };
    case 'info':
      return { bg: 'bg-[#00B4D8]/15', text: 'text-[#00B4D8]', border: 'border-[#00B4D8]/30', icon: Bell };
    default:
      return { bg: 'bg-[#27272a]', text: 'text-[#8b949e]', border: 'border-[#27272a]', icon: Bell };
  }
};

// 預警卡片
const AlertCard = ({ alert, onDismiss }) => {
  const style = getSeverityStyle(alert.severity);
  const Icon = style.icon;
  
  const formatTime = (date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / 3600000);
    if (hours < 1) return '剛才';
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
  };
  
  return (
    <div className={`
      p-4 rounded-xl border ${style.border} ${style.bg}
      ${alert.read ? 'opacity-60' : ''}
      transition-all hover:opacity-100
    `}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${style.text}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-medium ${style.text}`}>{alert.title}</h4>
            {!alert.read && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">新</Badge>
            )}
          </div>
          <p className="text-sm text-[#8b949e] mb-2">{alert.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#52525b] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(alert.timestamp)}
            </span>
            <Button variant="ghost" size="sm" className={`${style.text} text-xs h-6 px-2`}>
              {alert.actionText}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
        
        <button 
          onClick={() => onDismiss(alert.id)}
          className="text-[#52525b] hover:text-[#8b949e] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const AlertsAndAnalysisDashboard = () => {
  const [alerts, setAlerts] = useState(() => generateAlerts());
  const lostData = useMemo(() => generateLostReasons(), []);
  
  const handleDismiss = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };
  
  const unreadCount = alerts.filter(a => !a.read).length;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 預警系統 */}
      <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">預警系統</h3>
              <p className="text-sm text-[#8b949e]">需要注意的事項</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">
              {unreadCount} 則新通知
            </Badge>
          )}
        </div>
        
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[#52525b]">
            <CheckCircle2 className="w-12 h-12 mb-3 text-[#22c55e]" />
            <p className="text-[#8b949e]">目前沒有預警事項</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onDismiss={handleDismiss} />
            ))}
          </div>
        )}
      </div>
      
      {/* 未成交分析 */}
      <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <MessageSquareX className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">未成交分析</h3>
            <p className="text-sm text-[#8b949e]">了解客戶流失原因</p>
          </div>
        </div>
        
        {/* 流失原因 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[#8b949e] mb-3">流失原因分佈</h4>
          <div className="space-y-2">
            {lostData.reasons.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-24 text-sm text-[#8b949e] truncate">{item.reason}</div>
                <div className="flex-1 h-2 bg-[#1a1f26] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="text-sm text-white w-16 text-right">{item.count} 則</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 熱門問題 */}
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <h4 className="text-sm font-medium text-white mb-3">客戶最常詢問</h4>
          <div className="space-y-2">
            {lostData.topQuestions.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-[#8b949e]">{idx + 1}. {item.question}</span>
                <Badge variant="outline" className="border-[#27272a] text-[#8b949e]">
                  {item.count} 次
                </Badge>
              </div>
            ))}
          </div>
        </div>
        
        {/* 可挽回提示 */}
        <div className="mt-4 p-3 bg-[#22c55e]/10 rounded-lg border border-[#22c55e]/20">
          <p className="text-sm text-[#22c55e]">
            💡 預估有 <span className="font-bold">{lostData.couldBeConverted}</span> 位客戶可透過優惠或跟進挽回
          </p>
        </div>
      </div>
    </div>
  );
};
