import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Clock, User, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';

const statusConfig = {
  '待處理': { 
    class: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Clock
  },
  '處理中': { 
    class: 'bg-[#00B4D8]/15 text-[#00B4D8] border-[#00B4D8]/30',
    icon: Loader2
  },
  '已完成': { 
    class: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
    icon: CheckCircle2
  }
};

const TaskCard = ({ task, isSelected, onClick }) => {
  const config = statusConfig[task.status] || statusConfig['待處理'];
  const StatusIcon = config.icon;

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-[#27272a] cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'bg-[#FF6B35]/10 border-l-4 border-l-[#FF6B35]' 
          : 'hover:bg-[#27272a]/50 border-l-4 border-l-transparent'
      }`}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">#{task.id}</span>
          <Badge variant="outline" className={`${config.class} text-xs px-2 py-0`}>
            <StatusIcon className={`w-3 h-3 mr-1 ${task.status === '處理中' ? 'animate-spin' : ''}`} />
            {task.status}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 text-sm text-[#a1a1aa] mb-2">
        <User className="w-3.5 h-3.5" />
        <span className="truncate">{task.customer_name || '未知客戶'}</span>
      </div>
      
      <p className="text-sm text-[#fafafa] line-clamp-2 mb-2">
        {task.initial_message || '無訊息內容'}
      </p>
      
      <div className="flex items-center justify-between text-xs text-[#71717a]">
        <span>
          {task.created_at 
            ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: zhTW })
            : '剛剛'
          }
        </span>
        {task.assigned_to && (
          <span className="flex items-center gap-1 text-[#00B4D8]">
            <MessageSquare className="w-3 h-3" />
            {task.assigned_to_name}
          </span>
        )}
      </div>
    </div>
  );
};

export const TaskList = ({ 
  pendingTasks, 
  inProgressTasks, 
  completedTasks, 
  selectedTaskId, 
  onSelectTask,
  loading 
}) => {
  return (
    <div className="h-full flex flex-col bg-[#18181b]/80 backdrop-blur-sm" data-testid="task-list">
      <div className="p-4 border-b border-[#27272a]">
        <h2 className="font-semibold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <MessageSquare className="w-4 h-4 text-[#FF6B35]" />
          任務列表
        </h2>
      </div>

      <Tabs defaultValue="pending" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-2 pt-2 bg-transparent border-b border-[#27272a] rounded-none h-auto pb-0">
          <TabsTrigger 
            value="pending" 
            className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-t-lg rounded-b-none px-3 py-2 text-sm transition-all duration-300"
            data-testid="tab-pending"
          >
            待處理
            <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-400 text-xs h-5 min-w-[20px]">
              {pendingTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="in-progress"
            className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-t-lg rounded-b-none px-3 py-2 text-sm transition-all duration-300"
            data-testid="tab-in-progress"
          >
            處理中
            <Badge variant="secondary" className="ml-2 bg-[#00B4D8]/20 text-[#00B4D8] text-xs h-5 min-w-[20px]">
              {inProgressTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-t-lg rounded-b-none px-3 py-2 text-sm transition-all duration-300"
            data-testid="tab-completed"
          >
            已完成
            <Badge variant="secondary" className="ml-2 bg-[#22c55e]/20 text-[#22c55e] text-xs h-5 min-w-[20px]">
              {completedTasks.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
            </div>
          ) : (
            <>
              <TabsContent value="pending" className="m-0">
                {pendingTasks.length === 0 ? (
                  <div className="py-12 text-center text-[#71717a]">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>目前沒有待處理任務</p>
                  </div>
                ) : (
                  pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onClick={() => onSelectTask(task)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="in-progress" className="m-0">
                {inProgressTasks.length === 0 ? (
                  <div className="py-12 text-center text-[#71717a]">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>目前沒有處理中任務</p>
                  </div>
                ) : (
                  inProgressTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onClick={() => onSelectTask(task)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="m-0">
                {completedTasks.length === 0 ? (
                  <div className="py-12 text-center text-[#71717a]">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>近 24 小時無已完成任務</p>
                  </div>
                ) : (
                  completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onClick={() => onSelectTask(task)}
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
};
