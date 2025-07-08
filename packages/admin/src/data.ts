// Admin API data functions
// Connecting to the backend admin routes on port 3001

const API_BASE_URL = 'http://localhost:3001';

// Types for API responses
export interface Team {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
  teamId: number;
  team?: Team;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  keyId: string;
  userName: string;
  isActive: boolean;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
  teamMember?: TeamMember;
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

export async function createApiKey(userName: string, teamMemberId?: number): Promise<ApiKey> {
  try {
    const body: any = { userName };
    if (teamMemberId) {
      body.teamMemberId = teamMemberId;
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/api-keys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
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

// Team Members API functions

export async function createTeamMember(memberData: { name: string; email?: string; avatar?: string; teamId: number }): Promise<TeamMember> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/team-members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(memberData)
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to create team member');
    }
  } catch (error) {
    console.error('Error creating team member:', error);
    throw error;
  }
}

export async function updateTeamMember(id: number, updates: Partial<TeamMember>): Promise<TeamMember> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/team-members/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to update team member');
    }
  } catch (error) {
    console.error('Error updating team member:', error);
    throw error;
  }
}

export async function deleteTeamMember(id: number): Promise<boolean> {
  try {
    const headers = getAuthHeaders();
    // Remove Content-Type for DELETE request to avoid empty body error
    delete (headers as any)['Content-Type'];
    
    const response = await fetch(`${API_BASE_URL}/admin/team-members/${id}`, {
      method: 'DELETE',
      headers: headers
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    return data.success;
  } catch (error) {
    console.error('Error deleting team member:', error);
    throw error;
  }
}

export async function uploadTeamMemberAvatar(id: number, avatar: string): Promise<TeamMember> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/team-members/${id}/avatar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ avatar })
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to upload avatar');
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

// Utility functions for compatibility with existing UI
// Teams API functions
export async function getTeams(): Promise<Team[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/teams`, {
      headers: getAuthHeaders()
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch teams');
    }
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
}

export async function createTeam(teamData: { name: string }): Promise<Team> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/teams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(teamData)
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to create team');
    }
  } catch (error) {
    console.error('Error creating team:', error);
    throw error;
  }
}

export async function updateTeam(id: number, updates: Partial<Team>): Promise<Team> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/teams/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to update team');
    }
  } catch (error) {
    console.error('Error updating team:', error);
    throw error;
  }
}

export async function deleteTeam(id: number): Promise<boolean> {
  try {
    const headers = getAuthHeaders();
    // Remove Content-Type for DELETE request to avoid empty body error
    delete (headers as any)['Content-Type'];
    
    const response = await fetch(`${API_BASE_URL}/admin/teams/${id}`, {
      method: 'DELETE',
      headers: headers
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    return data.success;
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
}

export async function getTeamMembers(teamId?: number): Promise<TeamMember[]> {
  try {
    const url = teamId 
      ? `${API_BASE_URL}/admin/teams/${teamId}/members`
      : `${API_BASE_URL}/admin/team-members`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    
    handleAuthError(response);
    
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch team members');
    }
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
}

export async function getStats(): Promise<Stats> {
  const keys = await getApiKeys();
  
  // Filter out system keys for accurate stats
  const validKeys = keys.filter(key => 
    key.userName !== 'system' && 
    key.userName !== 'System'
  );
  
  return {
    totalKeys: validKeys.length,
    activeKeys: validKeys.filter(k => k.isActive).length,
    totalUsage: validKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0)
  };
}