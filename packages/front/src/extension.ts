// Misc
import * as vscode      from 'vscode';
import { SnippetCache } from './cache';

interface Snippet {
    id?: number;
    name: string;
    prefix: string;
    body: string[];
    description: string;
    scope?: string[];
    usageCount?: number;
}

let cachedSnippets: Snippet[] = [];
let searchCache = new Map<string, Snippet[]>();
let debounceTimers = new Map<string, NodeJS.Timeout>();
let snippetCache: SnippetCache;
let userId: string;

// Debounce function for search requests
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    key: string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        return new Promise((resolve) => {
            const existingTimer = debounceTimers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            const timer = setTimeout(async () => {
                debounceTimers.delete(key);
                const result = await func(...args);
                resolve(result);
            }, wait);

            debounceTimers.set(key, timer);
        });
    };
}

async function fetchSnippets(): Promise<Snippet[]> {
    try {
        const url = `http://localhost:3000/api/snippets?userId=${userId}&limit=100`;
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

async function trackUsage(snippetId: number, language: string, searchTime: number, wasAccepted: boolean = true): Promise<void> {
    try {
        const activeEditor = vscode.window.activeTextEditor;
        const fileExtension = activeEditor?.document.fileName.split('.').pop();
        
        await fetch('http://localhost:3000/api/snippets/usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                snippetId,
                userId,
                language,
                fileExtension,
                searchTime,
                wasAccepted
            })
        });
    } catch (error) {
        console.error('Failed to track usage:', error);
    }
}

