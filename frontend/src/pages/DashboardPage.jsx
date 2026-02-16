import { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { TaskList } from '../components/dashboard/TaskList';
import { TaskDetail } from '../components/dashboard/TaskDetail';
import { TeamActivity } from '../components/dashboard/TeamActivity';
import { useTasks } from '../hooks/useTasks';
import { useVenue } from '../context/VenueContext';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

export default function DashboardPage() {
  const { currentVenue, loading: venueLoading } = useVenue();
  const {
    pendingTasks,
    inProgressTasks,
    completedTasks,
    loading: tasksLoading,
    claimTask,
    unclaimTask,
    completeTask,
    updateTaskNotes
  } = useTasks();

  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);

  // Clear selected task when venue changes
  useEffect(() => {
    setSelectedTask(null);
    setMobileView('list');
  }, [currentVenue?.id]);

  // Handle task selection on mobile
  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setMobileView('detail');
  };

  // Back to list on mobile
  const handleBackToList = () => {
    setSelectedTask(null);
    setMobileView('list');
  };

  const handleClaim = async (taskId) => {
    setActionLoading(true);
    const result = await claimTask(taskId);
    if (result.success) {
      setSelectedTask(result.data);
      toast.success('已認領任務');
    } else {
      toast.error(result.error);
    }
    setActionLoading(false);
  };

  const handleUnclaim = async (taskId) => {
    setActionLoading(true);
    const result = await unclaimTask(taskId);
    if (result.success) {
      setSelectedTask(result.data);
      toast.success('已取消認領');
    } else {
      toast.error(result.error);
    }
    setActionLoading(false);
  };

  const handleComplete = async (taskId) => {
    setActionLoading(true);
    const result = await completeTask(taskId);
    if (result.success) {
      setSelectedTask(result.data);
      toast.success('任務已完成');
    } else {
      toast.error(result.error);
    }
    setActionLoading(false);
  };

  if (venueLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35] mx-auto mb-4" />
          <p className="text-[#a1a1aa]">載入場域資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#09090b]" data-testid="dashboard">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header title="管家任務中心" />

        {/* Mobile Back Button & Team Button */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-[#27272a]">
          {mobileView === 'detail' && selectedTask ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="text-[#a1a1aa] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>
          ) : (
            <div />
          )}
          
          <Sheet open={teamSheetOpen} onOpenChange={setTeamSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#00B4D8] hover:text-[#00B4D8]/80"
              >
                <Users className="w-4 h-4 mr-2" />
                團隊動態
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-[#18181b] border-[#27272a] p-0">
              <TeamActivity />
            </SheetContent>
          </Sheet>
        </div>

        {/* Three Column Layout - Desktop */}
        <div className="flex-1 hidden lg:flex min-h-0">
          {/* Left Panel - Task List */}
          <div className="w-80 border-r border-[#27272a] flex-shrink-0">
            <TaskList
              pendingTasks={pendingTasks}
              inProgressTasks={inProgressTasks}
              completedTasks={completedTasks}
              selectedTaskId={selectedTask?.id}
              onSelectTask={setSelectedTask}
              loading={tasksLoading}
            />
          </div>

          {/* Middle Panel - Task Detail */}
          <div className="flex-1 min-w-0">
            <TaskDetail
              task={selectedTask}
              onClaim={handleClaim}
              onUnclaim={handleUnclaim}
              onComplete={handleComplete}
              onUpdateNotes={updateTaskNotes}
              loading={actionLoading}
            />
          </div>

          {/* Right Panel - Team Activity */}
          <div className="w-72 border-l border-[#27272a] flex-shrink-0">
            <TeamActivity />
          </div>
        </div>

        {/* Mobile Layout - Single Column with View Toggle */}
        <div className="flex-1 lg:hidden min-h-0">
          {mobileView === 'list' ? (
            <TaskList
              pendingTasks={pendingTasks}
              inProgressTasks={inProgressTasks}
              completedTasks={completedTasks}
              selectedTaskId={selectedTask?.id}
              onSelectTask={handleSelectTask}
              loading={tasksLoading}
            />
          ) : (
            <TaskDetail
              task={selectedTask}
              onClaim={handleClaim}
              onUnclaim={handleUnclaim}
              onComplete={handleComplete}
              onUpdateNotes={updateTaskNotes}
              loading={actionLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
