import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import { useWebSocket } from '../context/WebSocketContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Normalize task from API format to our format
const normalizeTask = (task) => {
  if (!task) return null;
  return {
    // Manus v6.0 uses 'id' directly
    id: task.id || task.task_id,
    venue_id: task.venue_id,
    customer_name: task.customer_name,
    customer_user_id: task.customer_user_id || task.line_user_id,
    // Manus v6.0 uses 'initial_message'
    initial_message: task.initial_message || task.customer_message,
    ai_response: task.ai_response,
    status: task.status,
    // Manus v6.0 uses 'assigned_manager'
    assigned_to: task.assigned_manager || task.assigned_to,
    assigned_to_name: task.assigned_manager || task.assigned_to_name,
    notes: task.notes || '',
    created_at: task.created_at,
    claimed_at: task.claimed_at,
    completed_at: task.completed_at
  };
};

export const useTasks = () => {
  const { token } = useAuth();
  const { currentVenue } = useVenue();
  const { subscribe } = useWebSocket();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!token || !currentVenue) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { venue_id: currentVenue.id }
      });
      
      // Manus API: { tasks: [...] }
      const taskList = response.data.tasks || response.data || [];
      const normalizedTasks = taskList.map(normalizeTask).filter(Boolean);
      setTasks(normalizedTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('無法載入任務列表');
    } finally {
      setLoading(false);
    }
  }, [token, currentVenue]);

  // Listen for WebSocket events
  useEffect(() => {
    const unsubscribeCreated = subscribe('task_created', (payload) => {
      const taskData = payload?.task || payload;
      if (taskData && (!currentVenue || taskData.venue_id === currentVenue.id)) {
        const newTask = normalizeTask(taskData);
        if (newTask) {
          setTasks(prev => {
            // Avoid duplicates
            if (prev.some(t => t.id === newTask.id)) return prev;
            return [newTask, ...prev];
          });
        }
      }
    });

    const unsubscribeUpdated = subscribe('task_updated', (payload) => {
      const taskData = payload?.task || payload;
      if (taskData) {
        const normalizedTask = normalizeTask(taskData);
        if (normalizedTask) {
          setTasks(prev => prev.map(t => 
            t.id === normalizedTask.id ? normalizedTask : t
          ));
        }
      }
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [subscribe, currentVenue]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const claimTask = async (taskId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/tasks/${taskId}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Manus API may return { message, task_id } or { task: {...} }
      // Refetch to get updated task
      await fetchTasks();
      
      const updatedTask = tasks.find(t => t.id === taskId);
      return { success: true, data: updatedTask };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.response?.data?.message || '認領失敗' };
    }
  };

  const unclaimTask = async (taskId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/tasks/${taskId}/unclaim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refetch to get updated task
      await fetchTasks();
      
      const updatedTask = tasks.find(t => t.id === taskId);
      return { success: true, data: updatedTask };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.response?.data?.message || '取消認領失敗' };
    }
  };

  const completeTask = async (taskId, responseMessage = '') => {
    try {
      const response = await axios.post(
        `${API_URL}/api/tasks/${taskId}/complete`,
        { response: responseMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refetch to get updated task
      await fetchTasks();
      
      const updatedTask = tasks.find(t => t.id === taskId);
      return { success: true, data: updatedTask };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.response?.data?.message || '完成任務失敗' };
    }
  };

  const updateTaskNotes = async (taskId, notes) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/tasks/${taskId}`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update locally
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, notes } : t));
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.response?.data?.message || '更新備註失敗' };
    }
  };

  // Filter tasks by status
  const pendingTasks = tasks.filter(t => t.status === '待處理');
  const inProgressTasks = tasks.filter(t => t.status === '處理中');
  const completedTasks = tasks.filter(t => {
    if (t.status !== '已完成') return false;
    if (!t.completed_at) return true;
    const completedAt = new Date(t.completed_at);
    const now = new Date();
    const hoursDiff = (now - completedAt) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });

  return {
    tasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    loading,
    error,
    fetchTasks,
    claimTask,
    unclaimTask,
    completeTask,
    updateTaskNotes
  };
};
