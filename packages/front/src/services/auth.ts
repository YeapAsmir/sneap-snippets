import * as vscode from 'vscode';

export class AuthService {
    private apiKey: string = '';
    private context: vscode.ExtensionContext | null = null;

    async initialize(context: vscode.ExtensionContext): Promise<boolean> {
        this.context = context;
        this.apiKey = context.globalState.get('yeap-api-key') || '';
        
        if (!this.apiKey) {
            return await this.promptForApiKey();
        }
        
        return true;
    }

    async promptForApiKey(): Promise<boolean> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Entrez votre clé API Yeap Snippets',
            placeHolder: 'ex: asmr_mchz54hj1fx0u3nwab',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'La clé API ne peut pas être vide';
                }
                if (value.length < 10) {
                    return 'La clé API doit contenir au moins 10 caractères';
                }
                if (!value.includes('_')) {
                    return 'Format de clé invalide (doit contenir un underscore)';
                }
                // Vérifier le format prefix_key
                const parts = value.split('_');
                if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 8) {
                    return 'Format de clé invalide (attendu: nom_utilisateur_clé)';
                }
                return null;
            }
        });

        if (apiKey && apiKey.trim()) {
            await this.setApiKey(apiKey.trim());
            return true;
        }

        return false;
    }

    async setApiKey(apiKey: string): Promise<void> {
        this.apiKey = apiKey;
        if (this.context) {
            await this.context.globalState.update('yeap-api-key', apiKey);
        }
    }

    getApiKey(): string {
        return this.apiKey;
    }

    async clearApiKey(): Promise<void> {
        this.apiKey = '';
        if (this.context) {
            await this.context.globalState.update('yeap-api-key', undefined);
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