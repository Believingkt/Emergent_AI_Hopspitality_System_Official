import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Eye,
  MousePointer,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  Info,
  Sparkles,
  Satellite
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

// 引入組件
import { AIPerformanceDashboard } from './AIPerformanceDashboard';
import { ROIDashboard } from './ROIDashboard';
import { ChannelAnalysisDashboard } from './ChannelAnalysisDashboard';
import { AlertsAndAnalysisDashboard } from './AlertsAndAnalysisDashboard';

// 模擬數據 - 未來會從 PMS API 獲取
const generateMockData = () => {
  // 本月數據
  const currentMonth = {
    orders: 47,
    deposit: 235000,
    totalRevenue: 892000,
    conversionRate: 12.8,
    inquiries: 367,
    avgOrderValue: 18979,
  };
  
  // 過去 6 個月數據
  const months = ['9月', '10月', '11月', '12月', '1月', '2月'];
  const monthlyData = [
    { month: '9月', orders: 38, revenue: 680000, lastYear: 620000 },
    { month: '10月', orders: 42, revenue: 756000, lastYear: 698000 },
    { month: '11月', orders: 51, revenue: 918000, lastYear: 780000 },
    { month: '12月', orders: 58, revenue: 1044000, lastYear: 890000 },
    { month: '1月', orders: 44, revenue: 792000, lastYear: 720000 },
    { month: '2月', orders: 47, revenue: 892000, lastYear: 810000 },
  ];
  
  // 去年同期比較
  const lastYearComparison = {
    ordersGrowth: 15.2,
    revenueGrowth: 10.1,
    depositGrowth: 12.5,
  };
  
  // 銷售漏斗數據 (星鏈計畫)
  const funnel = {
    impressions: 45600,
    clicks: 2280,
    lineAdds: 912,
    conversations: 367,
    orders: 47,
    ctr: 5.0,
    conversionRate: 12.8,
  };
  
  // 全平台平均
  const platformAvg = {
    conversionRate: 8.5,
    avgOrderValue: 15200,
    responseTime: 4.2,
  };
  
  return { currentMonth, monthlyData, lastYearComparison, funnel, platformAvg };
};

