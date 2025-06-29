// Misc
import * as vscode                   from 'vscode';
import { SnippetCache }              from './cache';
import { CommandManager }            from './commands';
import { SnippetCompletionProvider } from './providers/completion';
import { ApiService }                from './services/api';
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

    // Initialize services
    const userService = new UserService();
    const userId = await userService.initialize(context);
    console.log(`User ID: ${userId.substring(0, 8)}...`);

    const apiService = new ApiService(userId);
    const snippetCache = new SnippetCache();
    await snippetCache.initialize(context);

    const searchService = new SearchService(snippetCache, apiService);
    const commandManager = new CommandManager(snippetCache, apiService, searchService);
    const completionProvider = new SnippetCompletionProvider(searchService);

    // Load initial snippets
    const cachedSnippets = await apiService.fetchSnippets();
    commandManager.setCachedSnippets(cachedSnippets);
    console.log(`Loaded ${cachedSnippets.length} snippets for user ${userId.substring(0, 8)}...`);

    // Register completion provider
    const provider = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
        completionProvider
    );

    // Register commands
    commandManager.registerCommands(context);
    const statusBarItem = createStatusBarItem();

    vscode.window.setStatusBarMessage('Yeap Snippets: Ready!', 3000);
    context.subscriptions.push(provider, statusBarItem);
}