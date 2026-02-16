import { useState } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Clock, 
  User, 
  MessageSquare, 
  Copy, 
  Check, 
  Save,
  HandMetal,
  XCircle,
  CheckCircle2,
  Calendar,
  Bot,
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { PMSModal } from './PMSModal';

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

export const TaskDetail = ({ 
  task, 
  onClaim, 
  onUnclaim, 
  onComplete, 
  onUpdateNotes,
  loading 
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState(task?.notes || '');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pmsOpen, setPmsOpen] = useState(false);

  if (!task) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#09090b] text-[#71717a]" data-testid="task-detail-empty">
        <FileText className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg text-white/70">請從左側選擇一個任務</p>
        <p className="text-sm mt-1">查看詳細資訊和進行操作</p>
      </div>
    );
  }

  const config = statusConfig[task.status] || statusConfig['待處理'];
  const StatusIcon = config.icon;
  const isOwnTask = task.assigned_to === user?.id;
  const canClaim = task.status === '待處理';
  const canComplete = task.status === '處理中' && isOwnTask;
  const canUnclaim = task.status === '處理中' && isOwnTask;

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('已複製到剪貼簿');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    const result = await onUpdateNotes(task.id, notes);
    if (result.success) {
      toast.success('備註已儲存');
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy/MM/dd HH:mm', { locale: zhTW });
  };

  return (
    <div className="h-full flex flex-col bg-[#09090b]" data-testid="task-detail">
      {/* Header */}
      <div className="p-6 border-b border-[#27272a]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              #{task.id}
            </h2>
            <Badge variant="outline" className={`${config.class} px-3 py-1`}>
              <StatusIcon className={`w-4 h-4 mr-1.5 ${task.status === '處理中' ? 'animate-spin' : ''}`} />
              {task.status}
            </Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPmsOpen(true)}
            className="border-[#00B4D8]/50 text-[#00B4D8] hover:bg-[#00B4D8]/20 hover:border-[#00B4D8] rounded-lg transition-all duration-300"
            data-testid="pms-availability-btn"
          >
            <Calendar className="w-4 h-4 mr-2" />
            查詢房間可用性
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {canClaim && (
            <Button
              onClick={() => onClaim(task.id)}
              disabled={loading}
              className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full shadow-lg btn-glow transition-all duration-300"
              data-testid="claim-task-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HandMetal className="w-4 h-4 mr-2" />}
              認領任務
            </Button>
          )}
          
          {canComplete && (
            <>
              <Button
                onClick={() => onComplete(task.id)}
                disabled={loading}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full shadow-lg transition-all duration-300"
                data-testid="complete-task-btn"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                完成任務
              </Button>
              <Button
                onClick={() => onUnclaim(task.id)}
                disabled={loading}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 rounded-full transition-all duration-300"
                data-testid="unclaim-task-btn"
              >
                <XCircle className="w-4 h-4 mr-2" />
                取消認領
              </Button>
            </>
          )}
          
          {task.status === '處理中' && !isOwnTask && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#00B4D8]/15 text-[#00B4D8] rounded-lg border border-[#00B4D8]/30">
              <User className="w-4 h-4" />
              <span>{task.assigned_to_name} 正在處理此任務</span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="animate-slide-in-up">
            <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              客戶資訊
            </h3>
            <div className="bg-[#18181b] p-4 rounded-xl border border-[#27272a] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">客戶名稱</span>
                <span className="font-medium text-white">{task.customer_name || '未知'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">User ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-[#27272a] px-2 py-1 rounded-lg border border-[#3f3f46] text-[#00B4D8]">
                    {task.customer_user_id || '-'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
                    onClick={() => handleCopy(task.customer_user_id || '')}
                    data-testid="copy-user-id-btn"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              時間戳記
            </h3>
            <div className="bg-[#18181b] p-4 rounded-xl border border-[#27272a] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">建立時間</span>
                <span className="font-medium text-white">{formatTime(task.created_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">認領時間</span>
                <span className="font-medium text-white">{formatTime(task.claimed_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">完成時間</span>
                <span className="font-medium text-white">{formatTime(task.completed_at)}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#27272a]" />

          {/* Conversation History */}
          <div className="animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              對話歷史
            </h3>
            <div className="space-y-4">
              {/* Customer Message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-[#18181b] p-4 rounded-xl rounded-tl-none border border-[#27272a]">
                  <div className="text-xs text-[#a1a1aa] mb-1">客戶訊息</div>
                  <p className="text-white">{task.initial_message || '無訊息內容'}</p>
                </div>
              </div>
              
              {/* AI Response */}
              {task.ai_response && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#40E0D0] to-[#00B4D8] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 bg-[#00B4D8]/10 p-4 rounded-xl rounded-tl-none border border-[#00B4D8]/30">
                    <div className="text-xs text-[#00B4D8] mb-1">AI 回覆（觸發轉交）</div>
                    <p className="text-white">{task.ai_response}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-[#27272a]" />

          {/* Manager Notes */}
          <div className="animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4" />
                管家備註
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveNotes}
                disabled={saving || notes === task.notes}
                className="border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35]/20 hover:border-[#FF6B35] rounded-lg transition-all duration-300"
                data-testid="save-notes-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                儲存備註
              </Button>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="在此輸入處理備註..."
              className="min-h-[120px] bg-[#18181b] border-[#27272a] text-white placeholder:text-[#52525b] focus:border-[#FF6B35] focus:ring-[#FF6B35] rounded-xl resize-none"
              data-testid="task-notes-textarea"
            />
          </div>

          {/* Assigned Manager */}
          {task.assigned_to && (
            <div className="animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wide mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                指派管家
              </h3>
              <div className="flex items-center gap-3 bg-[#18181b] p-4 rounded-xl border border-[#27272a]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
                  <span className="text-white font-medium">
                    {task.assigned_to_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-white">{task.assigned_to_name}</div>
                  <div className="text-sm text-[#a1a1aa]">
                    {task.claimed_at && `認領於 ${formatTime(task.claimed_at)}`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* PMS Modal */}
      <PMSModal 
        open={pmsOpen} 
        onClose={() => setPmsOpen(false)} 
        venueId={task.venue_id}
      />
    </div>
  );
};
