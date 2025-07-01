import { Snippet } from '../types/snippet';
import { ApiService } from './api';

export class SearchService {
    private cachedSnippets: Snippet[] = [];
    private debounceTimers = new Map<string, NodeJS.Timeout>();
    private apiService: ApiService;

    constructor(apiService: ApiService) {
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
        // Skip API call for very short queries, use cached snippets
        if (query.length < 2 && !prefix) {
            return this.cachedSnippets.filter(snippet => 
                !snippet.scope || snippet.scope.includes(language)
            ).slice(0, 10);
        }

        try {
            return await this.apiService.searchSnippets(query, language);
        } catch (error) {
            console.error('Error searching snippets:', error);
            
            // Enhanced fallback with fuzzy matching
            return this.cachedSnippets.filter(snippet => {
                const matchesLanguage = !snippet.scope || snippet.scope.includes(language);
                const matchesQuery = !query || 
                    snippet.prefix.toLowerCase().startsWith(query.toLowerCase()) ||
                    (snippet.name && snippet.name.toLowerCase().includes(query.toLowerCase()));
                
                return matchesLanguage && matchesQuery;
            }).slice(0, 10);
        }
    }

    // Debounced version of search
    searchSnippets = this.debounce(this.searchSnippetsInternal.bind(this), 300, 'search');
}