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
            'sneap.refreshSnippets', 
            this.handleRefreshSnippets.bind(this)
        );

        const insertSnippetCommand = vscode.commands.registerCommand(
            'sneap.insertSnippet', 
            this.handleInsertSnippet.bind(this)
        );

        const clearCacheCommand = vscode.commands.registerCommand(
            'sneap.clearCache', 
            this.handleClearCache.bind(this)
        );

        const trackUsageCommand = vscode.commands.registerCommand(
            'sneap.trackUsage', 
            this.handleTrackUsage.bind(this)
        );

        const showUserStatsCommand = vscode.commands.registerCommand(
            'sneap.showUserStats', 
            this.handleShowUserStats.bind(this)
        );

        const configureApiKeyCommand = vscode.commands.registerCommand(
            'sneap.configureApiKey',
            this.handleConfigureApiKey.bind(this)
        );

        const resetApiKeyCommand = vscode.commands.registerCommand(
            'sneap.resetApiKey',
            this.handleResetApiKey.bind(this)
        );

        const createSnippetFromSelectionCommand = vscode.commands.registerCommand(
            'sneap.createSnippetFromSelection',
            this.handleCreateSnippetFromSelection.bind(this)
        );

        context.subscriptions.push(
            refreshCommand,
            insertSnippetCommand,
            clearCacheCommand,
            trackUsageCommand,
            showUserStatsCommand,
            configureApiKeyCommand,
            resetApiKeyCommand,
            createSnippetFromSelectionCommand
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

    private async handleCreateSnippetFromSelection(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to create a snippet');
            return;
        }

        if (!this.apiService) {
            vscode.window.showErrorMessage('Please configure your API key first');
            return;
        }

        const selectedText = editor.document.getText(selection);
        const fileExtension = editor.document.languageId;
        
        // Map language IDs to snippet scopes
        const scope = this.getSnippetScope(fileExtension);

        try {
            // Prompt for snippet details
            const name = await vscode.window.showInputBox({
                prompt: 'Enter snippet name',
                placeHolder: 'e.g., "Console Log"',
                validateInput: (value) => value.trim() ? null : 'Name is required'
            });

            if (!name) return;

            const prefix = await vscode.window.showInputBox({
                prompt: 'Enter snippet prefix (trigger)',
                placeHolder: 'e.g., "cl" for console.log',
                validateInput: (value) => value.trim() ? null : 'Prefix is required'
            });

            if (!prefix) return;

            const description = await vscode.window.showInputBox({
                prompt: 'Enter snippet description',
                placeHolder: 'e.g., "Quick console log statement"'
            });

            // Get existing categories from backend
            let existingCategories: string[] = [];
            try {
                existingCategories = await this.apiService.getCategories();
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }

            // Add option to create new category
            const categoryOptions = [
                ...existingCategories,
                '$(add) Create new category...'
            ];

            let category = await vscode.window.showQuickPick(categoryOptions, {
                placeHolder: 'Select a category or create a new one',
                canPickMany: false
            });

            // Handle new category creation
            if (category === '$(add) Create new category...') {
                const newCategory = await vscode.window.showInputBox({
                    prompt: 'Enter new category name',
                    placeHolder: 'e.g., "api", "ui-components"',
                    validateInput: (value) => {
                        if (!value.trim()) return 'Category name is required';
                        if (existingCategories.includes(value.trim().toLowerCase())) {
                            return 'Category already exists';
                        }
                        return null;
                    }
                });
                category = newCategory?.trim();
            }

            if (!category) return; // User cancelled category selection

            // Create snippet object
            const snippet = {
                name: name.trim(),
                prefix: prefix.trim(),
                body: selectedText.split('\n'),
                description: description?.trim() || '',
                scope,
                category: category || 'general'
            };

            // Send to backend
            const createdSnippet = await this.apiService.createSnippet(snippet);
            
            if (createdSnippet) {
                vscode.window.showInformationMessage(
                    `Snippet "${name}" created successfully!`,
                    'Refresh Snippets'
                ).then(selection => {
                    if (selection === 'Refresh Snippets') {
                        vscode.commands.executeCommand('sneap.refreshSnippets');
                    }
                });
            } else {
                vscode.window.showErrorMessage('Failed to create snippet');
            }

        } catch (error) {
            console.error('Error creating snippet:', error);
            vscode.window.showErrorMessage('Failed to create snippet');
        }
    }

    private getSnippetScope(languageId: string): string[] {
        const scopeMapping: Record<string, string[]> = {
            'javascript': ['javascript', 'typescript'],
            'typescript': ['javascript', 'typescript'],
            'javascriptreact': ['javascriptreact', 'typescriptreact'],
            'typescriptreact': ['javascriptreact', 'typescriptreact']
        };

        return scopeMapping[languageId] || [languageId];
    }

}