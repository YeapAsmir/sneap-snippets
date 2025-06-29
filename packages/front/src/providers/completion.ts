import * as vscode from 'vscode';
import { Snippet } from '../types/snippet';
import { SearchService } from '../services/search';

export class SnippetCompletionProvider implements vscode.CompletionItemProvider {
    private searchService: SearchService;

    constructor(searchService: SearchService) {
        this.searchService = searchService;
    }

    async provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const languageId = document.languageId;
        
        // Extract current word being typed for prefix matching
        const wordRange = document.getWordRangeAtPosition(position);
        const currentWord = wordRange ? document.getText(wordRange) : '';
        
        // Search snippets based on current context
        const searchResults = await this.searchService.searchSnippets(currentWord, languageId, currentWord);
        
        const completions: vscode.CompletionItem[] = [];

        // Add all snippets from server with usage tracking
        searchResults.forEach(snippet => {
            const completion = this.createCompletionItem(snippet, languageId);
            completions.push(completion);
        });

        return completions;
    }

    private createCompletionItem(snippet: Snippet, languageId: string): vscode.CompletionItem {
        const completion = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
        completion.insertText = new vscode.SnippetString(snippet.body.join('\n'));
        completion.documentation = new vscode.MarkdownString(`**${snippet.name}**\n\n${snippet.description}`);
        completion.detail = snippet.name;
        completion.sortText = `0_${snippet.prefix}`;
        
        // Add usage tracking on completion
        completion.command = {
            command: 'sneap-front-snippets.trackUsage',
            title: 'Track Usage',
            arguments: [snippet.id, languageId, Date.now()]
        };
        
        return completion;
    }
}