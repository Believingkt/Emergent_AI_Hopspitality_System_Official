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
      const ws = new WebSocket(`${WS_URL}?token=${token}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          // Handle built-in events
          if (type === 'online_managers') {
            setOnlineManagers(payload.managers || []);
          } else if (type === 'activity') {
            setActivities(prev => [payload, ...prev].slice(0, 50));
          }

          // Notify listeners
          const listeners = listenersRef.current.get(type) || [];
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
