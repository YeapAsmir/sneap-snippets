// Misc
import * as vscode                   from 'vscode';
import { CommandManager }            from './commands';
import { SnippetCompletionProvider } from './providers/completion';
import { ApiService }                from './services/api';
import { AuthService }               from './services/auth';
import { AuthStateManager }          from './services/authStateManager';
import { SearchService }             from './services/search';

// Global variables to manage completion provider re-registration
let completionProvider: SnippetCompletionProvider | null = null;
let completionProviderDisposable: vscode.Disposable | null = null;

function createStatusBarItem(isAuthenticated: boolean, userPrefix?: string): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    
    if (!isAuthenticated) {
        statusBarItem.text = '$(warning) Sneap';
        statusBarItem.tooltip = 'Sneap wait for auth';
        statusBarItem.command = 'sneap.configureApiKey';
    } else {
        statusBarItem.text = `$(check) Sneap (${userPrefix || 'user'})`;
        statusBarItem.tooltip = `Connected as ${userPrefix || 'user'} - Click to refresh`;
        statusBarItem.command = 'sneap.refreshSnippets';
    }
    
    statusBarItem.show();
    return statusBarItem;
}

export function reregisterCompletionProvider(searchService: SearchService, context: vscode.ExtensionContext): void {
    // Dispose existing provider
    if (completionProviderDisposable) {
        completionProviderDisposable.dispose();
        // Remove from subscriptions
        const index = context.subscriptions.indexOf(completionProviderDisposable);
        if (index > -1) {
            context.subscriptions.splice(index, 1);
        }
    }
    
    // Create new provider instance
    completionProvider = new SnippetCompletionProvider(searchService);
    
    // Register new provider
    completionProviderDisposable = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
        completionProvider
    );
    
    // Add to context subscriptions
    context.subscriptions.push(completionProviderDisposable);
}

export async function activate(context: vscode.ExtensionContext) {

    // Initialize authentication first
    const authService = new AuthService();
    const isAuthenticated = await authService.initialize(context);

    // Initialize authentication state manager
    const authStateManager = AuthStateManager.getInstance(authService);
    authStateManager.initialize(context);

    // Initialize services

    // Always create CommandManager and register commands first
    let commandManager: CommandManager;
    let apiService: ApiService | null = null;
    let searchService: SearchService | null = null;
    
    if (isAuthenticated) {
        apiService = new ApiService(authService.getUserPrefix(), authService.getApiKey());
        searchService = new SearchService(apiService);
    }
    
    commandManager = new CommandManager(apiService, searchService, authService);
    commandManager.registerCommands(context);

    if (!isAuthenticated) {
        const statusBarItem = createStatusBarItem(false);
        context.subscriptions.push(statusBarItem);
        
        vscode.window.showWarningMessage(
            'Sneap: API key required',
            'Configure now'
        ).then(selection => {
            if (selection === 'Configure now') {
                vscode.commands.executeCommand('sneap.configureApiKey');
            }
        });
        
        return;
    }

    // Load initial snippets with error handling
    try {
        const cachedSnippets = await apiService!.fetchSnippets();
        commandManager.setCachedSnippets(cachedSnippets);
        
        // Register completion provider using the reusable function
        reregisterCompletionProvider(searchService!, context);
        
        const statusBarItem = createStatusBarItem(true, authService.getUserPrefix());

        vscode.window.setStatusBarMessage(`Sneap: ${cachedSnippets.length} snippets loaded!`, 3000);
        context.subscriptions.push(statusBarItem);
        
    } catch (error: any) {
        console.error('Error loading snippets:', error);
        
        if (error.message === 'Invalid API key') {
            vscode.window.showErrorMessage(
                'Invalid, expired or disabled API key',
                'Reconfigure'
            ).then(selection => {
                if (selection === 'Reconfigure') {
                    vscode.commands.executeCommand('sneap.configureApiKey');
                }
            });
            return;
        } else {
            const statusBarItem = createStatusBarItem(true, authService.getUserPrefix());
            statusBarItem.text = '$(warning) Sneap (connection error)';
            statusBarItem.tooltip = 'Unable to load snippets - Click to retry';
            context.subscriptions.push(statusBarItem);
            
            vscode.window.showWarningMessage('Unable to load snippets. Check your connection.');
        }
    }
}

export function deactivate() {
    // Cleanup if needed
}