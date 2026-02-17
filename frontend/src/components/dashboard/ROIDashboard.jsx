import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { 
  DollarSign,
  Calculator,
  TrendingUp,
  PiggyBank,
  Users,
  Percent,
  ArrowUpRight
} from 'lucide-react';

// 模擬 ROI 數據
const generateROIData = () => ({
  monthlyFee: 25000,           // 月費
  totalRevenue: 892000,        // AI 帶來的營收
  ordersCount: 47,             // 訂單數
  costPerOrder: 532,           // 每筆訂單成本
  roi: 3468,                   // ROI 百分比
  humanCostSaved: 45000,       // 節省人力成本
  equivalentStaff: 1.5,        // 相當於幾個客服人員
  avgHumanSalary: 30000,       // 人工客服月薪
  aiWorkHours: 720,            // AI 工作時數（24x30）
  humanWorkHours: 176,         // 人工 8 小時 x 22 天
});

export const ROIDashboard = () => {
  const data = useMemo(() => generateROIData(), []);
  
  return (
    <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-[#22c55e]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">ROI 與成本效益</h3>
          <p className="text-sm text-[#8b949e]">您的投資報酬分析</p>
        </div>
      </div>
      
      {/* 主要 ROI 數字 */}
      <div className="bg-gradient-to-r from-[#22c55e]/10 to-[#00B4D8]/10 rounded-xl p-5 mb-6 border border-[#22c55e]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[#8b949e] text-sm mb-1">投資報酬率 (ROI)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-[#22c55e]">{data.roi}%</span>
              <div className="flex items-center text-[#22c55e] text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>超高回報</span>
              </div>
            </div>
            <p className="text-[#8b949e] text-sm mt-2">
              您投入 ${data.monthlyFee.toLocaleString()} → 獲得 ${data.totalRevenue.toLocaleString()} 營收
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-[#8b949e] text-sm">每 $1 投入獲得</p>
            <p className="text-3xl font-bold text-white">${(data.totalRevenue / data.monthlyFee).toFixed(1)}</p>
          </div>
        </div>
      </div>
      
      {/* 成本分析 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-[#FF6B35]" />
            <span className="text-[#8b949e] text-sm">月費</span>
          </div>
          <p className="text-xl font-bold text-white">${data.monthlyFee.toLocaleString()}</p>
        </div>
        
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-[#00B4D8]" />
            <span className="text-[#8b949e] text-sm">每筆訂單成本</span>
          </div>
          <p className="text-xl font-bold text-white">${data.costPerOrder}</p>
          <p className="text-xs text-[#52525b]">月費 ÷ {data.ordersCount} 筆</p>
        </div>
        
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-[#22c55e]" />
            <span className="text-[#8b949e] text-sm">節省人力成本</span>
          </div>
          <p className="text-xl font-bold text-[#22c55e]">${data.humanCostSaved.toLocaleString()}</p>
          <p className="text-xs text-[#52525b]">vs 聘請真人客服</p>
        </div>
        
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-[#8b949e] text-sm">相當於</span>
          </div>
          <p className="text-xl font-bold text-white">{data.equivalentStaff} 位</p>
          <p className="text-xs text-[#52525b]">全職客服人員</p>
        </div>
      </div>
      
      {/* 比較表 */}
      <div className="bg-[#1a1f26] rounded-xl p-4">
        <h4 className="text-sm font-semibold text-white mb-4">AI vs 真人客服比較</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#8b949e]">每月工作時數</span>
            <div className="flex items-center gap-4">
              <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">
                AI: {data.aiWorkHours} 小時
              </Badge>
              <Badge className="bg-[#27272a] text-[#8b949e] border-0">
                真人: {data.humanWorkHours} 小時
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8b949e]">回覆速度</span>
            <div className="flex items-center gap-4">
              <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">
                AI: 8 秒
              </Badge>
              <Badge className="bg-[#27272a] text-[#8b949e] border-0">
                真人: 5-30 分鐘
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8b949e]">凌晨回覆</span>
            <div className="flex items-center gap-4">
              <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">
                AI: 即時
              </Badge>
              <Badge className="bg-red-500/15 text-red-400 border-0">
                真人: 無法
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
