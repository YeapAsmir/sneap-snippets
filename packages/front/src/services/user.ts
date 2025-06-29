// Misc
import * as vscode from 'vscode';

export class UserService {
    private userId: string = '';

    async initialize(context: vscode.ExtensionContext): Promise<string> {
        // User ID is derived from API key prefix, no need to generate
        // This method now only returns the stored user ID from API key
        this.userId = context.globalState.get('yeap-user-id') || '';
        return this.userId;
    }

    setUserId(userId: string): void {
        this.userId = userId;
    }

    getUserId(): string {
        return this.userId;
    }
}