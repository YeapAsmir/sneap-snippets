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
    
    if (!isAuthenticated) {
        vscode.window.showWarningMessage(
            'Yeap Snippets: API key required',
            'Configure now'
        ).then(selection => {
            if (selection === 'Configure now') {
                vscode.commands.executeCommand('yeap-front-snippets.configureApiKey');
            }
        });
        
        // Register minimal commands for configuration
        const configureCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.configureApiKey',
            async () => {
                const success = await authService.promptForApiKey();
                if (success) {
                    vscode.window.showInformationMessage('API key configured! Restarting VS Code...');
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            }
        );
        context.subscriptions.push(configureCommand);
        return;
    }

    // Initialize other services
    const userService = new UserService();
    const userId = await userService.initialize(context);
    console.log(`User ID: ${userId.substring(0, 8)}...`);
    console.log(`API Key: ${authService.getUserPrefix()}_***`);

    const apiService = new ApiService(userId, authService.getApiKey());
    const snippetCache = new SnippetCache();
    await snippetCache.initialize(context);

    const searchService = new SearchService(snippetCache, apiService);
    const commandManager = new CommandManager(snippetCache, apiService, searchService, authService);
    const completionProvider = new SnippetCompletionProvider(searchService);

    // Load initial snippets with error handling
    try {
        const cachedSnippets = await apiService.fetchSnippets();
        commandManager.setCachedSnippets(cachedSnippets);
        console.log(`Loaded ${cachedSnippets.length} snippets for ${authService.getUserPrefix()}`);
        
        // Register completion provider
        const provider = vscode.languages.registerCompletionItemProvider(
            ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
            completionProvider
        );

        // Register commands
        commandManager.registerCommands(context);
        
        // Register reset API key command
        const resetCommand = vscode.commands.registerCommand(
            'yeap-front-snippets.resetApiKey',
            async () => {
                const confirmation = await vscode.window.showWarningMessage(
                    'Are you sure you want to delete your API key?',
                    { modal: true },
                    'Yes, delete'
                );
                
                if (confirmation === 'Yes, delete') {
                    await authService.clearApiKey();
                    vscode.window.showInformationMessage('API key deleted. Restarting VS Code...');
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            }
        );
        
        const statusBarItem = createStatusBarItem();
        statusBarItem.text = `$(check) Yeap Snippets (${authService.getUserPrefix()})`;
        statusBarItem.tooltip = `Connected as ${authService.getUserPrefix()} - Click to refresh`;

        vscode.window.setStatusBarMessage(`Yeap Snippets: ${cachedSnippets.length} snippets loaded!`, 3000);
        context.subscriptions.push(provider, statusBarItem, resetCommand);
        
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
            
            // Register minimal functionality even if API fails
            const configureCommand = vscode.commands.registerCommand(
                'yeap-front-snippets.configureApiKey',
                async () => {
                    const success = await authService.promptForApiKey();
                    if (success) {
                        vscode.window.showInformationMessage('API key configured! Restarting VS Code...');
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
            );
            
            const resetCommand = vscode.commands.registerCommand(
                'yeap-front-snippets.resetApiKey',
                async () => {
                    const confirmation = await vscode.window.showWarningMessage(
                        'Are you sure you want to delete your API key?',
                        { modal: true },
                        'Yes, delete'
                    );
                    
                    if (confirmation === 'Yes, delete') {
                        await authService.clearApiKey();
                        vscode.window.showInformationMessage('API key deleted. Restarting VS Code...');
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
            );
            
            context.subscriptions.push(configureCommand, resetCommand);
        }
    }
}

export function deactivate() {
    // Cleanup if needed
}