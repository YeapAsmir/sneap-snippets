// Misc
import * as vscode                   from 'vscode';
import { SnippetCache }              from './cache';
import { CommandManager }            from './commands';
import { SnippetCompletionProvider } from './providers/completion';
import { ApiService }                from './services/api';
import { AuthService }               from './services/auth';
import { SearchService }             from './services/search';
import { UserService }               from './services/user';

function createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'yeap-front-snippets.refreshSnippets';
    statusBarItem.text = '$(sync) Yeap Snippets';
    statusBarItem.tooltip = 'Click to refresh snippets from server';
    statusBarItem.show();
    return statusBarItem;
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Yeap Front Snippets is now active!');

    // Initialize authentication first
    const authService = new AuthService();
    const isAuthenticated = await authService.initialize(context);

    // Initialize basic services
    const userService = new UserService();
    const snippetCache = new SnippetCache();
    await snippetCache.initialize(context);

    // Always create CommandManager and register commands first
    let commandManager: CommandManager;
    let apiService: ApiService | null = null;
    let searchService: SearchService | null = null;
    
    if (isAuthenticated) {
        const userPrefix = authService.getUserPrefix();
        userService.setUserId(userPrefix);
        const userId = userService.getUserId();
        console.log(`User ID: ${userId}`);
        console.log(`API Key: ${userPrefix}_***`);

        apiService = new ApiService(userId, authService.getApiKey());
        searchService = new SearchService(snippetCache, apiService);
    }
    
    commandManager = new CommandManager(snippetCache, apiService, searchService, authService);
    commandManager.registerCommands(context);

    if (!isAuthenticated) {
        vscode.window.showWarningMessage(
            'Yeap Snippets: API key required',
            'Configure now'
        ).then(selection => {
            if (selection === 'Configure now') {
                vscode.commands.executeCommand('yeap-front-snippets.configureApiKey');
            }
        });
        
        return;
    }

    const completionProvider = new SnippetCompletionProvider(searchService!);

    // Load initial snippets with error handling
    try {
        const cachedSnippets = await apiService!.fetchSnippets();
        commandManager.setCachedSnippets(cachedSnippets);
        console.log(`Loaded ${cachedSnippets.length} snippets for ${authService.getUserPrefix()}`);
        
        // Register completion provider
        const provider = vscode.languages.registerCompletionItemProvider(
            ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
            completionProvider
        );

        // Commands already registered during CommandManager creation
        
        const statusBarItem = createStatusBarItem();
        statusBarItem.text = `$(check) Yeap Snippets (${authService.getUserPrefix()})`;
        statusBarItem.tooltip = `Connected as ${authService.getUserPrefix()} - Click to refresh`;

        vscode.window.setStatusBarMessage(`Yeap Snippets: ${cachedSnippets.length} snippets loaded!`, 3000);
        context.subscriptions.push(provider, statusBarItem);
        
    } catch (error: any) {
        console.error('Error loading snippets:', error);
        
        if (error.message === 'Invalid API key') {
            vscode.window.showErrorMessage(
                'Invalid, expired or disabled API key',
                'Reconfigure'
            ).then(selection => {
                if (selection === 'Reconfigure') {
                    vscode.commands.executeCommand('yeap-front-snippets.configureApiKey');
                }
            });
            return;
        } else {
            vscode.window.showWarningMessage('Unable to load snippets. Check your connection.');
            
            // Commands are already registered at the beginning
        }
    }
}

export function deactivate() {
    // Cleanup if needed
}