import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');

      if (!token) {
        setLoading(false);
        return;
      }

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      apiService.setToken(token);
      const { user: profileUser } = await apiService.getProfile();
      setUser(profileUser);
      localStorage.setItem('user', JSON.stringify(profileUser));

      // Initialize WebSocket
      wsService.connect(token);
      setupWebSocketListeners();

    } catch (error) {
      console.error('Auth initialization failed:', error);
      logout(false);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocketListeners = () => {
    wsService.on('system_alert', (data) => {
      toast.error(data.message);
    });

    wsService.on('document_processing_completed', (data) => {
      toast.success(`Document "${data.document_name}" processed successfully!`);
    });

    wsService.on('document_processing_failed', (data) => {
      toast.error(`Failed to process document "${data.document_name}": ${data.error || 'Unknown error'}`);
    });
  };

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);

      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      apiService.setToken(response.access_token);
      setUser(response.user);

      wsService.connect(response.access_token);
      setupWebSocketListeners();

      toast.success('Login successful!');
      navigate('/dashboard');

    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await apiService.register(email, password, name);

      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      apiService.setToken(response.access_token);
      setUser(response.user);

      wsService.connect(response.access_token);
      setupWebSocketListeners();

      toast.success('Registration successful!');
      navigate('/dashboard');

    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = (showToast = true) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    apiService.clearToken();
    wsService.disconnect();
    setUser(null);

    navigate('/login');
    if (showToast) {
      toast.success('Logged out successfully');
    }
  };

  const updateUser = async (userData) => {
    try {
      const response = await apiService.updateProfile(userData);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('Profile updated successfully');
    } catch (error) {
      const message = error.response?.data?.error || 'Update failed';
      toast.error(message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
    }}>
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