async function searchSnippetsInternal(query: string, language: string, prefix?: string): Promise<Snippet[]> {
    const cacheKey = `${query}:${language}:${prefix || ''}`;
    
    // Level 1: Check multi-level cache
    const cachedResult = await snippetCache.get(cacheKey, language);
    if (cachedResult) {
        return cachedResult;
    }

    // Skip API call for very short queries
    if (query.length < 2 && !prefix) {
        const results = cachedSnippets.filter(snippet => 
            !snippet.scope || snippet.scope.includes(language)
        ).slice(0, 10);
        
        // Cache the results
        await snippetCache.set(cacheKey, results, language);
        return results;
    }

    try {
        // Use the fast Trie-based prefix search API
        const endpoint = query.length <= 3 ? '/api/snippets/prefix' : '/api/snippets/search';
        const params = new URLSearchParams({
            [query.length <= 3 ? 'prefix' : 'q']: query,
            language: language,
            limit: '15'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // Reduced to 1s for faster response

        const response = await fetch(`http://localhost:3000${endpoint}?${params}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json() as { data: Snippet[]; meta?: any };
        const results = data.data || [];
        
        // Log performance metrics
        if (data.meta?.searchTime) {
            console.log(`Search completed in ${data.meta.searchTime}`);
        }
        
        // Store in multi-level cache
        await snippetCache.set(cacheKey, results, language);
        
        return results;
    } catch (error) {
        console.error('Error searching snippets:', error);
        
        // Enhanced fallback with fuzzy matching
        const results = cachedSnippets.filter(snippet => {
            const matchesLanguage = !snippet.scope || snippet.scope.includes(language);
            const matchesQuery = !query || 
                snippet.prefix.toLowerCase().startsWith(query.toLowerCase()) ||
                snippet.name.toLowerCase().includes(query.toLowerCase());
            
            return matchesLanguage && matchesQuery;
        }).slice(0, 10);
        
        // Cache even fallback results
        await snippetCache.set(cacheKey, results, language);
        return results;
    }
}

// Debounced version of search
const searchSnippets = debounce(searchSnippetsInternal, 300, 'search');

function generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Yeap Front Snippets is now active!');

    // Generate or retrieve user ID for analytics
    userId = context.globalState.get('yeap-user-id') || generateUserId();
    if (!context.globalState.get('yeap-user-id')) {
        await context.globalState.update('yeap-user-id', userId);
    }

    // Initialize multi-level cache
    snippetCache = new SnippetCache();
    await snippetCache.initialize(context);

    // Load personalized snippets
    cachedSnippets = await fetchSnippets();
    console.log(`Loaded ${cachedSnippets.length} snippets for user ${userId.substring(0, 8)}...`);

    const refreshCommand = vscode.commands.registerCommand('yeap-front-snippets.refreshSnippets', async () => {
        const snippets = await fetchSnippets();
        cachedSnippets = snippets;
        vscode.window.showInformationMessage(`Refreshed! Loaded ${snippets.length} snippets.`);
    });

    const provider = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                const languageId = document.languageId;
                
                // Extract current word being typed for prefix matching
                const wordRange = document.getWordRangeAtPosition(position);
                const currentWord = wordRange ? document.getText(wordRange) : '';
                
                // Search snippets based on current context
                const searchResults = await searchSnippets(currentWord, languageId, currentWord);
                
                const completions: vscode.CompletionItem[] = [];

                // Add all snippets from server with usage tracking
                searchResults.forEach(snippet => {
                    const completion = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
                    completion.insertText = new vscode.SnippetString(snippet.body.join('\n'));
                    completion.documentation = new vscode.MarkdownString(`**${snippet.name}**\n\n${snippet.description}`);
                    completion.detail = snippet.name;
                    completion.sortText = `0_${snippet.prefix}`;
                    
                    // Add usage tracking on completion
                    completion.command = {
                        command: 'yeap-front-snippets.trackUsage',
                        title: 'Track Usage',
                        arguments: [snippet.id, languageId, Date.now()]
                    };
                    
                    completions.push(completion);
                });

                return completions;
            }
        }
    );

    context.subscriptions.push(provider, refreshCommand);

    vscode.window.setStatusBarMessage('Yeap Snippets: Loading...', 3000);
    
    let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'yeap-front-snippets.refreshSnippets';
    statusBarItem.text = '$(sync) Yeap Snippets';
    statusBarItem.tooltip = 'Click to refresh snippets from server';
    statusBarItem.show();
    
    context.subscriptions.push(statusBarItem);

    let disposable = vscode.commands.registerCommand('yeap-front-snippets.insertSnippet', () => {
        const stats = snippetCache.getStats();
        vscode.window.showInformationMessage(
            `Yeap Snippets: ${cachedSnippets.length} total, ${stats.memorySize} in memory cache, Storage: ${stats.storageConnected ? 'Connected' : 'Offline'}`
        );
    });

    const clearCacheCommand = vscode.commands.registerCommand('yeap-front-snippets.clearCache', async () => {
        await snippetCache.clear();
        searchCache.clear();
        vscode.window.showInformationMessage('Snippet cache cleared!');
    });

    const trackUsageCommand = vscode.commands.registerCommand('yeap-front-snippets.trackUsage', async (snippetId: number, language: string, startTime: number) => {
        const searchTime = Date.now() - startTime;
        await trackUsage(snippetId, language, searchTime, true);
        console.log(`Tracked usage: snippet ${snippetId}, language ${language}, searchTime ${searchTime}ms`);
    });

    const showUserStatsCommand = vscode.commands.registerCommand('yeap-front-snippets.showUserStats', async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/users/${userId}/stats`);
            const data = await response.json() as { success: boolean; data: any };
            
            if (data.success) {
                const stats = data.data;
                const favLangs = stats.favoriteLanguages?.map((l: any) => `${l.language} (${l.count})`).join(', ') || 'None yet';
                const message = `📊 Your Snippet Stats:
• Total usage: ${stats.totalUsage || 0}
• Favorite languages: ${favLangs}
• Avg search time: ${stats.performance?.avgSearchTime?.toFixed(1) || 'N/A'}ms`;
                
                vscode.window.showInformationMessage(message);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to load user stats');
        }
    });

    context.subscriptions.push(disposable, clearCacheCommand, trackUsageCommand, showUserStatsCommand);
}

export function deactivate() {}