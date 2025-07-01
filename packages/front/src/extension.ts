// Misc
import * as vscode                   from 'vscode';
import { CommandManager }            from './commands';
import { SnippetCompletionProvider } from './providers/completion';
import { ApiService }                from './services/api';
import { AuthService }               from './services/auth';
import { SearchService }             from './services/search';
import { AuthStateManager }          from './services/authStateManager';

// Global variables to manage completion provider re-registration
let completionProvider: SnippetCompletionProvider | null = null;
let completionProviderDisposable: vscode.Disposable | null = null;

function createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'sneap.refreshSnippets';
    statusBarItem.text = '$(sync) Sneap';
    statusBarItem.tooltip = 'Click to refresh snippets from server';
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
        
        const statusBarItem = createStatusBarItem();
        statusBarItem.text = `$(check) Sneap (${authService.getUserPrefix()})`;
        statusBarItem.tooltip = `Connected as ${authService.getUserPrefix()} - Click to refresh`;

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
            vscode.window.showWarningMessage('Unable to load snippets. Check your connection.');
        }
    }
}

export function deactivate() {
    // Cleanup if needed
}