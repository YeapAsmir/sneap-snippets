// Misc
import * as vscode       from 'vscode';
import { ApiService }    from '../services/api';
import { AuthService }   from '../services/auth';
import { SearchService } from '../services/search';
import { Snippet }       from '../types/snippet';

export class CommandManager {
    private cachedSnippets: Snippet[] = [];
    private apiService: ApiService | null;
    private searchService: SearchService | null;
    private authService: AuthService;
    private context: vscode.ExtensionContext | null = null;
    private refreshTimeout: NodeJS.Timeout | null = null;
    private isRefreshing: boolean = false;

    constructor(
        apiService: ApiService | null, 
        searchService: SearchService | null,
        authService: AuthService
    ) {
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

    private async forceCompletionRefresh(): Promise<void> {
        if (this.context && this.searchService) {
            const { reregisterCompletionProvider } = await import('../extension');
            reregisterCompletionProvider(this.searchService, this.context);
        }
    }

    registerCommands(context: vscode.ExtensionContext): void {
        this.context = context;
        // Commands that are always available
        const configureApiKeyCommand = vscode.commands.registerCommand(
            'sneap.configureApiKey',
            this.handleConfigureApiKey.bind(this)
        );

        const refreshSnippetsCommand = vscode.commands.registerCommand(
            'sneap.refreshSnippets', 
            this.handleRefreshSnippets.bind(this)
        );

        // Always register these commands
        context.subscriptions.push(
            configureApiKeyCommand,
            refreshSnippetsCommand
        );

        // Commands that require authentication
        if (this.authService.isAuthenticated()) {

            const insertSnippetCommand = vscode.commands.registerCommand(
                'sneap.showInfo', 
                this.handleInsertSnippet.bind(this)
            );

            const trackUsageCommand = vscode.commands.registerCommand(
                'sneap.trackUsage', 
                this.handleTrackUsage.bind(this)
            );

            const resetApiKeyCommand = vscode.commands.registerCommand(
                'sneap.resetApiKey',
                this.handleResetApiKey.bind(this)
            );

            const createSnippetFromSelectionCommand = vscode.commands.registerCommand(
                'sneap.createSnippetFromSelection',
                this.handleCreateSnippetFromSelection.bind(this)
            );

            const deleteSnippetByPrefixCommand = vscode.commands.registerCommand(
                'sneap.deleteSnippetByPrefix',
                this.handledeleteSnippetByPrefix.bind(this)
            );

            context.subscriptions.push(
                insertSnippetCommand,
                trackUsageCommand,
                resetApiKeyCommand,
                createSnippetFromSelectionCommand,
                deleteSnippetByPrefixCommand
            );
        }
    }

    private async handleRefreshSnippets(silent: boolean = false): Promise<void> {
        if (!this.authService.isAuthenticated() || !this.apiService) {
            vscode.window.showErrorMessage('Please configure your API key first');
            return;
        }

        // Debounce: Clear existing timeout and prevent multiple concurrent requests
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        
        if (this.isRefreshing) {
            if (!silent) {
                vscode.window.showInformationMessage('Refresh already in progress...');
            }
            return;
        }

        return new Promise((resolve) => {
            this.refreshTimeout = setTimeout(async () => {
                this.isRefreshing = true;
                
                let snippets: Snippet[] = [];
                let success = false;
                
                if (!silent) {
                    // Show progress notification during the entire fetch operation
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Refreshing snippets...',
                        cancellable: false
                    }, async () => {
                        try {
                            snippets = await this.retryFetchSnippets();
                            this.setCachedSnippets(snippets);
                            success = true;
                        } catch (error: any) {
                            console.error('Error refreshing snippets:', error);
                            success = false;
                        }
                    });
                    
                    // Small delay to ensure progress bar is fully closed
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Show result notification after progress bar is closed
                    if (success) {
                        vscode.window.showInformationMessage(`Refreshed! Loaded ${snippets.length} snippets.`);
                    } else {
                        vscode.window.showErrorMessage('Failed to refresh snippets. Check your connection.');
                    }
                } else {
                    try {
                        snippets = await this.retryFetchSnippets();
                        this.setCachedSnippets(snippets);
                    } catch (error: any) {
                        console.error('Error refreshing snippets:', error);
                    }
                }
                
                this.isRefreshing = false;
                resolve();
            }, 500);
        });
    }

    private async retryFetchSnippets(maxRetries: number = 3): Promise<Snippet[]> {
        if (!this.apiService) {
            throw new Error('API service not available');
        }

        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.apiService.fetchSnippets();
            } catch (error: any) {
                lastError = error;
                console.error(`Fetch attempt ${attempt} failed:`, error);
                
                if (attempt < maxRetries) {
                    // Exponential backoff: wait 1s, 2s, 4s
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError || new Error('Failed to fetch snippets after retries');
    }

    private handleInsertSnippet(): void {
        if (!this.authService.isAuthenticated()) {
            vscode.window.showErrorMessage('Please configure your API key first');
            return;
        }
        vscode.window.showInformationMessage(
            `Sneap: ${this.cachedSnippets.length} snippets available`
        );
    }


    private async handleTrackUsage(snippetId: number, language: string, startTime: number): Promise<void> {
        if (!this.authService.isAuthenticated() || !this.apiService) return;
        
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
        
    }

    private async handleConfigureApiKey(): Promise<void> {
        const apiKey = await this.authService.promptForApiKey();
        if (apiKey) {
            let isValid = false;
            
            // Test API key validity with progress notification
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Setting up Sneap...',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Verifying API key' });
                
                try {
                    // Create temporary API service to test the key
                    const userPrefix = apiKey.split('_')[0];
                    const testApiService = new ApiService(userPrefix, apiKey);
                    
                    // Try to fetch snippets to validate the key
                    await testApiService.fetchSnippets();
                    
                    // If successful, save the key
                    await this.authService.setApiKey(apiKey);
                    isValid = true;
                } catch (error: any) {
                    console.error('API key validation failed:', error);
                    isValid = false;
                }
                
                // Keep notification visible for a moment
                await new Promise(resolve => setTimeout(resolve, 500));
            });

            // Small delay between progress dismissal and next notification
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // After verification is complete, show result
            if (isValid) {
                // Show success notification (similar to "You are on the latest version!")
                vscode.window.showInformationMessage(
                    `You are successfully authenticated with Sneap!`
                );
                
                // Small delay before reload
                setTimeout(() => {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }, 1000);
            } else {
                // Show error notification with options (similar to GitHub error)
                const selection = await vscode.window.showErrorMessage(
                    'Error signing into Sneap',
                    'Try again',
                    'Cancel'
                );
                
                if (selection === 'Try again') {
                    vscode.commands.executeCommand('sneap.configureApiKey');
                }
            }
        }
    }

    private async handleResetApiKey(): Promise<void> {
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
        if (!this.authService.isAuthenticated() || !this.apiService) {
            vscode.window.showErrorMessage('Please configure your API key first');
            return;
        }

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

        const selectedText = editor.document.getText(selection);
        const fileExtension = editor.document.languageId;
        
        // Map language IDs to snippet scopes
        const scope = this.getSnippetScope(fileExtension);

        try {
            // Prompt for snippet details (name is optional and set to null)
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
            const sanitizedPrefix = prefix.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const snippet = {
                name: sanitizedPrefix,
                prefix: prefix.trim(),
                body: selectedText.split('\n'),
                description: description?.trim() || '',
                scope,
                category: category || 'general'
            };

            // Send to backend
            await this.apiService.createSnippet(snippet);
            
            // Refresh snippets to get updated list from server
            await this.handleRefreshSnippets(true);
            
            // Force VS Code to refresh completion provider to prevent cache issues
            await this.forceCompletionRefresh();
            
            // Show success message with progress notification for 2 seconds
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Snippet with prefix ${prefix} created successfully!`,
                cancellable: false
            }, async () => {
                // Keep the notification visible for 2 seconds
                await new Promise(resolve => setTimeout(resolve, 2000));
            });

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

    private async handledeleteSnippetByPrefix(): Promise<void> {
        if (!this.authService.isAuthenticated() || !this.apiService) {
            vscode.window.showErrorMessage('Please configure your API key first');
            return;
        }

        try {
            // Ask user for search term
            const searchTerm = await vscode.window.showInputBox({
                prompt: 'Enter snippet name or prefix to search',
                placeHolder: 'e.g., "console.log", "cl", "useState"',
                validateInput: (value) => value.trim() ? null : 'Search term is required'
            });

            if (!searchTerm) return;

            // Search for snippets matching the term
            const matchingSnippets = this.cachedSnippets.filter(snippet => 
                (snippet.name && snippet.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                snippet.prefix.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (matchingSnippets.length === 0) {
                vscode.window.showInformationMessage('No snippets found matching your search');
                return;
            }

            // If multiple matches, let user choose
            let selectedSnippet: Snippet;
            if (matchingSnippets.length === 1) {
                selectedSnippet = matchingSnippets[0];
            } else {
                const snippetOptions = matchingSnippets.map(snippet => ({
                    label: snippet.name || snippet.prefix,
                    description: `prefix: ${snippet.prefix}`,
                    detail: snippet.description,
                    snippet: snippet
                }));

                const selected = await vscode.window.showQuickPick(snippetOptions, {
                    placeHolder: `Found ${matchingSnippets.length} matching snippets. Select one to delete:`,
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (!selected) return;
                selectedSnippet = selected.snippet;
            }

            // Show confirmation with snippet details
            const confirmMessage = `Are you sure you want to delete ${selectedSnippet.prefix} snippet? `;

            const confirmation = await vscode.window.showWarningMessage(
                confirmMessage,
                { modal: true },
                'Yes'
            );

            if (confirmation !== 'Yes') return;

            // Delete the snippet
            if (selectedSnippet.id) {
                const success = await this.apiService.deleteSnippet(selectedSnippet.id);
                
                if (success) {
                    // Refresh snippets to get updated list from server
                    await this.handleRefreshSnippets(true);
                    
                    // Force VS Code to refresh completion provider to prevent cache issues
                    await this.forceCompletionRefresh();
                    
                    // Show success message with progress notification for 2 seconds
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Snippet ${selectedSnippet.name || selectedSnippet.prefix} deleted successfully!`,
                        cancellable: false
                    }, async () => {
                        // Keep the notification visible for 2 seconds
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    });
                } else {
                    vscode.window.showErrorMessage('Failed to delete snippet');
                }
            } else {
                vscode.window.showErrorMessage('Cannot delete snippet: missing ID');
            }

        } catch (error) {
            console.error('Error deleting snippet:', error);
            vscode.window.showErrorMessage('Failed to delete snippet');
        }
    }

}