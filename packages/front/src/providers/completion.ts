// Misc
import * as vscode       from 'vscode';
import { SearchService } from '../services/search';
import { Snippet }       from '../types/snippet';

export class SnippetCompletionProvider implements vscode.CompletionItemProvider {
    private searchService: SearchService;

    constructor(searchService: SearchService) {
        this.searchService = searchService;
    }

    async provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
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
        // completion.documentation = snippet.description || 'No description provided';
        completion.detail = snippet.description || 'No description provided';
        completion.sortText = `0_${snippet.prefix}`;
        
        // Add usage tracking on completion
        completion.command = {
            command: 'sneap.trackUsage',
            title: 'Track Usage',
            arguments: [snippet.id, languageId, Date.now()]
        };
        
        return completion;
    }
}