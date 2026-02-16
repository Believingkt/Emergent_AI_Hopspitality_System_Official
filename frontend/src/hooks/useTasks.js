import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import { useWebSocket } from '../context/WebSocketContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
      setTasks(response.data);
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
        setTasks(prev => [payload.task, ...prev]);
      }
    });

    const unsubscribeUpdated = subscribe('task_updated', (payload) => {
      if (payload.venue_id === currentVenue?.id) {
        setTasks(prev => prev.map(t => 
          t.id === payload.task.id ? payload.task : t
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
      setTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '認領失敗' };
    }
  };

  const unclaimTask = async (taskId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/tasks/${taskId}/unclaim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '取消認領失敗' };
    }
  };

  const completeTask = async (taskId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/tasks/${taskId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '完成任務失敗' };
    }
  };

  const updateTaskNotes = async (taskId, notes) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/tasks/${taskId}`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || '更新備註失敗' };
    }
  };

  // Filter tasks by status
  const pendingTasks = tasks.filter(t => t.status === '待處理');
  const inProgressTasks = tasks.filter(t => t.status === '處理中');
  const completedTasks = tasks.filter(t => {
    if (t.status !== '已完成') return false;
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
