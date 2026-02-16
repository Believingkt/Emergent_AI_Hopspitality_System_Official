import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  MessageSquare, 
  Bot, 
  UserCheck, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

// 模擬數據 - 實際應用中應從 API 獲取
const generateMockStats = (venueName) => {
  const totalMessages = Math.floor(Math.random() * 150) + 30;
  const aiHandled = Math.floor(totalMessages * (0.7 + Math.random() * 0.25));
  const humanHandoff = totalMessages - aiHandled;
  const conversions = Math.floor(totalMessages * (0.02 + Math.random() * 0.05));
  const conversionRate = ((conversions / totalMessages) * 100).toFixed(1);
  
  return {
    venueName,
    today: {
      totalMessages,
      aiHandled,
      humanHandoff,
      conversions,
      conversionRate: parseFloat(conversionRate)
    },
    month: {
      totalInquiries: Math.floor(Math.random() * 800) + 50,
      conversions: Math.floor(Math.random() * 40) + 5,
      conversionRate: parseFloat((Math.random() * 5 + 1).toFixed(1))
    }
  };
};

const StatCard = ({ icon: Icon, label, value, subValue, trend, iconColor = 'text-[#FF6B35]' }) => (
  <div className="bg-[#27272a]/50 rounded-xl p-4 border border-[#27272a] hover:border-[#FF6B35]/30 transition-all duration-300">
    <div className="flex items-center justify-between mb-2">
      <div className={`w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend !== undefined && (
        <Badge 
          variant="outline" 
          className={trend >= 0 
            ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30' 
            : 'bg-red-500/15 text-red-400 border-red-500/30'
          }
        >
          {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {Math.abs(trend)}%
        </Badge>
      )}
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-[#a1a1aa]">{label}</div>
    {subValue && <div className="text-xs text-[#71717a] mt-1">{subValue}</div>}
  </div>
);

const ConversionGauge = ({ rate, target = 4 }) => {
  const isOnTarget = rate >= target;
  const percentage = Math.min((rate / (target * 2)) * 100, 100);
  
  return (
    <div className="bg-[#18181b] rounded-xl p-5 border border-[#27272a]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">成交率</h3>
        <Badge 
          variant="outline" 
          className={isOnTarget 
            ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30' 
            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }
        >
          {isOnTarget ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
          {isOnTarget ? '達標' : '需改善'}
        </Badge>
      </div>
      
      <div className="flex items-end gap-2 mb-3">
        <span className={`text-4xl font-bold ${isOnTarget ? 'text-[#22c55e]' : 'text-amber-400'}`}>
          {rate}%
        </span>
        <span className="text-[#71717a] text-sm mb-1">/ 目標 {target}%</span>
      </div>
      
      <div className="relative h-3 bg-[#27272a] rounded-full overflow-hidden">
        <div 
          className={`absolute h-full rounded-full transition-all duration-500 ${
            isOnTarget ? 'bg-gradient-to-r from-[#22c55e] to-[#4ade80]' : 'bg-gradient-to-r from-amber-500 to-amber-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
        <div 
          className="absolute h-full w-0.5 bg-white/50"
          style={{ left: '50%' }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-[#71717a]">
        <span>0%</span>
        <span>{target}% (標準)</span>
        <span>{target * 2}%</span>
      </div>
    </div>
  );
};

export const VenueStats = ({ venue }) => {
  const [stats] = useState(() => generateMockStats(venue?.name || '森山寫照'));
  
  const CONVERSION_TARGET = 4;
  const INQUIRY_THRESHOLD = 100;
  
  const needsConversionAnalysis = stats.month.conversionRate < CONVERSION_TARGET;
  const needsInquiryAnalysis = stats.month.totalInquiries < INQUIRY_THRESHOLD;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {stats.venueName} 運營概況
          </h2>
          <p className="text-[#a1a1aa] text-sm mt-1">今日數據概覽</p>
        </div>
        <Badge variant="outline" className="bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/30">
          <Clock className="w-3 h-3 mr-1" />
          即時更新
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={MessageSquare}
          label="今日訊息"
          value={stats.today.totalMessages}
          subValue="則對話"
          trend={12}
          iconColor="text-[#00B4D8]"
        />
        <StatCard 
          icon={Bot}
          label="AI 處理"
          value={stats.today.aiHandled}
          subValue={`${((stats.today.aiHandled / stats.today.totalMessages) * 100).toFixed(0)}% 自動化`}
          iconColor="text-[#40E0D0]"
        />
        <StatCard 
          icon={UserCheck}
          label="轉交真人"
          value={stats.today.humanHandoff}
          subValue="則需人工處理"
          iconColor="text-[#FF6B35]"
        />
        <StatCard 
          icon={TrendingUp}
          label="今日成交"
          value={stats.today.conversions}
          subValue={`成交率 ${stats.today.conversionRate}%`}
          trend={stats.today.conversionRate >= CONVERSION_TARGET ? 8 : -5}
          iconColor="text-[#22c55e]"
        />
      </div>

      {/* Conversion Gauge */}
      <ConversionGauge rate={stats.month.conversionRate} target={CONVERSION_TARGET} />

      {/* Analysis Alerts */}
      {(needsConversionAnalysis || needsInquiryAnalysis) && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            即時分析建議
          </h3>
          
          {needsInquiryAnalysis && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-amber-400 font-medium mb-1">詢問量偏低</h4>
                  <p className="text-[#a1a1aa] text-sm">
                    本月詢問量 <span className="text-white font-medium">{stats.month.totalInquiries}</span> 則，
                    低於分析標準 {INQUIRY_THRESHOLD} 則。
                  </p>
                  <p className="text-amber-400/80 text-sm mt-2">
                    建議：檢查廣告投放效果、社群觸及率，或考慮增加曝光管道。
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {needsConversionAnalysis && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="text-red-400 font-medium mb-1">成交率未達標</h4>
                  <p className="text-[#a1a1aa] text-sm">
                    本月成交率 <span className="text-white font-medium">{stats.month.conversionRate}%</span>，
                    低於目標 {CONVERSION_TARGET}%。
                  </p>
                  <p className="text-red-400/80 text-sm mt-2">
                    建議：檢視轉交真人的對話內容，分析常見流失原因，優化 AI 回覆策略。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
