'use client';

import { useState, useEffect } from 'react';
import { getAuthState, login, logout, type LoginCredentials, type AuthResponse } from '@/lib/auth';

export function useAuth() {
  const [authState, setAuthState] = useState(() => getAuthState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Update auth state on mount and when localStorage changes
    const handleStorageChange = () => {
      setAuthState(getAuthState());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setLoading(true);
    setError('');

    try {
      const response = await login(credentials);
      
      if (response.success) {
        setAuthState(getAuthState());
      } else {
        setError(response.error || 'Login failed');
      }
      
      return response;
    } catch (err) {
      const errorMessage = 'Connection error. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setAuthState({ token: null, refreshToken: null, isAuthenticated: false });
  };

  return {
    ...authState,
    login: handleLogin,
    logout: handleLogout,
    loading,
    error,
    setError
  };
}