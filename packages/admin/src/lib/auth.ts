/**
 * Authentication utilities for Next.js admin panel
 * Handles JWT token management and auth state
 */

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Get current authentication state from localStorage
 */
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { token: null, refreshToken: null, isAuthenticated: false };
  }

  const token = localStorage.getItem('adminToken');
  const refreshToken = localStorage.getItem('adminRefreshToken');
  
  return {
    token,
    refreshToken,
    isAuthenticated: !!token
  };
}

/**
 * Store authentication tokens in localStorage
 */
export function setAuthTokens(token: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('adminToken', token);
  if (refreshToken) {
    localStorage.setItem('adminRefreshToken', refreshToken);
  }
}

/**
 * Clear authentication tokens from localStorage
 */
export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminRefreshToken');
}

/**
 * Login with credentials
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Store tokens
      setAuthTokens(data.token, credentials.rememberMe ? data.refreshToken : undefined);
      return { success: true, token: data.token, refreshToken: data.refreshToken };
    } else {
      return { success: false, error: data.error || 'Invalid credentials' };
    }
  } catch (error) {
    return { success: false, error: 'Connection error. Please try again.' };
  }
}

/**
 * Logout and clear tokens
 */
export function logout(): void {
  clearAuthTokens();
  window.location.href = '/login';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthState().isAuthenticated;
}

/**
 * Get Authorization header for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const { token } = getAuthState();
  return token ? { Authorization: `Bearer ${token}` } : {};
}