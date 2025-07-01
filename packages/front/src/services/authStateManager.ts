// Misc
import * as vscode     from 'vscode';
import { AuthService } from './auth';

export class AuthStateManager {
    private static instance: AuthStateManager;
    private authService: AuthService;
    private context: vscode.ExtensionContext | null = null;
    private onAuthStateChanged: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();
    
    public readonly onAuthStateChange = this.onAuthStateChanged.event;

    private constructor(authService: AuthService) {
        this.authService = authService;
    }

    static getInstance(authService: AuthService): AuthStateManager {
        if (!AuthStateManager.instance) {
            AuthStateManager.instance = new AuthStateManager(authService);
        }
        return AuthStateManager.instance;
    }

    initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        this.updateCommandsAvailability();
    }

    async setAuthenticated(authenticated: boolean): Promise<void> {
        const wasAuthenticated = this.authService.isAuthenticated();
        
        if (wasAuthenticated !== authenticated) {
            this.updateCommandsAvailability();
            this.onAuthStateChanged.fire(authenticated);
        }
    }

    private updateCommandsAvailability(): void {
        if (!this.context) return;

        const isAuthenticated = this.authService.isAuthenticated();
        
        // Update command contexts
        vscode.commands.executeCommand('setContext', 'sneap.authenticated', isAuthenticated);
        
        // Commands that require authentication
        const authRequiredCommands = [
            'sneap.refreshSnippets',
            'sneap.showInfo',
            'sneap.trackUsage',
            'sneap.createSnippetFromSelection',
            'sneap.deleteSnippetByPrefix'
        ];

        // Update status bar visibility
        if (isAuthenticated) {
            vscode.window.setStatusBarMessage('Sneap: Authenticated', 2000);
        }
    }

    dispose(): void {
        this.onAuthStateChanged.dispose();
    }
}