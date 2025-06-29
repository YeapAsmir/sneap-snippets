import * as vscode from 'vscode';
import { Snippet, SearchResponse, UsageMetric, UserStats } from '../types/snippet';

const API_BASE_URL = 'http://localhost:3000';

export class ApiService {
    private userId: string;
    private apiKey: string;

    constructor(userId: string, apiKey: string) {
        this.userId = userId;
        this.apiKey = apiKey;
    }

    private getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
        };
    }

    async fetchSnippets(): Promise<Snippet[]> {
        try {
            const url = `${API_BASE_URL}/api/snippets?userId=${this.userId}&limit=100`;
            console.log('Fetching snippets from:', url);
            console.log('Headers:', this.getHeaders());
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                
                if (response.status === 401) {
                    throw new Error('Invalid API key');
                }
                throw new Error(`Failed to fetch snippets: ${response.status} ${errorText}`);
            }
            
            const data = await response.json() as { data: Snippet[], personalized: boolean };
            console.log(`Loaded ${data.data.length} ${data.personalized ? 'personalized' : 'popular'} snippets`);
            return data.data || [];
        } catch (error) {
            console.error('Error fetching snippets:', error);
            throw error; // Re-throw instead of returning empty array
        }
    }

    async searchSnippets(query: string, language: string): Promise<Snippet[]> {
        try {
            // Use the fast Trie-based prefix search API for short queries
            const endpoint = query.length <= 3 ? '/api/snippets/prefix' : '/api/snippets/search';
            const params = new URLSearchParams({
                [query.length <= 3 ? 'prefix' : 'q']: query,
                language: language,
                limit: '15'
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);

            const response = await fetch(`${API_BASE_URL}${endpoint}?${params}`, {
                headers: this.getHeaders(),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json() as SearchResponse;
            
            // Log performance metrics
            if (data.meta?.searchTime) {
                console.log(`Search completed in ${data.meta.searchTime}`);
            }
            
            return data.data || [];
        } catch (error) {
            console.error('Error searching snippets:', error);
            throw error;
        }
    }

    async trackUsage(metric: Omit<UsageMetric, 'userId'>): Promise<void> {
        try {
            await fetch(`${API_BASE_URL}/api/snippets/usage`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    ...metric,
                    userId: this.userId
                })
            });
        } catch (error) {
            console.error('Failed to track usage:', error);
        }
    }

    async getUserStats(): Promise<UserStats | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${this.userId}/stats`, {
                headers: this.getHeaders()
            });
            const data = await response.json() as { success: boolean; data: UserStats };
            
            if (data.success) {
                return data.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
            return null;
        }
    }

    async createSnippet(snippet: Omit<Snippet, 'id' | 'usageCount'>): Promise<Snippet | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/snippets`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(snippet)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create snippet: ${response.status} ${errorText}`);
            }
            
            const data = await response.json() as { success: boolean; data: Snippet };
            
            if (data.success) {
                return data.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to create snippet:', error);
            return null;
        }
    }

    async getCategories(): Promise<string[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            
            const data = await response.json() as { success: boolean; data: string[] };
            
            if (data.success) {
                return data.data;
            }
            return [];
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            return [];
        }
    }

    async deleteSnippet(id: number): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/snippets/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete snippet: ${response.status} ${errorText}`);
            }
            
            const data = await response.json() as { success: boolean };
            return data.success;
        } catch (error) {
            console.error('Failed to delete snippet:', error);
            return false;
        }
    }
}