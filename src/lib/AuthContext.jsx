import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();
const API_URL = 'https://scabpro.com/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
        return;
      }

      // Пробуем проверить токен на сервере
      let res;
      try {
        res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (networkErr) {
        // СЕТИ НЕТ — доверяем сохранённому токену, пускаем в офлайн-режим
        const cachedUser = localStorage.getItem('cached_user');
        setUser(cachedUser ? JSON.parse(cachedUser) : null);
        setIsAuthenticated(true);
        setAuthError(null);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      // Сервер ответил, но токен невалиден (401) — реально разлогиниваем
      if (!res.ok) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('cached_user');
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      // Успех — сохраняем пользователя в кеш для офлайна
      const currentUser = await res.json();
      localStorage.setItem('cached_user', JSON.stringify(currentUser));
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      // Непредвиденная ошибка — не стираем токен, просто пускаем если он есть
      const token = localStorage.getItem('auth_token');
      if (token) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ошибка входа');
    }
    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('cached_user', JSON.stringify(data.user));
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthError(null);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required', message: 'Authentication required' });
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      login,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
