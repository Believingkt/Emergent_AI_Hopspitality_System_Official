import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'https://line-ai-bot-xiaosen.onrender.com';

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [onlineManagers, setOnlineManagers] = useState([]);
  const [activities, setActivities] = useState([]);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    try {
      // Connect using Socket.IO
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected, sending auth...');
        setConnected(true);
        
        // Send auth message after connection
        socket.emit('auth', { token });
      });

      socket.on('auth_success', (data) => {
        console.log('Socket.IO auth success:', data);
        setAuthenticated(true);
      });

      socket.on('auth_failed', (data) => {
        console.error('Socket.IO auth failed:', data);
        setAuthenticated(false);
      });

      // Listen for task events
      socket.on('task_created', (data) => {
        console.log('New task created:', data);
        
        // Add to activities
        const activity = {
          type: 'task_created',
          manager_name: '',
          message: `新任務 #${data?.task?.id || data?.id || '?'}`,
          venue_id: data?.task?.venue_id || data?.venue_id,
          timestamp: new Date().toISOString()
        };
        setActivities(prev => [activity, ...prev].slice(0, 50));

        // Notify listeners
        const listeners = listenersRef.current.get('task_created') || [];
        listeners.forEach(callback => callback(data));
      });

      socket.on('task_updated', (data) => {
        console.log('Task updated:', data);
        
        // Add to activities
        const activity = {
          type: 'task_updated',
          manager_name: data?.task?.assigned_manager || '',
          message: `任務 #${data?.task?.id || data?.id || '?'} 已更新`,
          venue_id: data?.task?.venue_id || data?.venue_id,
          timestamp: new Date().toISOString()
        };
        setActivities(prev => [activity, ...prev].slice(0, 50));

        // Notify listeners
        const listeners = listenersRef.current.get('task_updated') || [];
        listeners.forEach(callback => callback(data));
      });

      socket.on('online_managers', (data) => {
        console.log('Online managers:', data);
        setOnlineManagers(data?.managers || []);
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        setConnected(false);
        setAuthenticated(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setConnected(false);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to connect Socket.IO:', error);
    }
  }, [token]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
    setAuthenticated(false);
    setOnlineManagers([]);
    setActivities([]);
  }, []);

  const subscribe = useCallback((eventType, callback) => {
    const listeners = listenersRef.current.get(eventType) || [];
    listeners.push(callback);
    listenersRef.current.set(eventType, listeners);

    // Return unsubscribe function
    return () => {
      const updatedListeners = listenersRef.current.get(eventType) || [];
      const index = updatedListeners.indexOf(callback);
      if (index > -1) {
        updatedListeners.splice(index, 1);
        listenersRef.current.set(eventType, updatedListeners);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  const value = {
    connected,
    authenticated,
    onlineManagers,
    activities,
    subscribe,
    clearActivities: () => setActivities([])
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
