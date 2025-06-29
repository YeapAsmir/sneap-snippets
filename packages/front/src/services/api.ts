import * as vscode from 'vscode';
import { Snippet, SearchResponse, UsageMetric, UserStats } from '../types/snippet';

const API_BASE_URL = 'http://localhost:3000';

export class ApiService {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    async fetchSnippets(): Promise<Snippet[]> {
        try {
            const url = `${API_BASE_URL}/api/snippets?userId=${this.userId}&limit=100`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch snippets');
            }
            const data = await response.json() as { data: Snippet[], personalized: boolean };
            console.log(`Loaded ${data.data.length} ${data.personalized ? 'personalized' : 'popular'} snippets`);
            return data.data || [];
        } catch (error) {
            console.error('Error fetching snippets:', error);
            vscode.window.showWarningMessage('Failed to fetch snippets from server. Using offline mode.');
            return [];
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
                headers: { 'Content-Type': 'application/json' },
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
            const response = await fetch(`${API_BASE_URL}/api/users/${this.userId}/stats`);
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
}