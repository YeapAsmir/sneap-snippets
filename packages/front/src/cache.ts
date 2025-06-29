import * as vscode from 'vscode';

interface CachedSnippet {
    snippet: any;
    timestamp: number;
    accessCount: number;
}

interface StoredCache {
    [key: string]: {
        data: CachedSnippet[];
        language?: string;
        timestamp: number;
    };
}

export class SnippetCache {
    private memoryCache: Map<string, CachedSnippet[]> = new Map();
    private context: vscode.ExtensionContext | null = null;
    private readonly STORAGE_KEY = 'yeapSnippetsCache';
    private readonly MEMORY_LIMIT = 100;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly STORAGE_LIMIT = 5000;

    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        console.log('VS Code storage cache initialized');
        
        // Load frequently used snippets into memory
        await this.loadHotSnippets();
    }

    async get(key: string, language?: string): Promise<any[] | null> {
        // Level 1: Check memory cache
        const memoryResult = this.getFromMemory(key);
        if (memoryResult && this.isValid(memoryResult[0])) {
            this.updateAccessCount(key);
            return memoryResult.map(r => r.snippet);
        }

        // Level 2: Check VS Code global storage
        if (this.context) {
            const storageResult = await this.getFromStorage(key);
            if (storageResult && this.isValid(storageResult[0])) {
                // Promote to memory cache
                this.setInMemory(key, storageResult);
                this.updateAccessCount(key);
                return storageResult.map(r => r.snippet);
            }
        }

        return null;
    }

    async set(key: string, snippets: any[], language?: string): Promise<void> {
        const cached: CachedSnippet[] = snippets.map(snippet => ({
            snippet,
            timestamp: Date.now(),
            accessCount: 1
        }));

        // Always set in memory (with LRU eviction)
        this.setInMemory(key, cached);

        // Asynchronously persist to VS Code storage
        if (this.context) {
            this.setInStorage(key, cached, language).catch(console.error);
        }
    }

    private getFromMemory(key: string): CachedSnippet[] | null {
        return this.memoryCache.get(key) || null;
    }

    private setInMemory(key: string, cached: CachedSnippet[]): void {
        // LRU eviction if memory limit reached
        if (this.memoryCache.size >= this.MEMORY_LIMIT) {
            const leastUsed = this.findLeastRecentlyUsed();
            if (leastUsed) {
                this.memoryCache.delete(leastUsed);
            }
        }

        this.memoryCache.set(key, cached);
    }

    private async getFromStorage(key: string): Promise<CachedSnippet[] | null> {
        if (!this.context) return null;

        const allCache = this.context.globalState.get<StoredCache>(this.STORAGE_KEY, {});
        const entry = allCache[key];
        
        if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
            return entry.data;
        }
        
        return null;
    }

    private async setInStorage(key: string, cached: CachedSnippet[], language?: string): Promise<void> {
        if (!this.context) return;

        const allCache = this.context.globalState.get<StoredCache>(this.STORAGE_KEY, {});
        
        // Check storage limit
        const keys = Object.keys(allCache);
        if (keys.length >= this.STORAGE_LIMIT) {
            // Remove oldest entry
            let oldestKey = '';
            let oldestTime = Date.now();
            
            for (const k of keys) {
                if (allCache[k].timestamp < oldestTime) {
                    oldestTime = allCache[k].timestamp;
                    oldestKey = k;
                }
            }
            
            if (oldestKey) {
                delete allCache[oldestKey];
            }
        }

        allCache[key] = {
            data: cached,
            language,
            timestamp: Date.now()
        };

        await this.context.globalState.update(this.STORAGE_KEY, allCache);
    }

    private async loadHotSnippets(): Promise<void> {
        if (!this.context) return;

        const allCache = this.context.globalState.get<StoredCache>(this.STORAGE_KEY, {});
        
        // Sort by access count and load top entries into memory
        const entries = Object.entries(allCache)
            .map(([key, value]) => ({
                key,
                avgAccessCount: value.data.reduce((sum, v) => sum + v.accessCount, 0) / value.data.length,
                data: value.data
            }))
            .sort((a, b) => b.avgAccessCount - a.avgAccessCount)
            .slice(0, this.MEMORY_LIMIT / 2);

        entries.forEach(entry => {
            this.memoryCache.set(entry.key, entry.data);
        });
    }

    private isValid(cached: CachedSnippet): boolean {
        return Date.now() - cached.timestamp < this.CACHE_TTL;
    }

    private findLeastRecentlyUsed(): string | null {
        let leastUsedKey: string | null = null;
        let minAccessCount = Infinity;

        this.memoryCache.forEach((value, key) => {
            const avgAccessCount = value.reduce((sum, v) => sum + v.accessCount, 0) / value.length;
            if (avgAccessCount < minAccessCount) {
                minAccessCount = avgAccessCount;
                leastUsedKey = key;
            }
        });

        return leastUsedKey;
    }

    private async updateAccessCount(key: string): Promise<void> {
        // Update in memory
        const cached = this.memoryCache.get(key);
        if (cached) {
            cached.forEach(c => c.accessCount++);
        }

        // Update in storage asynchronously
        if (this.context) {
            this.updateStorageAccessCount(key).catch(console.error);
        }
    }

    private async updateStorageAccessCount(key: string): Promise<void> {
        if (!this.context) return;

        const allCache = this.context.globalState.get<StoredCache>(this.STORAGE_KEY, {});
        if (allCache[key]) {
            allCache[key].data.forEach(c => c.accessCount++);
            await this.context.globalState.update(this.STORAGE_KEY, allCache);
        }
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();

        if (this.context) {
            await this.context.globalState.update(this.STORAGE_KEY, {});
        }
    }

    getStats(): { memorySize: number; storageConnected: boolean } {
        return {
            memorySize: this.memoryCache.size,
            storageConnected: this.context !== null
        };
    }
}