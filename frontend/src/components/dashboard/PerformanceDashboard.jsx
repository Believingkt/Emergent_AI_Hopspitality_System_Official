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

// 專業營收趨勢圖組件 - 直條圖 + 折線圖
const RevenueTrendChart = ({ data, dateRange }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  // 計算最大值（用於縮放）
  const maxValue = Math.max(...data.map(d => Math.max(d.revenue, d.lastYear))) * 1.15;
  
  // 計算總營收和成長率
  const totalCurrentYear = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalLastYear = data.reduce((sum, d) => sum + d.lastYear, 0);
  const totalGrowth = ((totalCurrentYear - totalLastYear) / totalLastYear * 100).toFixed(1);
  
  // 計算單月成長率
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };
  
  return (
    <div className="space-y-4">
      {/* 圖例和總結 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-t from-[#FF6B35] to-[#FF8F6B]" />
            <span className="text-sm text-[#8b949e]">今年 <span className="text-white font-medium">${(totalCurrentYear/10000).toFixed(0)}萬</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#3f3f46]" />
            <span className="text-sm text-[#8b949e]">去年 <span className="text-white font-medium">${(totalLastYear/10000).toFixed(0)}萬</span></span>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-lg font-bold ${parseFloat(totalGrowth) >= 0 ? 'text-[#22c55e]' : 'text-red-400'}`}>
          {parseFloat(totalGrowth) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          <span>{parseFloat(totalGrowth) >= 0 ? '+' : ''}{totalGrowth}%</span>
        </div>
      </div>
      
      {/* 直條圖 + 折線圖 */}
      <div className="relative h-64">
        {/* Y 軸刻度 */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-right pr-2">
          {[100, 75, 50, 25, 0].map((percent, i) => (
            <span key={i} className="text-xs text-[#52525b]">
              {((maxValue * percent / 100) / 10000).toFixed(0)}萬
            </span>
          ))}
        </div>
        
        {/* 圖表區域 */}
        <div className="ml-12 h-full flex flex-col">
          {/* 網格線 */}
          <div className="flex-1 relative border-l border-b border-[#27272a]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="absolute left-0 right-0 border-t border-[#27272a]/50" 
                style={{ top: `${i * 25}%` }}
              />
            ))}
            
            {/* 直條圖 */}
            <div className="absolute inset-0 flex items-end justify-around px-2 pb-0">
              {data.map((item, idx) => {
                const currentHeight = (item.revenue / maxValue) * 100;
                const lastYearHeight = (item.lastYear / maxValue) * 100;
                const growth = calculateGrowth(item.revenue, item.lastYear);
                const isHovered = hoveredIndex === idx;
                
                return (
                  <div 
                    key={idx} 
                    className="flex-1 flex items-end justify-center gap-1 h-full relative group"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* 去年直條 */}
                    <div 
                      className={`w-5 rounded-t transition-all duration-300 ${isHovered ? 'bg-[#52525b]' : 'bg-[#3f3f46]'}`}
                      style={{ height: `${lastYearHeight}%` }}
                    />
                    {/* 今年直條 */}
                    <div 
                      className={`w-5 rounded-t transition-all duration-300 ${
                        isHovered 
                          ? 'bg-gradient-to-t from-[#FF6B35] to-[#FF8F6B] shadow-lg shadow-[#FF6B35]/30' 
                          : 'bg-gradient-to-t from-[#FF6B35]/90 to-[#FF8F6B]/90'
                      }`}
                      style={{ height: `${currentHeight}%` }}
                    />
                    
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 z-10 whitespace-nowrap shadow-xl">
                        <p className="text-white font-medium text-sm">{item.month}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[#FF6B35] text-sm">${(item.revenue/10000).toFixed(0)}萬</span>
                          <span className="text-[#52525b] text-sm">${(item.lastYear/10000).toFixed(0)}萬</span>
                        </div>
                        <p className={`text-xs mt-1 ${parseFloat(growth) >= 0 ? 'text-[#22c55e]' : 'text-red-400'}`}>
                          {parseFloat(growth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(growth))}%
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* 折線圖 - 趨勢線 */}
            <svg 
              className="absolute inset-0 pointer-events-none overflow-visible" 
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00B4D8" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <filter id="glowLine">
                  <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* 今年趨勢線 */}
              <polyline
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowLine)"
                vectorEffect="non-scaling-stroke"
                points={data.map((item, idx) => {
                  const x = ((idx + 0.5) / data.length) * 100;
                  const y = 100 - (item.revenue / maxValue) * 100;
                  return `${x},${y}`;
                }).join(' ')}
              />
              
              {/* 趨勢線數據點 */}
              {data.map((item, idx) => {
                const x = ((idx + 0.5) / data.length) * 100;
                const y = 100 - (item.revenue / maxValue) * 100;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={hoveredIndex === idx ? 1.5 : 1}
                    fill="#00B4D8"
                    stroke="#0d1117"
                    strokeWidth="0.3"
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>
          </div>
          
          {/* X 軸標籤 */}
          <div className="h-8 flex justify-around items-center">
            {data.map((item, idx) => (
              <span 
                key={idx} 
                className={`text-sm transition-colors ${hoveredIndex === idx ? 'text-white font-medium' : 'text-[#8b949e]'}`}
              >
                {item.month}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* 底部數據卡片 */}
      <div className="grid grid-cols-6 gap-2">
        {data.map((item, idx) => {
          const growth = calculateGrowth(item.revenue, item.lastYear);
          const isPositive = parseFloat(growth) >= 0;
          const isHovered = hoveredIndex === idx;
          return (
            <div 
              key={idx} 
              className={`text-center p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                isHovered 
                  ? 'bg-[#FF6B35]/15 border border-[#FF6B35]/40' 
                  : 'bg-[#1a1f26] border border-transparent hover:border-[#27272a]'
              }`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <p className="text-[#52525b] text-xs">{item.month}</p>
              <p className="text-white font-semibold text-sm">${(item.revenue/10000).toFixed(0)}萬</p>
              <p className={`text-xs font-medium ${isPositive ? 'text-[#22c55e]' : 'text-red-400'}`}>
                {isPositive ? '↑' : '↓'}{Math.abs(parseFloat(growth))}%
              </p>
            </div>
          );
        })}
      </div>
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
  const [dateRange, setDateRange] = useState({
    from: new Date(2024, 8, 1), // 2024-09-01
    to: new Date(2025, 1, 28),  // 2025-02-28
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const data = useMemo(() => generateMockData(), []);
  
  const maxRevenue = Math.max(...data.monthlyData.map(d => Math.max(d.revenue, d.lastYear)));
  
  // 格式化日期顯示
  const formatDate = (date) => {
    if (!date) return '';
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // 獲取當前月份名稱
  const getCurrentMonthName = () => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return months[new Date().getMonth()];
  };
  
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
          {/* 日期範圍選擇器 */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-[#1a1f26] border-[#27272a] text-white hover:bg-[#27272a] min-w-[280px] justify-start"
              >
                <Calendar className="w-4 h-4 mr-2 text-[#FF6B35]" />
                <span className="text-sm">
                  {formatDate(dateRange.from)} ~ {formatDate(dateRange.to)}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#18181b] border-[#27272a]" align="end">
              <div className="p-3 border-b border-[#27272a]">
                <p className="text-sm text-white font-medium">選擇日期範圍</p>
                <p className="text-xs text-[#8b949e]">數據同步自 LINE OA</p>
              </div>
              <div className="p-2">
                <div className="flex gap-2 mb-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      const now = new Date();
                      setDateRange({
                        from: new Date(now.getFullYear(), now.getMonth(), 1),
                        to: now
                      });
                    }}
                    className="text-xs text-[#8b949e] hover:text-white hover:bg-[#27272a]"
                  >
                    本月
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      const now = new Date();
                      setDateRange({
                        from: new Date(now.getFullYear(), now.getMonth() - 3, 1),
                        to: now
                      });
                    }}
                    className="text-xs text-[#8b949e] hover:text-white hover:bg-[#27272a]"
                  >
                    近 3 個月
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      const now = new Date();
                      setDateRange({
                        from: new Date(now.getFullYear(), now.getMonth() - 6, 1),
                        to: now
                      });
                    }}
                    className="text-xs text-[#8b949e] hover:text-white hover:bg-[#27272a]"
                  >
                    近 6 個月
                  </Button>
                </div>
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range) setDateRange(range);
                  }}
                  numberOfMonths={2}
                  className="text-white"
                />
              </div>
              <div className="p-3 border-t border-[#27272a] flex justify-end">
                <Button 
                  size="sm"
                  onClick={() => setIsCalendarOpen(false)}
                  className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
                >
                  確認
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30">
            <Sparkles className="w-3 h-3 mr-1" />
            即時更新
          </Badge>
        </div>
      </div>
      
      {/* 日期範圍顯示 */}
      <div className="bg-[#1a1f26]/50 rounded-lg px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#FF6B35]" />
          <span className="text-sm text-[#8b949e]">統計期間：</span>
          <span className="text-sm text-white font-medium">
            {formatDate(dateRange.from)} ~ {formatDate(dateRange.to)}
          </span>
        </div>
        <span className="text-xs text-[#52525b]">數據來源：LINE OA</span>
      </div>
      
      {/* 核心指標 - 4 大數字 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          icon={ShoppingCart}
          label={`${getCurrentMonthName()}訂單數`}
          value={data.currentMonth.orders}
          suffix="筆"
          trend="up"
          trendValue={data.lastYearComparison.ordersGrowth}
          color="orange"
          tooltip="透過 AI 銷售 Agent 成交的訂單總數"
        />
        <MetricCard 
          icon={DollarSign}
          label={`${getCurrentMonthName()}訂金收入`}
          value={data.currentMonth.deposit}
          prefix="$"
          trend="up"
          trendValue={data.lastYearComparison.depositGrowth}
          color="green"
          tooltip="已收到的訂金金額"
        />
        <MetricCard 
          icon={TrendingUp}
          label={`${getCurrentMonthName()}總營收`}
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
        {/* 月度趨勢 - 使用專業圖表 */}
        <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">營收趨勢分析</h3>
              <p className="text-sm text-[#8b949e]">
                {formatDate(dateRange.from)} ~ {formatDate(dateRange.to)} vs 去年同期
              </p>
            </div>
          </div>
          
          <RevenueTrendChart data={data.monthlyData} dateRange={dateRange} />
        </div>
        
        {/* 銷售漏斗 - 星鏈計畫 */}
        <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Satellite className="w-5 h-5 text-[#00B4D8]" />
                星鏈計畫
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
              <span className="text-white font-medium">專業版</span> · AI 銷售 Agent + 星鏈計畫流量服務
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
