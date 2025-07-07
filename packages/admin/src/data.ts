// Admin API data functions
// Connecting to the backend admin routes on port 3001

const API_BASE_URL = 'http://localhost:3001';

// Types for API responses
export interface ApiKey {
  keyId: string;
  userName: string;
  isActive: boolean;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
}

export interface Stats {
  totalKeys: number;
  activeKeys: number;
  totalUsage: number;
}

export interface SnippetStats {
  total: number;
  categories: number;
  avgUsage: number;
}

export interface UsageStats {
  totalUsage: number;
  uniqueUsers: number;
  avgSearchTime: number;
  successRate: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface AdminStats {
  snippets: SnippetStats;
  usage: UsageStats;
  categories: CategoryStats[];
  popular: any[];
  comparison?: {
    totalKeys: { current: number; change: number };
    activeKeys: { current: number; change: number };
    totalUsage: { current: number; change: number };
    totalSnippets: { current: number; change: number };
  };
  period?: string;
}

// Auth helpers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function handleAuthError(response: Response) {
  if (response.status === 401) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    window.location.href = '/login';
  }
}

// API functions
export async function getApiKeys(): Promise<ApiKey[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api-keys`, {
      headers: getAuthHeaders()
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch API keys');
    }
  } catch (error) {
    console.error('Error fetching API keys:', error);
    throw error;
  }
}

export async function createApiKey(userName: string): Promise<ApiKey> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api-keys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userName })
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to create API key');
    }
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
}

export async function updateApiKey(keyId: string, updates: Partial<ApiKey>): Promise<ApiKey> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/api-keys/${keyId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to update API key');
    }
  } catch (error) {
    console.error('Error updating API key:', error);
    throw error;
  }
}

export async function deleteApiKey(keyId: string): Promise<boolean> {
  try {
    const headers = getAuthHeaders();
    // Remove Content-Type for DELETE request to avoid empty body error
    delete (headers as any)['Content-Type'];
    
    const response = await fetch(`${API_BASE_URL}/admin/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: headers
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    return data.success;
  } catch (error) {
    console.error('Error deleting API key:', error);
    throw error;
  }
}

export async function getAdminStats(period: string = 'last_week'): Promise<AdminStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/stats?period=${period}`, {
      headers: getAuthHeaders()
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch admin statistics');
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
}

// Utility functions for compatibility with existing UI
export async function getStats(): Promise<Stats> {
  const keys = await getApiKeys();
  
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.isActive).length,
    totalUsage: keys.reduce((sum, k) => sum + (k.usageCount || 0), 0)
  };
}