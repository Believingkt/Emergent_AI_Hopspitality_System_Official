import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useWebSocket } from '../../context/WebSocketContext';
import { useVenue } from '../../context/VenueContext';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Users, 
  Activity, 
  Circle, 
  HandMetal, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  User
} from 'lucide-react';

const activityIcons = {
  'task_claimed': { icon: HandMetal, color: 'text-blue-600', bg: 'bg-blue-100' },
  'task_completed': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  'task_unclaimed': { icon: XCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
  'task_created': { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100' },
  'default': { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
};

const ActivityItem = ({ activity }) => {
  const config = activityIcons[activity.type] || activityIcons.default;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 p-3 hover:bg-[#F5F5F0] transition-colors duration-150 rounded-sm animate-slide-in-right">
      <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1F2E0E]">
          <span className="font-medium">{activity.manager_name}</span>
          {' '}{activity.message}
        </p>
        <p className="text-xs text-[#64748B] mt-0.5">
          {activity.timestamp 
            ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: zhTW })
            : '剛剛'
          }
          {activity.venue_name && (
            <Badge variant="outline" className="ml-2 text-xs py-0 px-1.5">
              {activity.venue_name}
            </Badge>
          )}
        </p>
      </div>
    </div>
  );
};

export const TeamActivity = () => {
  const { onlineManagers, activities, connected } = useWebSocket();
  const { currentVenue } = useVenue();

  // Filter activities by current venue or show all with venue label
  const filteredActivities = activities.filter(
    a => !currentVenue || a.venue_id === currentVenue.id || !a.venue_id
  );

  return (
    <div className="h-full flex flex-col bg-white/80 backdrop-blur-sm">
      {/* Online Managers */}
      <div className="p-4 border-b border-[#E2E8F0]">
        <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          在線團隊
          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
            {onlineManagers.length} 人在線
          </Badge>
        </h3>
        
        <div className="space-y-2">
          {!connected ? (
            <p className="text-sm text-[#64748B] text-center py-4">
              連線中...
            </p>
          ) : onlineManagers.length === 0 ? (
            <p className="text-sm text-[#64748B] text-center py-4">
              目前沒有其他管家在線
            </p>
          ) : (
            onlineManagers.map((manager) => (
              <div 
                key={manager.id} 
                className="flex items-center gap-3 p-2 rounded-sm hover:bg-[#F5F5F0] transition-colors duration-150"
              >
                <Avatar className="w-8 h-8 bg-[#3D4A2C]">
                  <AvatarFallback className="bg-[#3D4A2C] text-white text-xs">
                    {manager.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F2E0E] truncate">
                    {manager.name}
                  </p>
                  <p className="text-xs text-[#64748B]">{manager.role}</p>
                </div>
                <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse-dot" />
              </div>
            ))
          )}
        </div>
      </div>

      <Separator className="bg-[#E2E8F0]" />

      {/* Activity Feed */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4" />
            即時動態
          </h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-4">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-[#64748B]">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暫無活動動態</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredActivities.map((activity, index) => (
                  <ActivityItem key={activity.id || index} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
