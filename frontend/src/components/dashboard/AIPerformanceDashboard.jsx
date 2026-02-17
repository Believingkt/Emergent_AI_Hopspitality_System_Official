import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Bot,
  Clock,
  UserCheck,
  Brain,
  Zap,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react';

// 模擬 AI 效能數據
const generateAIPerformanceData = () => ({
  autoCloseRate: 72.5,  // AI 自動成交率
  avgResponseTime: 8,   // 平均回覆秒數
  handoffRate: 27.5,    // 轉真人率
  totalConversations: 367,
  aiHandled: 268,
  humanHandled: 99,
  learningProgress: 156, // 已學習規則數
  satisfactionRate: 94.2,
  avgConversationLength: 6.8, // 平均對話輪數
  peakHour: '20:00-21:00',
  fastestResponse: 2,
  slowestResponse: 45,
});

// 效能指標卡片
const PerformanceMetric = ({ icon: Icon, label, value, unit, subtext, color = 'cyan', trend }) => {
  const colorMap = {
    cyan: 'text-[#00B4D8] bg-[#00B4D8]/15',
    green: 'text-[#22c55e] bg-[#22c55e]/15',
    orange: 'text-[#FF6B35] bg-[#FF6B35]/15',
    amber: 'text-amber-400 bg-amber-500/15',
  };
  
  return (
    <div className="bg-[#1a1f26] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[#8b949e] text-sm">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-[#8b949e]">{unit}</span>}
      </div>
      {subtext && <p className="text-xs text-[#52525b] mt-1">{subtext}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-[#22c55e] text-xs">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

export const AIPerformanceDashboard = () => {
  const data = useMemo(() => generateAIPerformanceData(), []);
  
  return (
    <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8] to-[#22c55e] flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI 效能分析</h3>
          <p className="text-sm text-[#8b949e]">AI 銷售 Agent 的表現數據</p>
        </div>
        <Badge className="ml-auto bg-[#22c55e]/15 text-[#22c55e] border-0">
          運作中
        </Badge>
      </div>
      
      {/* 核心指標 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <PerformanceMetric 
          icon={CheckCircle2}
          label="AI 自動成交率"
          value={data.autoCloseRate}
          unit="%"
          color="green"
          trend="+5.2% vs 上月"
        />
        <PerformanceMetric 
          icon={Timer}
          label="平均回覆速度"
          value={data.avgResponseTime}
          unit="秒"
          color="cyan"
          subtext="最快 2 秒 / 最慢 45 秒"
        />
        <PerformanceMetric 
          icon={UserCheck}
          label="轉真人率"
          value={data.handoffRate}
          unit="%"
          color="amber"
          subtext="越低越好"
        />
        <PerformanceMetric 
          icon={Brain}
          label="已學習規則"
          value={data.learningProgress}
          unit="條"
          color="orange"
          trend="+12 條本月"
        />
      </div>
      
      {/* 處理分佈 */}
      <div className="bg-[#1a1f26] rounded-xl p-4 mb-6">
        <h4 className="text-sm font-semibold text-white mb-4">對話處理分佈</h4>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#8b949e]">AI 自動處理</span>
              <span className="text-sm text-[#22c55e] font-semibold">{data.aiHandled} 則 ({data.autoCloseRate}%)</span>
            </div>
            <Progress value={data.autoCloseRate} className="h-2 bg-[#27272a]" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#8b949e]">轉交真人</span>
              <span className="text-sm text-amber-400 font-semibold">{data.humanHandled} 則 ({data.handoffRate}%)</span>
            </div>
            <Progress value={data.handoffRate} className="h-2 bg-[#27272a]" />
          </div>
        </div>
      </div>
      
      {/* 更多數據 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1f26] rounded-lg p-3">
          <span className="text-xs text-[#8b949e]">客戶滿意度</span>
          <p className="text-lg font-bold text-[#22c55e]">{data.satisfactionRate}%</p>
        </div>
        <div className="bg-[#1a1f26] rounded-lg p-3">
          <span className="text-xs text-[#8b949e]">平均對話輪數</span>
          <p className="text-lg font-bold text-white">{data.avgConversationLength} 輪</p>
        </div>
        <div className="bg-[#1a1f26] rounded-lg p-3">
          <span className="text-xs text-[#8b949e]">尖峰時段</span>
          <p className="text-lg font-bold text-[#FF6B35]">{data.peakHour}</p>
        </div>
      </div>
    </div>
  );
};
