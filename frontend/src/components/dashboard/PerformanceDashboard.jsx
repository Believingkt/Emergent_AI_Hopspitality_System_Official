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

// 專業營收趨勢圖組件 - 使用 SVG 繪製完整的圖表
const RevenueTrendChart = ({ data, dateRange }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  // 圖表尺寸配置
  const width = 100;
  const height = 180;
  const margin = { top: 20, right: 10, bottom: 40, left: 45 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // 計算最大值（用於 Y 軸縮放）
  const maxValue = Math.max(...data.map(d => Math.max(d.revenue, d.lastYear))) * 1.1;
  const minValue = Math.min(...data.map(d => Math.min(d.revenue, d.lastYear))) * 0.9;
  const valueRange = maxValue - minValue;
  
  // Y 軸刻度
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => minValue + valueRange * t);
  
  // 計算點座標
  const getX = (idx) => margin.left + (idx / (data.length - 1)) * innerWidth;
  const getY = (val) => margin.top + innerHeight - ((val - minValue) / valueRange) * innerHeight;
  
  // 生成曲線路徑（使用貝茲曲線使線條更平滑）
  const createSmoothPath = (values, isLastYear = false) => {
    const points = values.map((item, idx) => ({
      x: getX(idx),
      y: getY(isLastYear ? item.lastYear : item.revenue)
    }));
    
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };
  
  // 生成面積路徑
  const createAreaPath = (values, isLastYear = false) => {
    const linePath = createSmoothPath(values, isLastYear);
    const firstX = getX(0);
    const lastX = getX(values.length - 1);
    const bottomY = margin.top + innerHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };
  
  // 計算成長率
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };
  
  // 計算總營收
  const totalCurrentYear = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalLastYear = data.reduce((sum, d) => sum + d.lastYear, 0);
  const totalGrowth = calculateGrowth(totalCurrentYear, totalLastYear);
  
  return (
    <div className="space-y-4">
      {/* 圖例和總結 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF6B35]" />
            <span className="text-xs text-[#8b949e]">今年 ${(totalCurrentYear/10000).toFixed(0)}萬</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#52525b]" />
            <span className="text-xs text-[#8b949e]">去年 ${(totalLastYear/10000).toFixed(0)}萬</span>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${parseFloat(totalGrowth) >= 0 ? 'text-[#22c55e]' : 'text-red-400'}`}>
          {parseFloat(totalGrowth) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{totalGrowth}%</span>
        </div>
      </div>
      
      {/* SVG 圖表 */}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
          <defs>
            <linearGradient id="currentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lastYearGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#52525b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#52525b" stopOpacity="0.02" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* 網格線 */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={margin.left}
                y1={getY(tick)}
                x2={margin.left + innerWidth}
                y2={getY(tick)}
                stroke="#27272a"
                strokeDasharray="2,2"
              />
              <text
                x={margin.left - 3}
                y={getY(tick) + 1}
                textAnchor="end"
                className="fill-[#52525b] text-[4px]"
              >
                {(tick/10000).toFixed(0)}萬
              </text>
            </g>
          ))}
          
          {/* 去年面積 */}
          <path
            d={createAreaPath(data, true)}
            fill="url(#lastYearGradient)"
          />
          
          {/* 去年線條 */}
          <path
            d={createSmoothPath(data, true)}
            fill="none"
            stroke="#52525b"
            strokeWidth="1"
            strokeDasharray="3,2"
          />
          
          {/* 今年面積 */}
          <path
            d={createAreaPath(data)}
            fill="url(#currentGradient)"
          />
          
          {/* 今年線條 */}
          <path
            d={createSmoothPath(data)}
            fill="none"
            stroke="#FF6B35"
            strokeWidth="1.5"
            filter="url(#glow)"
          />
          
          {/* 數據點和交互區域 */}
          {data.map((item, idx) => {
            const x = getX(idx);
            const yCurrentYear = getY(item.revenue);
            const yLastYear = getY(item.lastYear);
            const growth = calculateGrowth(item.revenue, item.lastYear);
            const isHovered = hoveredIndex === idx;
            
            return (
              <g key={idx}>
                {/* 垂直參考線 */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={margin.top + innerHeight}
                    stroke="#FF6B35"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                    opacity="0.5"
                  />
                )}
                
                {/* 今年數據點 */}
                <circle
                  cx={x}
                  cy={yCurrentYear}
                  r={isHovered ? 3 : 2}
                  fill="#FF6B35"
                  className="transition-all duration-200"
                />
                {isHovered && (
                  <circle
                    cx={x}
                    cy={yCurrentYear}
                    r={5}
                    fill="#FF6B35"
                    opacity="0.3"
                  />
                )}
                
                {/* 去年數據點 */}
                <circle
                  cx={x}
                  cy={yLastYear}
                  r={isHovered ? 2 : 1.5}
                  fill="#52525b"
                  className="transition-all duration-200"
                />
                
                {/* X 軸標籤 */}
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className={`text-[5px] ${isHovered ? 'fill-white' : 'fill-[#52525b]'}`}
                >
                  {item.month}
                </text>
                
                {/* 滑鼠互動區域 */}
                <rect
                  x={x - 5}
                  y={margin.top}
                  width={10}
                  height={innerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                />
                
                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 18}
                      y={Math.min(yCurrentYear, yLastYear) - 28}
                      width={36}
                      height={25}
                      rx={2}
                      fill="#18181b"
                      stroke="#27272a"
                      strokeWidth="0.5"
                    />
                    <text
                      x={x}
                      y={Math.min(yCurrentYear, yLastYear) - 18}
                      textAnchor="middle"
                      className="fill-white text-[4px] font-medium"
                    >
                      ${(item.revenue/10000).toFixed(0)}萬
                    </text>
                    <text
                      x={x}
                      y={Math.min(yCurrentYear, yLastYear) - 10}
                      textAnchor="middle"
                      className={`text-[3.5px] ${parseFloat(growth) >= 0 ? 'fill-[#22c55e]' : 'fill-red-400'}`}
                    >
                      {parseFloat(growth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(growth))}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* 詳細數據表格 */}
      <div className="grid grid-cols-6 gap-1 text-xs">
        {data.map((item, idx) => {
          const growth = calculateGrowth(item.revenue, item.lastYear);
          const isPositive = parseFloat(growth) >= 0;
          return (
            <div 
              key={idx} 
              className={`text-center p-2 rounded-lg transition-all duration-200 ${
                hoveredIndex === idx ? 'bg-[#FF6B35]/10 border border-[#FF6B35]/30' : 'bg-[#1a1f26]'
              }`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <p className="text-[#52525b] text-[10px]">{item.month}</p>
              <p className="text-white font-medium">${(item.revenue/10000).toFixed(0)}萬</p>
              <p className={`text-[10px] ${isPositive ? 'text-[#22c55e]' : 'text-red-400'}`}>
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
