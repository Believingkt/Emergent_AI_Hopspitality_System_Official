import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  User, 
  Clock, 
  Sun, 
  Moon, 
  Coffee,
  Calendar
} from 'lucide-react';

// 森山場域的預設管家
const SENSHAN_MANAGERS = [
  {
    id: 'manager-anan',
    name: '安安',
    avatar: '安',
    color: 'from-[#FF6B35] to-[#FF9F6B]',
  },
  {
    id: 'manager-litang',
    name: '立棠',
    avatar: '立',
    color: 'from-[#00B4D8] to-[#40E0D0]',
  },
];

// 生成隨機排班時間
const generateShiftSchedule = () => {
  const shifts = [];
  const today = new Date();
  
  // 早班 (08:00 - 16:00), 晚班 (16:00 - 24:00), 休息
  const shiftTypes = [
    { type: 'morning', label: '早班', time: '08:00 - 16:00', icon: Sun, color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
    { type: 'evening', label: '晚班', time: '16:00 - 24:00', icon: Moon, color: 'text-[#00B4D8]', bgColor: 'bg-[#00B4D8]/15' },
    { type: 'off', label: '休息', time: '', icon: Coffee, color: 'text-[#71717a]', bgColor: 'bg-[#27272a]' },
  ];
  
  // 為每個管家分配今天的班次
  SENSHAN_MANAGERS.forEach((manager, index) => {
    // 隨機分配，但確保至少一人在班
    const shiftIndex = index === 0 
      ? Math.floor(Math.random() * 2) // 安安：早班或晚班
      : (shifts[0]?.shiftType === 'morning' ? 1 : 0); // 立棠：與安安錯開
    
    const shift = shiftTypes[shiftIndex];
    
    shifts.push({
      ...manager,
      shiftType: shift.type,
      shiftLabel: shift.label,
      shiftTime: shift.time,
      shiftIcon: shift.icon,
      shiftColor: shift.color,
      shiftBgColor: shift.bgColor,
      isOnDuty: isCurrentlyOnDuty(shift.type),
    });
  });
  
  return shifts;
};

// 判斷是否在當班時間
const isCurrentlyOnDuty = (shiftType) => {
  const hour = new Date().getHours();
  if (shiftType === 'morning') return hour >= 8 && hour < 16;
  if (shiftType === 'evening') return hour >= 16 || hour < 0;
  return false;
};

// 獲取下週排班預覽
const getWeekSchedule = () => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const today = new Date();
  const schedule = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    schedule.push({
      day: days[date.getDay()],
      date: date.getDate(),
      isToday: i === 0,
      shifts: SENSHAN_MANAGERS.map((manager, idx) => ({
        managerId: manager.id,
        managerName: manager.name,
        // 簡單的輪班邏輯
        shift: (i + idx) % 3 === 2 ? 'off' : ((i + idx) % 2 === 0 ? 'morning' : 'evening'),
      })),
    });
  }
  
  return schedule;
};

const ManagerShiftCard = ({ manager }) => {
  const ShiftIcon = manager.shiftIcon;
  
  return (
    <div className={`bg-[#18181b] rounded-xl p-4 border ${manager.isOnDuty ? 'border-[#22c55e]/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-[#27272a]'} transition-all duration-300`}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <Avatar className={`w-14 h-14 bg-gradient-to-br ${manager.color}`}>
            <AvatarFallback className="bg-transparent text-white text-xl font-bold">
              {manager.avatar}
            </AvatarFallback>
          </Avatar>
          {manager.isOnDuty && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#22c55e] rounded-full border-2 border-[#18181b] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-semibold text-white">{manager.name}</span>
            {manager.isOnDuty && (
              <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30 text-xs">
                當班中
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${manager.shiftBgColor}`}>
              <ShiftIcon className={`w-3.5 h-3.5 ${manager.shiftColor}`} />
              <span className={`text-sm ${manager.shiftColor}`}>{manager.shiftLabel}</span>
            </div>
            {manager.shiftTime && (
              <span className="text-[#71717a] text-sm">{manager.shiftTime}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ManagerSchedule = ({ venueName = '森山寫照' }) => {
  const [schedule, setSchedule] = useState([]);
  const [weekSchedule, setWeekSchedule] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    setSchedule(generateShiftSchedule());
    setWeekSchedule(getWeekSchedule());
    
    // 更新當前時間
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString('zh-TW', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <User className="w-5 h-5 text-[#00B4D8]" />
            {venueName} 當班管家
          </h2>
          <p className="text-[#a1a1aa] text-sm mt-1">
            {formatDate(currentTime)} · {formatTime(currentTime)}
          </p>
        </div>
        <Badge variant="outline" className="bg-[#00B4D8]/15 text-[#00B4D8] border-[#00B4D8]/30">
          <Clock className="w-3 h-3 mr-1" />
          即時
        </Badge>
      </div>
      
      {/* Today's Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedule.map((manager) => (
          <ManagerShiftCard key={manager.id} manager={manager} />
        ))}
      </div>
      
      {/* Week Preview */}
      <div className="bg-[#18181b] rounded-xl p-5 border border-[#27272a]">
        <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          本週排班預覽
        </h3>
        
        <div className="grid grid-cols-7 gap-2">
          {weekSchedule.map((day, idx) => (
            <div 
              key={idx}
              className={`text-center p-2 rounded-lg ${day.isToday ? 'bg-[#FF6B35]/15 border border-[#FF6B35]/30' : 'bg-[#27272a]/50'}`}
            >
              <div className={`text-xs mb-1 ${day.isToday ? 'text-[#FF6B35]' : 'text-[#71717a]'}`}>
                週{day.day}
              </div>
              <div className={`text-lg font-semibold ${day.isToday ? 'text-[#FF6B35]' : 'text-white'}`}>
                {day.date}
              </div>
              <div className="mt-2 space-y-1">
                {day.shifts.map((shift, sIdx) => (
                  <div 
                    key={sIdx}
                    className={`w-full h-1.5 rounded-full ${
                      shift.shift === 'morning' ? 'bg-amber-500' : 
                      shift.shift === 'evening' ? 'bg-[#00B4D8]' : 
                      'bg-[#27272a]'
                    }`}
                    title={`${shift.managerName}: ${shift.shift === 'morning' ? '早班' : shift.shift === 'evening' ? '晚班' : '休息'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#a1a1aa]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>早班</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#00B4D8]" />
            <span>晚班</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#27272a]" />
            <span>休息</span>
          </div>
        </div>
      </div>
    </div>
  );
};
