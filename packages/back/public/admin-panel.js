/**
 * Admin Panel Alpine.js Logic
 * Manages API keys creation, deletion, and UI state
 */

function adminPanel() {
    return {
        // UI State
        showCreateModal: false,
        showDeleteModal: false,
        loading: false,
        
        // Data
        keys: [],
        stats: {
            totalKeys: 0,
            activeKeys: 0,
            totalUsage: 0
        },
        snippetStats: {
            total: 0,
            categories: 0,
            avgUsage: 0
        },
        usageStats: {
            totalUsage: 0,
            uniqueUsers: 0,
            avgSearchTime: 0,
            successRate: 0
        },
        categoryStats: [],
        
        // Forms
        newKey: {
            userName: ''
        },
        keyToDelete: null,
        
        // Notification
        notification: {
            show: false,
            message: '',
            type: 'success'
        },

        // Lifecycle
        async init() {
            console.log('Initializing admin panel...');
            
            // Check for token and redirect to login if not found
            const token = localStorage.getItem('adminToken');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            
            // Try to load data - if 401, redirect to login
            try {
                await this.loadKeys();
                await this.loadSnippetStats();
            } catch (error) {
                console.error('Failed to initialize:', error);
                window.location.href = '/login';
            }
        },
        
        getAuthHeaders() {
            const token = localStorage.getItem('adminToken');
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        },

        // Modal Management
        openCreateModal() {
            this.showCreateModal = true;
            this.resetCreateForm();
        },

        closeCreateModal() {
            this.showCreateModal = false;
            this.resetCreateForm();
        },

        openDeleteModal(key) {
            this.keyToDelete = key;
            this.showDeleteModal = true;
        },

        closeDeleteModal() {
            this.showDeleteModal = false;
            this.keyToDelete = null;
        },

        resetCreateForm() {
            this.newKey = { userName: '' };
        },

        // API Operations
        async loadKeys() {
            this.loading = true;
            try {
                const response = await fetch('/admin/api-keys', {
                    headers: this.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.keys = data.data;
                    this.updateStats();
                } else {
                    this.showNotification('Error loading keys', 'error');
                }
            } catch (error) {
                this.showNotification('Connection error', 'error');
            } finally {
                this.loading = false;
            }
        },

        async createKey() {
            if (!this.newKey.userName.trim()) {
                this.showNotification('Username is required', 'error');
                return;
            }

            this.loading = true;
            const formData = {
                userName: this.newKey.userName.trim(),
                prefix: this.newKey.userName.trim()
            };

            try {
                const response = await fetch('/admin/api-keys', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
                
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    this.showNotification(`Key created: ${data.data.keyId}`);
                    this.closeCreateModal();
                    await this.loadKeys();
                } else {
                    this.showNotification(data.error || 'Error creating key', 'error');
                }
            } catch (error) {
                this.showNotification('Connection error', 'error');
            } finally {
                this.loading = false;
            }
        },

        async toggleKey(keyId, isActive) {
            this.loading = true;
            try {
                const response = await fetch(`/admin/api-keys/${keyId}`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ isActive })
                });
                
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    this.showNotification(`Key ${isActive ? 'activated' : 'deactivated'}`);
                    await this.loadKeys();
                } else {
                    this.showNotification('Error updating key', 'error');
                }
            } catch (error) {
                this.showNotification('Connection error', 'error');
            } finally {
                this.loading = false;
            }
        },

        async deleteKey() {
            if (!this.keyToDelete) return;

            this.loading = true;
            try {
                const response = await fetch(`/admin/api-keys/${this.keyToDelete.keyId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    this.showNotification('Key deleted');
                    this.closeDeleteModal();
                    await this.loadKeys();
                } else {
                    this.showNotification('Error deleting key', 'error');
                }
            } catch (error) {
                this.showNotification('Connection error', 'error');
            } finally {
                this.loading = false;
            }
        },

        async loadSnippetStats() {
            this.loading = true;
            try {
                const response = await fetch('/admin/stats', {
                    headers: this.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.snippetStats = data.data.snippets;
                    this.usageStats = data.data.usage;
                    this.categoryStats = data.data.categories;
                } else {
                    this.showNotification('Error loading snippet statistics', 'error');
                }
            } catch (error) {
                console.error('Error loading snippet stats:', error);
                this.showNotification('Connection error while loading stats', 'error');
            } finally {
                this.loading = false;
            }
        },

        // Utilities
        updateStats() {
            this.stats.totalKeys = this.keys.length;
            this.stats.activeKeys = this.keys.filter(k => k.isActive).length;
            this.stats.totalUsage = this.keys.reduce((sum, k) => sum + (k.usageCount || 0), 0);
        },

        showNotification(message, type = 'success') {
            this.notification = {
                show: true,
                message,
                type
            };

            setTimeout(() => {
                this.notification.show = false;
            }, 5000);
        },


        // Validation
        isValidUsername(username) {
            return /^[a-zA-Z0-9_-]+$/.test(username) && username.length >= 2;
        },

        // Logout
        logout() {
            // Remove tokens from localStorage
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRefreshToken');
            
            // Redirect to login page
            window.location.href = '/login';
        }
    }
}