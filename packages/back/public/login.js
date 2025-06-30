/**
 * Login Alpine.js Component
 * Handles authentication with JWT tokens
 */

function loginComponent() {
    return {
        // Form data
        username: '',
        password: '',
        rememberMe: false,
        
        // UI state
        loading: false,
        error: '',
        showPassword: false,
        
        // Initialize
        init() {
            // Check if already authenticated
            const token = localStorage.getItem('adminToken');
            if (token) {
                // Verify token is still valid by making a test request
                this.verifyAndRedirect(token);
            }
            
            // Auto-focus username field
            this.$nextTick(() => {
                this.$refs.usernameInput?.focus();
            });
        },
        
        // Verify token and redirect if valid
        async verifyAndRedirect(token) {
            // Skip verification to avoid redirect loop
            // The /admin route will handle the actual auth check
            return;
        },
        
        // Toggle password visibility
        togglePassword() {
            this.showPassword = !this.showPassword;
        },
        
        // Handle form submission
        async handleSubmit() {
            this.error = '';
            this.loading = true;
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: this.username,
                        password: this.password,
                        rememberMe: this.rememberMe
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Store tokens
                    localStorage.setItem('adminToken', data.token);
                    if (data.refreshToken && this.rememberMe) {
                        localStorage.setItem('adminRefreshToken', data.refreshToken);
                    }
                    
                    // Redirect to admin panel
                    window.location.href = '/admin';
                } else {
                    this.error = data.error || 'Invalid credentials';
                }
            } catch (error) {
                this.error = 'Connection error. Please try again.';
            } finally {
                this.loading = false;
            }
        },
        
        // Handle enter key on form inputs
        handleKeydown(event) {
            if (event.key === 'Enter') {
                this.handleSubmit();
            }
        }
    };
}