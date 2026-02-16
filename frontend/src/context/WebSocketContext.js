import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

const WS_URL = process.env.REACT_APP_WS_URL || 'wss://line-ai-bot-xiaosen.onrender.com/ws';

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineManagers, setOnlineManagers] = useState([]);
  const [activities, setActivities] = useState([]);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!token || !WS_URL || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Manus WebSocket: 連接後發送 auth 訊息
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected, sending auth...');
        // Send auth message after connection
        ws.send(JSON.stringify({
          type: 'auth',
          token: token
        }));
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Manus API: { event: "task_created", data: {...} }
          const eventType = data.event || data.type;
          const payload = data.data || data.payload;

          // Handle built-in events
          if (eventType === 'online_managers') {
            setOnlineManagers(payload?.managers || []);
          } else if (eventType === 'activity') {
            setActivities(prev => [payload, ...prev].slice(0, 50));
          } else if (eventType === 'task_created' || eventType === 'task_updated') {
            // Convert to activity format
            const activity = {
              type: eventType,
              manager_name: payload?.assigned_manager || payload?.task?.assigned_manager || '',
              message: eventType === 'task_created' 
                ? `新任務 #${payload?.task_id || payload?.task?.task_id}` 
                : `更新了任務 #${payload?.task?.task_id}`,
              venue_id: payload?.venue_id,
              timestamp: new Date().toISOString()
            };
            setActivities(prev => [activity, ...prev].slice(0, 50));
          }

          // Notify listeners
          const listeners = listenersRef.current.get(eventType) || [];
          listeners.forEach(callback => callback(payload));
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        wsRef.current = null;

        // Reconnect after 3 seconds
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [token, isAuthenticated]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
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
