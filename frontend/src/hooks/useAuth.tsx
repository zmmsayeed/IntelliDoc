'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import { User } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      apiClient.setToken(token);
      const { user } = await apiClient.getProfile();
      setUser(user);

      // Initialize WebSocket connection
      wsManager.connect(token);
      
      // Set up WebSocket event listeners
      wsManager.on('system_alert', (data) => {
        toast.error(data.message);
      });
      
      wsManager.on('document_processing_completed', (data) => {
        toast.success(`Document "${data.document_name}" processed successfully!`);
      });
      
      wsManager.on('document_processing_failed', (data) => {
        toast.error(`Failed to process document "${data.document_name}": ${data.error}`);
      });

    } catch (error) {
      console.error('Auth initialization failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      apiClient.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Set API token
      apiClient.setToken(response.access_token);
      
      // Set user state
      setUser(response.user);
      
      // Initialize WebSocket
      wsManager.connect(response.access_token);
      
      toast.success('Login successful!');
      router.push('/dashboard');
      
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await apiClient.register(email, password, name);
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Set API token
      apiClient.setToken(response.access_token);
      
      // Set user state
      setUser(response.user);
      
      // Initialize WebSocket
      wsManager.connect(response.access_token);
      
      toast.success('Registration successful!');
      router.push('/dashboard');
      
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    // Clear storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Clear API client
    apiClient.clearToken();
    
    // Disconnect WebSocket
    wsManager.disconnect();
    
    // Clear user state
    setUser(null);
    
    // Redirect to login
    router.push('/auth/login');
    
    toast.success('Logged out successfully');
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const response = await apiClient.updateProfile(userData);
      setUser(response.user);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Update failed';
      toast.error(message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;