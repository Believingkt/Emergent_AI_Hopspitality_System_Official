import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineManagers, setOnlineManagers] = useState([]);
  const [activities, setActivities] = useState([]);
  const pollingRef = useRef(null);

  // Use polling instead of WebSocket for real-time updates
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    
    // Mark as connected once polling starts
    setConnected(true);
    
    // Poll for updates every 30 seconds
    pollingRef.current = setInterval(async () => {
      if (!token) return;
      try {
        // Simple health check to maintain "connected" status
        const resp = await fetch(`${API_URL}/api/health`);
        if (resp.ok) {
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      }
    }, 30000);
  }, [token]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setConnected(false);
    setOnlineManagers([]);
    setActivities([]);
  }, []);

  const subscribe = useCallback((eventType, callback) => {
    // Polling-based: no real-time events, but keep the interface
    return () => {};
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [isAuthenticated, startPolling, stopPolling]);

  const value = {
    connected,
    authenticated: connected,
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
