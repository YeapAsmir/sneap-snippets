import * as vscode from 'vscode';

export class UserService {
    private userId: string = '';

    async initialize(context: vscode.ExtensionContext): Promise<string> {
        // Generate or retrieve user ID for analytics
        this.userId = context.globalState.get('yeap-user-id') || this.generateUserId();
        if (!context.globalState.get('yeap-user-id')) {
            await context.globalState.update('yeap-user-id', this.userId);
        }
        return this.userId;
    }

    getUserId(): string {
        return this.userId;
    }

    private generateUserId(): string {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }
}