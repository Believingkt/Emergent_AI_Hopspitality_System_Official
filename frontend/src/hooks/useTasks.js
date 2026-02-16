import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import { useWebSocket } from '../context/WebSocketContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://line-ai-bot-xiaosen.onrender.com';

// Helper to normalize task from Manus API format
const normalizeTask = (task) => {
  if (!task) return null;
  return {
    id: task.task_id || task.id,
    venue_id: task.venue_id,
    customer_name: task.customer_name,
    customer_user_id: task.customer_user_id,
    initial_message: task.customer_message || task.initial_message,
    ai_response: task.ai_response,
    status: task.status,
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
      const taskList = response.data.tasks || response.data;
      const normalizedTasks = taskList.map(normalizeTask);
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
      if (payload.venue_id === currentVenue?.id) {
        const newTask = normalizeTask(payload.task || payload);
        if (newTask) {
          setTasks(prev => [newTask, ...prev]);
        }
      }
    });

    const unsubscribeUpdated = subscribe('task_updated', (payload) => {
      const taskData = payload.task || payload;
      if (taskData) {
        const normalizedTask = normalizeTask(taskData);
        setTasks(prev => prev.map(t => 
          t.id === normalizedTask.id ? normalizedTask : t
        ));
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
      // Manus API: { task: {...} }
      const updatedTask = normalizeTask(response.data.task || response.data);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return { success: true, data: updatedTask };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || '認領失敗' };
    }
  };

  const unclaimTask = async (taskId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/tasks/${taskId}/unclaim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Manus API: { task: {...} }
      const updatedTask = normalizeTask(response.data.task || response.data);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return { success: true, data: updatedTask };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || '取消認領失敗' };
    }
  };

  const completeTask = async (taskId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/tasks/${taskId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Manus API: { task: {...} }
      const updatedTask = normalizeTask(response.data.task || response.data);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return { success: true, data: updatedTask };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || '完成任務失敗' };
    }
  };

  const updateTaskNotes = async (taskId, notes) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/tasks/${taskId}`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Manus API: { task: {...} }
      const updatedTask = normalizeTask(response.data.task || response.data);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, notes } : t));
      return { success: true, data: updatedTask };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || '更新備註失敗' };
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
