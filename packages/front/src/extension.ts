import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Yeap Front Snippets is now active!');

    const provider = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                
                const snippetCompletion = new vscode.CompletionItem('yeap-component');
                snippetCompletion.insertText = new vscode.SnippetString(
                    'const ${1:ComponentName} = () => {\n\treturn (\n\t\t<div>\n\t\t\t${2:// Your component code here}\n\t\t</div>\n\t);\n};'
                );
                snippetCompletion.documentation = new vscode.MarkdownString('Creates a functional React component');

                const hookCompletion = new vscode.CompletionItem('yeap-hook');
                hookCompletion.insertText = new vscode.SnippetString(
                    'const use${1:HookName} = () => {\n\tconst [${2:state}, set${2/(.*)/${1:/capitalize}/}] = useState(${3:initialValue});\n\n\treturn { ${2:state}, set${2/(.*)/${1:/capitalize}/} };\n};'
                );
                hookCompletion.documentation = new vscode.MarkdownString('Creates a custom React hook');

                return [snippetCompletion, hookCompletion];
            }
        }
    );

    context.subscriptions.push(provider);

    let disposable = vscode.commands.registerCommand('yeap-front-snippets.insertSnippet', () => {
        vscode.window.showInformationMessage('Yeap Front Snippets: Use the snippets in your code!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}