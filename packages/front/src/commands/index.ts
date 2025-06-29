// Misc
import * as vscode       from 'vscode';
import { SnippetCache }  from '../cache';
import { ApiService }    from '../services/api';
import { AuthService }   from '../services/auth';
import { SearchService } from '../services/search';
import { Snippet }       from '../types/snippet';

export class CommandManager {
    private cachedSnippets: Snippet[] = [];
    private snippetCache: SnippetCache;
    private apiService: ApiService | null;
    private searchService: SearchService | null;
    private authService: AuthService;

    constructor(
        snippetCache: SnippetCache, 
        apiService: ApiService | null, 
        searchService: SearchService | null,
        authService: AuthService
    ) {
        this.snippetCache = snippetCache;
        this.apiService = apiService;
        this.searchService = searchService;
        this.authService = authService;
    }

    setCachedSnippets(snippets: Snippet[]): void {
        this.cachedSnippets = snippets;
        if (this.searchService) {
            this.searchService.setCachedSnippets(snippets);
        }
    }

    registerCommands(context: vscode.ExtensionContext): void {
        console.log('CommandManager: Registering commands...');
        const refreshCommand = vscode.commands.registerCommand(
            'sneap-front-snippets.refreshSnippets', 
            this.handleRefreshSnippets.bind(this)
        );

        const insertSnippetCommand = vscode.commands.registerCommand(
            'sneap-front-snippets.insertSnippet', 
            this.handleInsertSnippet.bind(this)
        );

        const clearCacheCommand = vscode.commands.registerCommand(
            'sneap-front-snippets.clearCache', 
            this.handleClearCache.bind(this)
        );

        const trackUsageCommand = vscode.commands.registerCommand(
            'sneap-front-snippets.trackUsage', 
            this.handleTrackUsage.bind(this)
        );

        const showUserStatsCommand = vscode.commands.registerCommand(
            'sneap-front-snippets.showUserStats', 
            this.handleShowUserStats.bind(this)
        );

        const configureApiKeyCommand = vscode.commands.registerCommand(
            'sneap-front-snippets.configureApiKey',
            this.handleConfigureApiKey.bind(this)
        );

        const resetApiKeyCommand = vscode.commands.registerCommand(
            'sneap-front-snippets.resetApiKey',
            this.handleResetApiKey.bind(this)
        );

        context.subscriptions.push(
            refreshCommand,
            insertSnippetCommand,
            clearCacheCommand,
            trackUsageCommand,
            showUserStatsCommand,
            configureApiKeyCommand,
            resetApiKeyCommand
        );
    }

    private async handleRefreshSnippets(): Promise<void> {
        if (!this.apiService) {
            vscode.window.showErrorMessage('Please configure your API key first');
            return;
        }
        const snippets = await this.apiService.fetchSnippets();
        this.setCachedSnippets(snippets);
        vscode.window.showInformationMessage(`Refreshed! Loaded ${snippets.length} snippets.`);
    }

    private handleInsertSnippet(): void {
        const stats = this.snippetCache.getStats();
        vscode.window.showInformationMessage(
            `Sneap: ${this.cachedSnippets.length} total, ${stats.memorySize} in memory cache, Storage: ${stats.storageConnected ? 'Connected' : 'Offline'}`
        );
    }

    private async handleClearCache(): Promise<void> {
        console.log('Clear cache command executed');
        await this.snippetCache.clear();
        vscode.window.showInformationMessage('Snippet cache cleared!');
    }

    private async handleTrackUsage(snippetId: number, language: string, startTime: number): Promise<void> {
        if (!this.apiService) return;
        
        const searchTime = Date.now() - startTime;
        const activeEditor = vscode.window.activeTextEditor;
        const fileExtension = activeEditor?.document.fileName.split('.').pop();
        
        await this.apiService.trackUsage({
            snippetId,
            language,
            fileExtension,
            searchTime,
            wasAccepted: true
        });
        
        console.log(`Tracked usage: snippet ${snippetId}, language ${language}, searchTime ${searchTime}ms`);
    }

    private async handleShowUserStats(): Promise<void> {
        if (!this.authService.isAuthenticated() || !this.apiService) {
            vscode.window.showErrorMessage('Please configure your API key first');
            return;
        }

        try {
            const stats = await this.apiService.getUserStats();
            
            if (stats) {
                const favLangs = stats.favoriteLanguages?.map(l => `${l.language} (${l.count})`).join(', ') || 'None yet';
                const userPrefix = this.authService.getUserPrefix();
                const message = `Statistics for ${userPrefix}:
• Total usage: ${stats.totalUsage || 0}
• Favorite languages: ${favLangs}
• Average search time: ${stats.performance?.avgSearchTime?.toFixed(1) || 'N/A'}ms`;
                
                vscode.window.showInformationMessage(message);
            } else {
                vscode.window.showErrorMessage('Unable to load statistics');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Unable to load statistics');
        }
    }

    private async handleConfigureApiKey(): Promise<void> {
        console.log('Configure command executed');
        const success = await this.authService.promptForApiKey();
        if (success) {
            vscode.window.showInformationMessage('API key configured! Restarting VS Code...');
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }

    private async handleResetApiKey(): Promise<void> {
        console.log('Reset command executed');
        const confirmation = await vscode.window.showWarningMessage(
            'Are you sure you want to delete your API key?',
            { modal: true },
            'Yes, delete'
        );
        
        if (confirmation === 'Yes, delete') {
            await this.authService.clearApiKey();
            vscode.window.showInformationMessage('API key deleted. Restarting VS Code...');
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }

}