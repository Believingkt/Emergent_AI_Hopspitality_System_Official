import { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { TaskList } from '../components/dashboard/TaskList';
import { TaskDetail } from '../components/dashboard/TaskDetail';
import { TeamActivity } from '../components/dashboard/TeamActivity';
import { useTasks } from '../hooks/useTasks';
import { useVenue } from '../context/VenueContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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

  // Clear selected task when venue changes
  useEffect(() => {
    setSelectedTask(null);
  }, [currentVenue?.id]);

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
      <div className="h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3D4A2C] mx-auto mb-4" />
          <p className="text-[#64748B]">載入場域資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#F5F5F0]" data-testid="dashboard">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header title="管家任務中心" />

        {/* Three Column Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Task List */}
          <div className="w-80 border-r border-[#E2E8F0] flex-shrink-0">
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
          <div className="w-72 border-l border-[#E2E8F0] flex-shrink-0">
            <TeamActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
