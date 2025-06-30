// Misc
import * as vscode from 'vscode';

export class AuthService {
    private apiKey: string = '';
    private context: vscode.ExtensionContext | null = null;

    async initialize(context: vscode.ExtensionContext): Promise<boolean> {
        this.context = context;
        this.apiKey = context.globalState.get('sneap-api-key') || '';
        
        // Just return whether we have a key, don't auto-prompt
        return this.apiKey.length > 0;
    }

    async promptForApiKey(): Promise<string | undefined> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Sneap API key',
            placeHolder: 'ex: sneap_123456789',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API key cannot be empty';
                }
                if (value.length < 10) {
                    return 'API key must contain at least 10 characters';
                }
                if (!value.includes('_')) {
                    return 'Invalid key format (must contain an underscore)';
                }
                // Check prefix_key format
                const parts = value.split('_');
                if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 8) {
                    return 'Invalid key format (expected: username_key)';
                }
                return null;
            }
        });

        return apiKey?.trim();
    }

    async setApiKey(apiKey: string): Promise<void> {
        this.apiKey = apiKey;
        if (this.context) {
            await this.context.globalState.update('sneap-api-key', apiKey);
        }
    }

    getApiKey(): string {
        return this.apiKey;
    }

    async clearApiKey(): Promise<void> {
        this.apiKey = '';
        if (this.context) {
            await this.context.globalState.update('sneap-api-key', undefined);
        }
    }

    isAuthenticated(): boolean {
        return this.apiKey.length > 0;
    }

    getUserPrefix(): string {
        if (!this.apiKey.includes('_')) return '';
        return this.apiKey.split('_')[0];
    }
}