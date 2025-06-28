import * as vscode from 'vscode';

interface Snippet {
    name: string;
    prefix: string;
    body: string[];
    description: string;
    scope?: string[];
}

let cachedSnippets: Snippet[] = [];

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

export function activate(context: vscode.ExtensionContext) {
    console.log('Yeap Front Snippets is now active!');

    fetchSnippets().then(snippets => {
        cachedSnippets = snippets;
        console.log(`Loaded ${snippets.length} snippets from server`);
    });

    const refreshCommand = vscode.commands.registerCommand('yeap-front-snippets.refreshSnippets', async () => {
        const snippets = await fetchSnippets();
        cachedSnippets = snippets;
        vscode.window.showInformationMessage(`Refreshed! Loaded ${snippets.length} snippets.`);
    });

    const provider = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                const completions: vscode.CompletionItem[] = [];
                
                const languageId = document.languageId;

                cachedSnippets.forEach(snippet => {
                    if (!snippet.scope || snippet.scope.includes(languageId)) {
                        const completion = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
                        completion.insertText = new vscode.SnippetString(snippet.body.join('\n'));
                        completion.documentation = new vscode.MarkdownString(`**${snippet.name}**\n\n${snippet.description}`);
                        completion.detail = snippet.name;
                        completions.push(completion);
                    }
                });

                const staticSnippets = [
                    {
                        prefix: 'yeap-component',
                        body: 'const ${1:ComponentName} = () => {\n\treturn (\n\t\t<div>\n\t\t\t${2:// Your component code here}\n\t\t</div>\n\t);\n};',
                        name: 'React Component',
                        description: 'Creates a functional React component'
                    },
                    {
                        prefix: 'yeap-hook',
                        body: 'const use${1:HookName} = () => {\n\tconst [${2:state}, set${2/(.*)/${1:/capitalize}/}] = useState(${3:initialValue});\n\n\treturn { ${2:state}, set${2/(.*)/${1:/capitalize}/} };\n};',
                        name: 'Custom Hook',
                        description: 'Creates a custom React hook'
                    }
                ];

                staticSnippets.forEach(snippet => {
                    const completion = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
                    completion.insertText = new vscode.SnippetString(snippet.body);
                    completion.documentation = new vscode.MarkdownString(`**${snippet.name}**\n\n${snippet.description}`);
                    completion.detail = snippet.name;
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
        vscode.window.showInformationMessage(`Yeap Snippets: ${cachedSnippets.length} snippets available!`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}