// Misc
import * as vscode      from 'vscode';
import { SnippetCache } from './cache';

interface Snippet {
    name: string;
    prefix: string;
    body: string[];
    description: string;
    scope?: string[];
}

let cachedSnippets: Snippet[] = [];
let searchCache = new Map<string, Snippet[]>();
let debounceTimers = new Map<string, NodeJS.Timeout>();
let snippetCache: SnippetCache;

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
        const response = await fetch('http://localhost:3000/api/snippets');
        if (!response.ok) {
            throw new Error('Failed to fetch snippets');
        }
        const data = await response.json() as { data: Snippet[] };
        return data.data || [];
    } catch (error) {
        console.error('Error fetching snippets:', error);
        vscode.window.showWarningMessage('Failed to fetch snippets from server. Using offline mode.');
        return [];
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

export async function activate(context: vscode.ExtensionContext) {
    console.log('Yeap Front Snippets is now active!');

    // Initialize multi-level cache
    snippetCache = new SnippetCache();
    await snippetCache.initialize(context);

    // Load snippets synchronously during activation
    cachedSnippets = await fetchSnippets();
    console.log(`Loaded ${cachedSnippets.length} snippets from server`);

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

                // Add all snippets from server
                searchResults.forEach(snippet => {
                    const completion = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
                    completion.insertText = new vscode.SnippetString(snippet.body.join('\n'));
                    completion.documentation = new vscode.MarkdownString(`**${snippet.name}**\n\n${snippet.description}`);
                    completion.detail = snippet.name;
                    completion.sortText = `0_${snippet.prefix}`;
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

    context.subscriptions.push(disposable, clearCacheCommand);
}

export function deactivate() {}