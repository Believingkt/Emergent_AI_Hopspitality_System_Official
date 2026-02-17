import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Share2,
  MessageCircle,
  Users,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Bot,
  ChevronDown
} from 'lucide-react';

// 模擬渠道數據
const generateChannelData = () => ({
  channels: [
    { 
      name: '人客多 AI 智能接單系統', 
      icon: MessageCircle,
      orders: 37, 
      revenue: 703000, 
      inquiries: 254,
      conversionRate: 14.6,
      color: '#FF6B35',
      growth: 18.5,
      description: '新念計畫 + LINE 官方整合'
    },
    { 
      name: '其他', 
      icon: Users,
      orders: 10, 
      revenue: 189000, 
      inquiries: 45,
      conversionRate: 22.2,
      color: '#8B5CF6',
      growth: 5.2,
      description: 'OTA、親友介紹、電話詢問等',
      subChannels: [
        { name: 'OTA 平台', orders: 4, revenue: 76000 },
        { name: '親友介紹', orders: 4, revenue: 80000 },
        { name: '電話詢問', orders: 2, revenue: 33000 },
      ]
    },
  ],
  newVsReturning: {
    newCustomers: 31,
    returningCustomers: 16,
    newPercentage: 66,
    returningPercentage: 34,
  },
  totalOrders: 47,
  totalRevenue: 892000,
});

// 渠道卡片
const ChannelCard = ({ channel, totalOrders, totalRevenue }) => {
  const Icon = channel.icon;
  const orderPercentage = ((channel.orders / totalOrders) * 100).toFixed(1);
  const revenuePercentage = ((channel.revenue / totalRevenue) * 100).toFixed(1);
  
  return (
    <div className="bg-[#1a1f26] rounded-xl p-4 hover:bg-[#1e242c] transition-colors mb-3">
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${channel.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: channel.color }} />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-medium">{channel.name}</h4>
          {channel.description && (
            <p className="text-xs text-[#52525b]">{channel.description}</p>
          )}
        </div>
        <div className="text-right">
          <Badge 
            className="border-0"
            style={{ 
              backgroundColor: `${channel.color}20`,
              color: channel.color
            }}
          >
            {channel.conversionRate}% 轉換
          </Badge>
          <div className="flex items-center gap-1 mt-1 justify-end">
            {channel.growth >= 0 ? (
              <TrendingUp className="w-3 h-3 text-[#22c55e]" />
            ) : (
              <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
            )}
            <span className={`text-xs ${channel.growth >= 0 ? 'text-[#22c55e]' : 'text-red-400'}`}>
              {channel.growth >= 0 ? '+' : ''}{channel.growth}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#8b949e]">訂單數</span>
            <span className="text-white">{channel.orders} 筆 ({orderPercentage}%)</span>
          </div>
          <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ width: `${orderPercentage}%`, backgroundColor: channel.color }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#8b949e]">營收</span>
            <span className="text-white">${channel.revenue.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ width: `${revenuePercentage}%`, backgroundColor: channel.color }}
            />
          </div>
        </div>
        
        {/* 子渠道明細 */}
        {channel.subChannels && (
          <div className="pt-3 border-t border-[#27272a]">
            <p className="text-xs text-[#52525b] mb-2">渠道明細：</p>
            <div className="space-y-1.5">
              {channel.subChannels.map((sub, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-[#8b949e]">{sub.name}</span>
                  <span className="text-[#8b949e]">{sub.orders} 筆 · ${sub.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!channel.subChannels && (
          <div className="pt-2 border-t border-[#27272a] text-xs text-[#8b949e]">
            詢問數：{channel.inquiries} 則
          </div>
        )}
      </div>
    </div>
  );
};

export const ChannelAnalysisDashboard = () => {
  const data = useMemo(() => generateChannelData(), []);
  
  // 找出最佳渠道
  const bestChannel = data.channels.reduce((prev, curr) => 
    curr.conversionRate > prev.conversionRate ? curr : prev
  );
  
  return (
    <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/15 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">客戶來源分析</h3>
            <p className="text-sm text-[#8b949e]">各渠道的訂單與轉換率</p>
          </div>
        </div>
        <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-0">
          最佳：{bestChannel.name} ({bestChannel.conversionRate}%)
        </Badge>
      </div>
      
      {/* 渠道卡片 */}
      {/* 主要渠道卡片 */}
      <div className="mb-6">
        {data.channels.map((channel, idx) => (
          <ChannelCard 
            key={idx} 
            channel={channel} 
            totalOrders={data.totalOrders}
            totalRevenue={data.totalRevenue}
          />
        ))}
      </div>
      
      {/* 新客 vs 回頭客 */}
      <div className="bg-[#1a1f26] rounded-xl p-4">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00B4D8]" />
          新客 vs 回頭客
        </h4>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00B4D8]" />
                <span className="text-[#8b949e]">新客戶</span>
              </div>
              <span className="text-white font-semibold">
                {data.newVsReturning.newCustomers} 位 ({data.newVsReturning.newPercentage}%)
              </span>
            </div>
            <div className="h-3 bg-[#27272a] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00B4D8] rounded-full"
                style={{ width: `${data.newVsReturning.newPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#22c55e]" />
                <span className="text-[#8b949e]">回頭客</span>
              </div>
              <span className="text-white font-semibold">
                {data.newVsReturning.returningCustomers} 位 ({data.newVsReturning.returningPercentage}%)
              </span>
            </div>
            <div className="h-3 bg-[#27272a] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#22c55e] rounded-full"
                style={{ width: `${data.newVsReturning.returningPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
