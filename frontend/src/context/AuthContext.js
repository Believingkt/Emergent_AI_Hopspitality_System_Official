import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

// 開發預覽模式：URL 加上 ?preview=true 可跳過登入
const isPreviewMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === 'true';
};

const PREVIEW_USER = {
  email: 'test@lakeze.com',
  name: '測試帳號 (Preview)',
  role: 'admin'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(isPreviewMode() ? PREVIEW_USER : null);
  const [token, setToken] = useState(isPreviewMode() ? 'preview-token' : localStorage.getItem('token'));
  const [loading, setLoading] = useState(!isPreviewMode());

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      // Manus API: { access_token, user: {...} }
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.detail || '登入失敗，請檢查帳號密碼';
      return { success: false, error: message };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    // 預覽模式跳過驗證
    if (isPreviewMode()) {
      setLoading(false);
      return;
    }
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Manus API: { user: {...} }
      const userData = response.data.user || response.data;
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
