import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Share2,
  MessageCircle,
  Globe,
  Instagram,
  Smartphone,
  Users,
  RefreshCw,
  TrendingUp,
  UserPlus
} from 'lucide-react';

// 模擬渠道數據
const generateChannelData = () => ({
  channels: [
    { 
      name: '新念計畫', 
      icon: Instagram,
      orders: 22, 
      revenue: 418000, 
      inquiries: 156,
      conversionRate: 14.1,
      color: '#E1306C',
      growth: 25.3
    },
    { 
      name: 'LINE 官方', 
      icon: MessageCircle,
      orders: 15, 
      revenue: 285000, 
      inquiries: 98,
      conversionRate: 15.3,
      color: '#22c55e',
      growth: 8.2
    },
    { 
      name: '官網', 
      icon: Globe,
      orders: 7, 
      revenue: 133000, 
      inquiries: 78,
      conversionRate: 9.0,
      color: '#00B4D8',
      growth: -2.1
    },
    { 
      name: 'OTA 平台', 
      icon: Smartphone,
      orders: 3, 
      revenue: 56000, 
      inquiries: 35,
      conversionRate: 8.6,
      color: '#FF6B35',
      growth: 5.5
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
    <div className="bg-[#1a1f26] rounded-xl p-4 hover:bg-[#1e242c] transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${channel.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: channel.color }} />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-medium">{channel.name}</h4>
          <div className="flex items-center gap-1">
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
        <Badge 
          className="border-0"
          style={{ 
            backgroundColor: `${channel.color}20`,
            color: channel.color
          }}
        >
          {channel.conversionRate}% 轉換
        </Badge>
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
        
        <div className="pt-2 border-t border-[#27272a] text-xs text-[#8b949e]">
          詢問數：{channel.inquiries} 則
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
