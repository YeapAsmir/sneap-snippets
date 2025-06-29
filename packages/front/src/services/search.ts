import { Snippet } from '../types/snippet';
import { SnippetCache } from '../cache';
import { ApiService } from './api';

export class SearchService {
    private cachedSnippets: Snippet[] = [];
    private debounceTimers = new Map<string, NodeJS.Timeout>();
    private snippetCache: SnippetCache;
    private apiService: ApiService;

    constructor(snippetCache: SnippetCache, apiService: ApiService) {
        this.snippetCache = snippetCache;
        this.apiService = apiService;
    }

    setCachedSnippets(snippets: Snippet[]): void {
        this.cachedSnippets = snippets;
    }

    /**
     * Debounce function for search requests
     */
    private debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number,
        key: string
    ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
        return (...args: Parameters<T>): Promise<ReturnType<T>> => {
            return new Promise((resolve) => {
                const existingTimer = this.debounceTimers.get(key);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }

                const timer = setTimeout(async () => {
                    this.debounceTimers.delete(key);
                    const result = await func(...args);
                    resolve(result);
                }, wait);

                this.debounceTimers.set(key, timer);
            });
        };
    }

    private async searchSnippetsInternal(query: string, language: string, prefix?: string): Promise<Snippet[]> {
        const cacheKey = `${query}:${language}:${prefix || ''}`;
        
        // Level 1: Check multi-level cache
        const cachedResult = await this.snippetCache.get(cacheKey, language);
        if (cachedResult) {
            return cachedResult;
        }

        // Skip API call for very short queries
        if (query.length < 2 && !prefix) {
            const results = this.cachedSnippets.filter(snippet => 
                !snippet.scope || snippet.scope.includes(language)
            ).slice(0, 10);
            
            // Cache the results
            await this.snippetCache.set(cacheKey, results, language);
            return results;
        }

        try {
            const results = await this.apiService.searchSnippets(query, language);
            
            // Store in multi-level cache
            await this.snippetCache.set(cacheKey, results, language);
            
            return results;
        } catch (error) {
            console.error('Error searching snippets:', error);
            
            // Enhanced fallback with fuzzy matching
            const results = this.cachedSnippets.filter(snippet => {
                const matchesLanguage = !snippet.scope || snippet.scope.includes(language);
                const matchesQuery = !query || 
                    snippet.prefix.toLowerCase().startsWith(query.toLowerCase()) ||
                    (snippet.name && snippet.name.toLowerCase().includes(query.toLowerCase()));
                
                return matchesLanguage && matchesQuery;
            }).slice(0, 10);
            
            // Cache even fallback results
            await this.snippetCache.set(cacheKey, results, language);
            return results;
        }
    }

    // Debounced version of search
    searchSnippets = this.debounce(this.searchSnippetsInternal.bind(this), 300, 'search');
}