// 大數字指標卡片
const MetricCard = ({ icon: Icon, label, value, prefix = '', suffix = '', trend, trendValue, color = 'orange', tooltip }) => {
  const colorMap = {
    orange: { bg: 'bg-[#FF6B35]/15', text: 'text-[#FF6B35]', border: 'border-[#FF6B35]/30' },
    cyan: { bg: 'bg-[#00B4D8]/15', text: 'text-[#00B4D8]', border: 'border-[#00B4D8]/30' },
    green: { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]', border: 'border-[#22c55e]/30' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  };
  
  const colors = colorMap[color];
  const isPositive = trend === 'up';
  
  return (
    <div className={`bg-[#0d1117] rounded-2xl p-5 border-2 ${colors.border} hover:border-opacity-60 transition-all duration-300`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-[#52525b] hover:text-[#a1a1aa]" />
              </TooltipTrigger>
              <TooltipContent className="bg-[#27272a] border-[#3f3f46] text-white">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-[#8b949e] text-sm">{label}</p>
        <div className="flex items-baseline gap-1">
          {prefix && <span className="text-[#8b949e] text-lg">{prefix}</span>}
          <span className="text-3xl font-bold text-white">{value.toLocaleString()}</span>
          {suffix && <span className="text-[#8b949e] text-lg">{suffix}</span>}
        </div>
        
        {trendValue && (
          <div className={`flex items-center gap-1 ${isPositive ? 'text-[#22c55e]' : 'text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="text-sm font-medium">{trendValue}% vs 去年同期</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 簡易柱狀圖
const SimpleBarChart = ({ data, maxValue }) => {
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, idx) => {
        const heightPercent = (item.revenue / maxValue) * 100;
        const lastYearPercent = (item.lastYear / maxValue) * 100;
        
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end h-24">
              {/* 去年同期 */}
              <div 
                className="flex-1 bg-[#27272a] rounded-t transition-all duration-500"
                style={{ height: `${lastYearPercent}%` }}
              />
              {/* 今年 */}
              <div 
                className="flex-1 bg-gradient-to-t from-[#FF6B35] to-[#00B4D8] rounded-t transition-all duration-500"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-xs text-[#8b949e]">{item.month}</span>
          </div>
        );
      })}
    </div>
  );
};

// 銷售漏斗組件
const SalesFunnel = ({ data }) => {
  const stages = [
    { key: 'impressions', label: '曝光數', icon: Eye, value: data.impressions, color: '#8b949e' },
    { key: 'clicks', label: '點擊數', icon: MousePointer, value: data.clicks, color: '#00B4D8' },
    { key: 'lineAdds', label: 'LINE 加入', icon: Users, value: data.lineAdds, color: '#22c55e' },
    { key: 'conversations', label: '開始對話', icon: MessageSquare, value: data.conversations, color: '#FF6B35' },
    { key: 'orders', label: '成交訂單', icon: CheckCircle2, value: data.orders, color: '#fbbf24' },
  ];
  
  const maxValue = Math.max(...stages.map(s => s.value));
  
  return (
    <div className="space-y-3">
      {stages.map((stage, idx) => {
        const widthPercent = (stage.value / maxValue) * 100;
        const StageIcon = stage.icon;
        const conversionFromPrev = idx > 0 
          ? ((stage.value / stages[idx - 1].value) * 100).toFixed(1)
          : null;
        
        return (
          <div key={stage.key} className="relative">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stage.color}20` }}
              >
                <StageIcon className="w-4 h-4" style={{ color: stage.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#c9d1d9]">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{stage.value.toLocaleString()}</span>
                    {conversionFromPrev && (
                      <Badge variant="outline" className="text-xs bg-transparent border-[#27272a] text-[#8b949e]">
                        {conversionFromPrev}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-[#1a1f26] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700"
                    style={{ 
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 平台比較卡片
const ComparisonCard = ({ label, yourValue, avgValue, unit = '', better = true }) => {
  const diff = yourValue - avgValue;
  const diffPercent = ((diff / avgValue) * 100).toFixed(1);
  const isBetter = better ? diff > 0 : diff < 0;
  
  return (
    <div className="bg-[#1a1f26] rounded-xl p-4">
      <p className="text-[#8b949e] text-sm mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-white">{yourValue.toLocaleString()}</span>
          <span className="text-[#8b949e] ml-1">{unit}</span>
        </div>
        <div className={`flex items-center gap-1 ${isBetter ? 'text-[#22c55e]' : 'text-red-400'}`}>
          {isBetter ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="text-sm">
            {diff > 0 ? '+' : ''}{diffPercent}%
          </span>
        </div>
      </div>
      <p className="text-xs text-[#52525b] mt-1">全平台平均：{avgValue.toLocaleString()}{unit}</p>
    </div>
  );
};

export const PerformanceDashboard = ({ venue }) => {
  const [timeRange, setTimeRange] = useState('6months');
  const data = useMemo(() => generateMockData(), []);
  
  const maxRevenue = Math.max(...data.monthlyData.map(d => Math.max(d.revenue, d.lastYear)));
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            業績總覽
          </h2>
          <p className="text-[#8b949e] mt-1 ml-13">AI 銷售 Agent 為您帶來的成果</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-[#1a1f26] border-[#27272a] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f26] border-[#27272a]">
              <SelectItem value="6months">過去 6 個月</SelectItem>
              <SelectItem value="12months">過去 12 個月</SelectItem>
              <SelectItem value="ytd">今年至今</SelectItem>
            </SelectContent>
          </Select>
          
          <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30">
            <Sparkles className="w-3 h-3 mr-1" />
            即時更新
          </Badge>
        </div>
      </div>
      
      {/* 核心指標 - 4 大數字 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          icon={ShoppingCart}
          label="本月訂單數"
          value={data.currentMonth.orders}
          suffix="筆"
          trend="up"
          trendValue={data.lastYearComparison.ordersGrowth}
          color="orange"
          tooltip="透過 AI 銷售 Agent 成交的訂單總數"
        />
        <MetricCard 
          icon={DollarSign}
          label="本月訂金收入"
          value={data.currentMonth.deposit}
          prefix="$"
          trend="up"
          trendValue={data.lastYearComparison.depositGrowth}
          color="green"
          tooltip="已收到的訂金金額"
        />
        <MetricCard 
          icon={TrendingUp}
          label="本月總營收"
          value={data.currentMonth.totalRevenue}
          prefix="$"
          trend="up"
          trendValue={data.lastYearComparison.revenueGrowth}
          color="cyan"
          tooltip="訂單總金額（含未收款項）"
        />
        <MetricCard 
          icon={Target}
          label="成交率"
          value={data.currentMonth.conversionRate}
          suffix="%"
          trend="up"
          trendValue={4.3}
          color="amber"
          tooltip="詢問 → 成交的轉換率"
        />
      </div>
      
      {/* 趨勢圖表 & 銷售漏斗 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度趨勢 */}
        <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">營收趨勢</h3>
              <p className="text-sm text-[#8b949e]">過去 6 個月 vs 去年同期</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-[#FF6B35] to-[#00B4D8]" />
                <span className="text-[#8b949e]">今年</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#27272a]" />
                <span className="text-[#8b949e]">去年</span>
              </div>
            </div>
          </div>
          
          <SimpleBarChart data={data.monthlyData} maxValue={maxRevenue} />
          
          <div className="mt-4 pt-4 border-t border-[#27272a] grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-[#8b949e] text-xs">平均月營收</p>
              <p className="text-white font-semibold">$847,000</p>
            </div>
            <div className="text-center">
              <p className="text-[#8b949e] text-xs">最高單月</p>
              <p className="text-[#22c55e] font-semibold">$1,044,000</p>
            </div>
            <div className="text-center">
              <p className="text-[#8b949e] text-xs">年成長率</p>
              <p className="text-[#FF6B35] font-semibold">+10.1%</p>
            </div>
          </div>
        </div>
        
        {/* 銷售漏斗 - 新念計畫 */}
        <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                新念計畫
                <Badge className="bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/30 text-xs">
                  流量追蹤
                </Badge>
              </h3>
              <p className="text-sm text-[#8b949e]">從曝光到成交的完整漏斗</p>
            </div>
          </div>
          
          <SalesFunnel data={data.funnel} />
          
          <div className="mt-4 pt-4 border-t border-[#27272a] grid grid-cols-2 gap-4">
            <div className="bg-[#1a1f26] rounded-lg p-3 text-center">
              <p className="text-[#8b949e] text-xs">廣告點擊率 (CTR)</p>
              <p className="text-[#00B4D8] text-xl font-bold">{data.funnel.ctr}%</p>
            </div>
            <div className="bg-[#1a1f26] rounded-lg p-3 text-center">
              <p className="text-[#8b949e] text-xs">整體轉換率</p>
              <p className="text-[#22c55e] text-xl font-bold">{data.funnel.conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI 效能 & ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIPerformanceDashboard />
        <ROIDashboard />
      </div>
      
      {/* 客戶來源分析 */}
      <ChannelAnalysisDashboard />
      
      {/* 預警系統 & 未成交分析 */}
      <AlertsAndAnalysisDashboard />
      
      {/* 服務方案 */}
      <div className="bg-gradient-to-r from-[#FF6B35]/10 to-[#00B4D8]/10 rounded-2xl p-6 border border-[#FF6B35]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#FF6B35]" />
              <h3 className="text-lg font-semibold text-white">您目前的服務方案</h3>
            </div>
            <p className="text-[#8b949e]">
              <span className="text-white font-medium">專業版</span> · AI 銷售 Agent + 新念計畫流量服務
            </p>
            <p className="text-[#8b949e] text-sm mt-1">月費：NT$ 25,000 / 月</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-[#27272a] text-[#a1a1aa] hover:text-white">
              查看方案詳情
            </Button>
            <Button className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white">
              升級方案
            </Button>
          </div>
        </div>
      </div>
      
      {/* 數據來源說明 */}
      <div className="flex items-center justify-center gap-2 text-[#52525b] text-xs">
        <Info className="w-3 h-3" />
        <span>數據來源：LINE OA 對話記錄 · 最後更新：2 分鐘前</span>
        <span className="mx-2">·</span>
        <button className="text-[#00B4D8] hover:underline">連接 PMS 系統獲取完整數據</button>
      </div>
    </div>
  );
};
