import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Home,
  CalendarDays,
  Users,
  BedDouble,
  LogIn,
  LogOut,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

// 模擬房況數據
const generateRoomData = (days) => {
  const data = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const totalRooms = 12;
    const booked = Math.floor(Math.random() * 10) + 2;
    const occupancyRate = (booked / totalRooms) * 100;
    
    data.push({
      date: date,
      dayOfWeek: date.toLocaleDateString('zh-TW', { weekday: 'short' }),
      dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
      totalRooms,
      booked,
      available: totalRooms - booked,
      occupancyRate: Math.round(occupancyRate),
      checkIn: Math.floor(Math.random() * 4),
      checkOut: Math.floor(Math.random() * 4),
    });
  }
  
  return data;
};

// 時間範圍選項
const TIME_RANGES = [
  { value: '7', label: '7 天' },
  { value: '14', label: '雙週' },
  { value: '30', label: '1 個月' },
  { value: '90', label: '3 個月' },
  { value: '180', label: '6 個月' },
  { value: '365', label: '1 年' },
];

// 入住率顏色
const getOccupancyColor = (rate) => {
  if (rate >= 80) return { bg: 'bg-[#22c55e]', text: 'text-[#22c55e]', border: 'border-[#22c55e]' };
  if (rate >= 50) return { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' };
  return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' };
};

// 日期格子組件
const DayCell = ({ day, isCompact = false }) => {
  const colors = getOccupancyColor(day.occupancyRate);
  const isWeekend = day.dayOfWeek === '週六' || day.dayOfWeek === '週日';
  const isToday = new Date().toDateString() === day.date.toDateString();
  
  if (isCompact) {
    return (
      <div className={`
        flex flex-col items-center p-2 rounded-lg 
        ${isToday ? 'ring-2 ring-[#FF6B35]' : ''}
        ${isWeekend ? 'bg-[#1a1f26]' : 'bg-[#0d1117]'}
        border border-[#27272a] hover:border-[#3f3f46] transition-colors
      `}>
        <span className={`text-xs ${isWeekend ? 'text-[#FF6B35]' : 'text-[#8b949e]'}`}>
          {day.dayOfWeek}
        </span>
        <span className="text-sm text-white font-medium">{day.dateStr}</span>
        <div className={`w-full h-1.5 rounded-full mt-1 ${colors.bg}/30`}>
          <div 
            className={`h-full rounded-full ${colors.bg}`}
            style={{ width: `${day.occupancyRate}%` }}
          />
        </div>
        <span className={`text-xs font-semibold mt-1 ${colors.text}`}>
          {day.occupancyRate}%
        </span>
      </div>
    );
  }
  
  return (
    <div className={`
      p-3 rounded-xl 
      ${isToday ? 'ring-2 ring-[#FF6B35]' : ''}
      ${isWeekend ? 'bg-[#1a1f26]' : 'bg-[#0d1117]'}
      border border-[#27272a] hover:border-[#3f3f46] transition-colors
    `}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className={`text-xs ${isWeekend ? 'text-[#FF6B35]' : 'text-[#8b949e]'}`}>
            {day.dayOfWeek}
          </span>
          <p className="text-white font-semibold">{day.dateStr}</p>
        </div>
        <Badge className={`${colors.bg}/20 ${colors.text} border-0`}>
          {day.occupancyRate}%
        </Badge>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8b949e]">已訂</span>
          <span className="text-white">{day.booked} 間</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8b949e]">空房</span>
          <span className={day.available <= 2 ? 'text-red-400' : 'text-[#22c55e]'}>
            {day.available} 間
          </span>
        </div>
        {day.checkIn > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#00B4D8]">
            <LogIn className="w-3 h-3" />
            <span>{day.checkIn} 組入住</span>
          </div>
        )}
        {day.checkOut > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <LogOut className="w-3 h-3" />
            <span>{day.checkOut} 組退房</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const RoomStatusDashboard = () => {
  const [timeRange, setTimeRange] = useState('7');
  const roomData = useMemo(() => generateRoomData(parseInt(timeRange)), [timeRange]);
  
  // 計算統計
  const stats = useMemo(() => {
    const totalBooked = roomData.reduce((sum, d) => sum + d.booked, 0);
    const totalRooms = roomData.reduce((sum, d) => sum + d.totalRooms, 0);
    const avgOccupancy = Math.round((totalBooked / totalRooms) * 100);
    const todayData = roomData[0];
    const lowOccupancyDays = roomData.filter(d => d.occupancyRate < 50).length;
    
    return {
      todayCheckIn: todayData.checkIn,
      todayCheckOut: todayData.checkOut,
      currentOccupancy: todayData.occupancyRate,
      avgOccupancy,
      lowOccupancyDays,
      totalAvailable: roomData.reduce((sum, d) => sum + d.available, 0),
    };
  }, [roomData]);
  
  const isCompactView = parseInt(timeRange) > 14;
  
  return (
    <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00B4D8]/15 flex items-center justify-center">
            <BedDouble className="w-5 h-5 text-[#00B4D8]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">房況即時看板</h3>
            <p className="text-sm text-[#8b949e]">查看未來訂房狀況</p>
          </div>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32 bg-[#1a1f26] border-[#27272a] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f26] border-[#27272a]">
            {TIME_RANGES.map(range => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* 今日狀態 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <LogIn className="w-4 h-4 text-[#00B4D8]" />
            <span className="text-[#8b949e] text-sm">今日入住</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.todayCheckIn} <span className="text-sm text-[#8b949e]">組</span></p>
        </div>
        
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <LogOut className="w-4 h-4 text-amber-400" />
            <span className="text-[#8b949e] text-sm">今日退房</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.todayCheckOut} <span className="text-sm text-[#8b949e]">組</span></p>
        </div>
        
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-4 h-4 text-[#22c55e]" />
            <span className="text-[#8b949e] text-sm">當前入住率</span>
          </div>
          <p className={`text-2xl font-bold ${getOccupancyColor(stats.currentOccupancy).text}`}>
            {stats.currentOccupancy}%
          </p>
        </div>
        
        <div className="bg-[#1a1f26] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-[#8b949e] text-sm">低入住日</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.lowOccupancyDays} <span className="text-sm text-[#8b949e]">天</span>
          </p>
          {stats.lowOccupancyDays > 0 && (
            <p className="text-xs text-red-400 mt-1">需加強銷售</p>
          )}
        </div>
      </div>
      
      {/* 日曆視圖 */}
      <div className={`grid gap-2 ${
        isCompactView 
          ? 'grid-cols-7 md:grid-cols-14' 
          : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7'
      }`}>
        {roomData.slice(0, isCompactView ? 28 : 7).map((day, idx) => (
          <DayCell key={idx} day={day} isCompact={isCompactView} />
        ))}
      </div>
      
      {parseInt(timeRange) > 7 && (
        <div className="mt-4 pt-4 border-t border-[#27272a]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8b949e]">
              期間平均入住率：<span className={`font-semibold ${getOccupancyColor(stats.avgOccupancy).text}`}>{stats.avgOccupancy}%</span>
            </span>
            <span className="text-[#8b949e]">
              總空房數：<span className="text-white font-semibold">{stats.totalAvailable} 間晚</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
