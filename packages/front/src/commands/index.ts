import * as vscode from 'vscode';
import { Snippet } from '../types/snippet';
import { SnippetCache } from '../cache';
import { ApiService } from '../services/api';
import { SearchService } from '../services/search';
import { AuthService } from '../services/auth';

export class CommandManager {
    private cachedSnippets: Snippet[] = [];
    private snippetCache: SnippetCache;
    private apiService: ApiService;
    private searchService: SearchService;
    private authService: AuthService;

    constructor(
        snippetCache: SnippetCache, 
        apiService: ApiService, 
        searchService: SearchService,
        authService: AuthService
    ) {
        this.snippetCache = snippetCache;
        this.apiService = apiService;
        this.searchService = searchService;
        this.authService = authService;
    }

    setCachedSnippets(snippets: Snippet[]): void {
        this.cachedSnippets = snippets;
        this.searchService.setCachedSnippets(snippets);
    }

    registerCommands(context: vscode.ExtensionContext): void {
        const refreshCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.refreshSnippets', 
            this.handleRefreshSnippets.bind(this)
        );

        const insertSnippetCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.insertSnippet', 
            this.handleInsertSnippet.bind(this)
        );

        const clearCacheCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.clearCache', 
            this.handleClearCache.bind(this)
        );

        const trackUsageCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.trackUsage', 
            this.handleTrackUsage.bind(this)
        );

        const showUserStatsCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.showUserStats', 
            this.handleShowUserStats.bind(this)
        );

        const configureApiKeyCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.configureApiKey',
            this.handleConfigureApiKey.bind(this)
        );

        context.subscriptions.push(
            refreshCommand,
            insertSnippetCommand,
            clearCacheCommand,
            trackUsageCommand,
            showUserStatsCommand,
            configureApiKeyCommand
        );
    }

    private async handleRefreshSnippets(): Promise<void> {
        const snippets = await this.apiService.fetchSnippets();
        this.setCachedSnippets(snippets);
        vscode.window.showInformationMessage(`Refreshed! Loaded ${snippets.length} snippets.`);
    }

    private handleInsertSnippet(): void {
        const stats = this.snippetCache.getStats();
        vscode.window.showInformationMessage(
            `Yeap Snippets: ${this.cachedSnippets.length} total, ${stats.memorySize} in memory cache, Storage: ${stats.storageConnected ? 'Connected' : 'Offline'}`
        );
    }

    private async handleClearCache(): Promise<void> {
        await this.snippetCache.clear();
        vscode.window.showInformationMessage('Snippet cache cleared!');
    }

    private async handleTrackUsage(snippetId: number, language: string, startTime: number): Promise<void> {
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
        if (!this.authService.isAuthenticated()) {
            vscode.window.showErrorMessage('Veuillez configurer votre clé API d\'abord');
            return;
        }

        try {
            const stats = await this.apiService.getUserStats();
            
            if (stats) {
                const favLangs = stats.favoriteLanguages?.map(l => `${l.language} (${l.count})`).join(', ') || 'None yet';
                const userPrefix = this.authService.getUserPrefix();
                const message = `📊 Statistiques de ${userPrefix}:
• Total d'utilisations: ${stats.totalUsage || 0}
• Langages préférés: ${favLangs}
• Temps de recherche moyen: ${stats.performance?.avgSearchTime?.toFixed(1) || 'N/A'}ms`;
                
                vscode.window.showInformationMessage(message);
            } else {
                vscode.window.showErrorMessage('Impossible de charger les statistiques');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Impossible de charger les statistiques');
        }
    }

    private async handleConfigureApiKey(): Promise<void> {
        const success = await this.authService.promptForApiKey();
        if (success) {
            vscode.window.showInformationMessage('✅ Clé API configurée avec succès! Actualisation des snippets...');
            await this.handleRefreshSnippets();
        }
    }
}