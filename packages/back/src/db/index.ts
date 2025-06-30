import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { eq, desc, like, count, sql, and, or } from 'drizzle-orm';
import { snippets, usageMetrics, apiKeys } from './schema';
import type { Snippet, NewSnippet, UsageMetric, NewUsageMetric, ApiKey, NewApiKey } from './schema';

export class DrizzleDatabase {
  private db: ReturnType<typeof drizzle>;
  private sqlite: Database.Database;

  // Helper methods to reduce code duplication
  transformSnippetForClient(snippet: Snippet): any {
    return {
      ...snippet,
      body: JSON.parse(snippet.body),
      scope: snippet.scope ? JSON.parse(snippet.scope) : undefined
    };
  }

  transformSnippetsForClient(snippets: Snippet[]): any[] {
    return snippets.map(s => this.transformSnippetForClient(s));
  }

  prepareSnippetForStorage(snippetData: any): any {
    const prepared = { ...snippetData };
    if (prepared.body) prepared.body = JSON.stringify(prepared.body);
    if (prepared.scope) prepared.scope = JSON.stringify(prepared.scope);
    return prepared;
  }

  constructor(dbPath: string = './snippets.db') {
    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite);
  }

  async initialize(): Promise<void> {
    console.log('🔄 Initializing Drizzle database...');
    
    // Enable foreign keys
    this.sqlite.pragma('foreign_keys = ON');
    
    // Run migrations to create tables
    console.log('📄 Running database migrations...');
    migrate(this.db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations complete');
    
    await this.ensureSystemApiKey();
    await this.seedInitialData();
    
    const count = await this.getSnippetCount();
    console.log(`📚 Found ${count} snippets in Drizzle database`);
  }

  // CRUD Operations
  async createSnippet(snippet: NewSnippet): Promise<Snippet> {
    const [created] = await this.db.insert(snippets).values(snippet).returning();
    return created;
  }

  async getSnippetById(id: number): Promise<Snippet | null> {
    const [snippet] = await this.db.select().from(snippets).where(eq(snippets.id, id));
    return snippet || null;
  }

  async getSnippetWithCreator(id: number): Promise<any | null> {
    const [result] = await this.db
      .select({
        snippet: snippets,
        creator: {
          keyId: apiKeys.keyId,
          userName: apiKeys.userName,
          prefix: apiKeys.prefix
        }
      })
      .from(snippets)
      .leftJoin(apiKeys, eq(snippets.createdBy, apiKeys.keyId))
      .where(eq(snippets.id, id));

    if (!result) return null;

    return {
      ...this.transformSnippetForClient(result.snippet),
      creator: result.creator
    };
  }

  async updateSnippet(id: number, updates: Partial<NewSnippet>): Promise<Snippet | null> {
    const [updated] = await this.db.update(snippets).set(updates).where(eq(snippets.id, id)).returning();
    return updated || null;
  }

  async deleteSnippet(id: number): Promise<boolean> {
    const result = await this.db.delete(snippets).where(eq(snippets.id, id));
    return result.changes > 0;
  }

  // Search Operations
  async searchSnippets(query: string = '', language?: string, limit: number = 20): Promise<Snippet[]> {
    const conditions = [];
    
    if (query.trim()) {
      conditions.push(
        or(
          like(snippets.prefix, `%${query}%`),
          like(snippets.name, `%${query}%`),
          like(snippets.description, `%${query}%`)
        )
      );
    }

    if (language) {
      conditions.push(
        or(
          sql`${snippets.scope} IS NULL`,
          like(snippets.scope, `%"${language}"%`)
        )
      );
    }

    const queryBuilder = this.db.select().from(snippets);
    
    if (conditions.length > 0) {
      return await queryBuilder
        .where(and(...conditions))
        .orderBy(desc(snippets.usageCount), snippets.prefix)
        .limit(limit);
    }

    return await queryBuilder
      .orderBy(desc(snippets.usageCount), snippets.prefix)
      .limit(limit);
  }

  async getPopularSnippets(limit: number = 50, language?: string): Promise<Snippet[]> {
    const queryBuilder = this.db.select().from(snippets);

    if (language) {
      return await queryBuilder
        .where(
          or(
            sql`${snippets.scope} IS NULL`,
            like(snippets.scope, `%"${language}"%`)
          )
        )
        .orderBy(desc(snippets.usageCount), desc(snippets.lastUsed))
        .limit(limit);
    }

    return await queryBuilder
      .orderBy(desc(snippets.usageCount), desc(snippets.lastUsed))
      .limit(limit);
  }

  async getPersonalizedSnippets(userId: string, language?: string, limit: number = 20): Promise<Snippet[]> {
    // Get user's most used snippets with fallback to popular ones
    const baseQuery = this.db
      .select()
      .from(snippets)
      .leftJoin(usageMetrics, and(
        eq(snippets.id, usageMetrics.snippetId),
        eq(usageMetrics.userId, userId)
      ));

    if (language) {
      const userSnippets = await baseQuery
        .where(
          or(
            sql`${snippets.scope} IS NULL`,
            like(snippets.scope, `%"${language}"%`)
          )
        )
        .groupBy(snippets.id)
        .orderBy(desc(count(usageMetrics.id)), desc(snippets.usageCount))
        .limit(limit);

      return userSnippets.map(row => row.snippets);
    }

    const userSnippets = await baseQuery
      .groupBy(snippets.id)
      .orderBy(desc(count(usageMetrics.id)), desc(snippets.usageCount))
      .limit(limit);

    return userSnippets.map(row => row.snippets);
  }

  // Usage Tracking
  async recordUsage(metric: NewUsageMetric): Promise<void> {
    await this.db.insert(usageMetrics).values({
      ...metric,
      timestamp: sql`(unixepoch())`
    });

    // Update snippet usage count if accepted
    if (metric.wasAccepted) {
      await this.db.update(snippets)
        .set({
          usageCount: sql`${snippets.usageCount} + 1`,
          lastUsed: sql`(unixepoch())`
        })
        .where(eq(snippets.id, metric.snippetId));
    }
  }

  // Analytics
  async getUserStats(userId: string): Promise<any> {
    const totalUsage = await this.db
      .select({ count: count() })
      .from(usageMetrics)
      .where(eq(usageMetrics.userId, userId));

    const favoriteLanguages = await this.db
      .select({
        language: usageMetrics.language,
        count: count()
      })
      .from(usageMetrics)
      .where(eq(usageMetrics.userId, userId))
      .groupBy(usageMetrics.language)
      .orderBy(desc(count()))
      .limit(5);

    const avgPerformance = await this.db
      .select({
        avgSearchTime: sql<number>`AVG(${usageMetrics.searchTime})`
      })
      .from(usageMetrics)
      .where(and(
        eq(usageMetrics.userId, userId),
        sql`${usageMetrics.searchTime} IS NOT NULL`
      ));

    return {
      totalUsage: totalUsage[0]?.count || 0,
      favoriteLanguages: favoriteLanguages || [],
      performance: {
        avgSearchTime: avgPerformance[0]?.avgSearchTime || null
      }
    };
  }

  async getSnippetAnalytics(snippetId: number): Promise<any> {
    const usage = await this.db
      .select({
        totalUsage: count(),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${usageMetrics.userId})`,
        avgSearchTime: sql<number>`AVG(${usageMetrics.searchTime})`,
        successRate: sql<number>`AVG(CASE WHEN ${usageMetrics.wasAccepted} THEN 1.0 ELSE 0.0 END)`
      })
      .from(usageMetrics)
      .where(eq(usageMetrics.snippetId, snippetId));

    const languageBreakdown = await this.db
      .select({
        language: usageMetrics.language,
        count: count()
      })
      .from(usageMetrics)
      .where(eq(usageMetrics.snippetId, snippetId))
      .groupBy(usageMetrics.language)
      .orderBy(desc(count()));

    return {
      ...usage[0],
      languageBreakdown
    };
  }

  // Utility Methods
  private async getSnippetCount(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(snippets);
    return result[0]?.count || 0;
  }

  private async ensureSystemApiKey(): Promise<void> {
    const [existingSystemKey] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyId, 'system'));

    if (!existingSystemKey) {
      console.log('🔑 Creating system API key for seeded snippets...');
      await this.db.insert(apiKeys).values({
        keyId: 'system',
        userName: 'System',
        prefix: 'sys',
        isActive: true
      });
    }
  }

  private async seedInitialData(): Promise<void> {
    const currentCount = await this.getSnippetCount();
    if (currentCount > 0) return;

    console.log('🌱 Seeding initial snippet data with Drizzle...');
    
    try {
      const { snippets: seedSnippets } = await import('../snippets');
      
      for (const snippet of seedSnippets) {
        const preparedSnippet = this.prepareSnippetForStorage({
          name: snippet.name,
          prefix: snippet.prefix,
          body: snippet.body,
          description: snippet.description,
          scope: snippet.scope,
          category: this.categorizeSnippet(snippet.name)
        });
        await this.createSnippet(preparedSnippet);
      }
      
      console.log(`✅ Seeded ${seedSnippets.length} snippets with Drizzle ORM`);
    } catch (error) {
      console.error('❌ Error seeding initial data:', error);
    }
  }

  private categorizeSnippet(name: string): string {
    const nameL = name.toLowerCase();
    if (nameL.includes('react') || nameL.includes('component') || nameL.includes('hook')) return 'react';
    if (nameL.includes('async') || nameL.includes('api') || nameL.includes('fetch')) return 'async';
    if (nameL.includes('test') || nameL.includes('spec')) return 'testing';
    if (nameL.includes('style') || nameL.includes('css')) return 'styling';
    if (nameL.includes('redux') || nameL.includes('store')) return 'state';
    return 'general';
  }

  // API Key Management
  async validateApiKey(keyId: string): Promise<ApiKey | null> {
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.keyId, keyId),
        eq(apiKeys.isActive, true)
      ));

    if (key) {
      // Update usage count
      await this.db.update(apiKeys)
        .set({
          usageCount: sql`${apiKeys.usageCount} + 1`
        })
        .where(eq(apiKeys.keyId, keyId));
    }

    return key || null;
  }

  async createApiKey(keyData: NewApiKey): Promise<ApiKey> {
    const [created] = await this.db.insert(apiKeys).values(keyData).returning();
    return created;
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return await this.db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async updateApiKey(keyId: string, updates: Partial<NewApiKey>): Promise<ApiKey | null> {
    const [updated] = await this.db.update(apiKeys)
      .set(updates)
      .where(eq(apiKeys.keyId, keyId))
      .returning();
    return updated || null;
  }

  async deleteApiKey(keyId: string): Promise<boolean> {
    const result = await this.db.delete(apiKeys).where(eq(apiKeys.keyId, keyId));
    return result.changes > 0;
  }

  generateApiKey(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 12);
    return `${prefix}_${timestamp}${random}`;
  }

  async getUniqueCategories(): Promise<string[]> {
    const result = await this.db
      .selectDistinct({ category: snippets.category })
      .from(snippets)
      .where(sql`${snippets.category} IS NOT NULL AND ${snippets.category} != ''`)
      .orderBy(snippets.category);
    
    return result.map(row => row.category).filter((category): category is string => category !== null);
  }

  async getSnippetStats(): Promise<any> {
    const totalSnippets = await this.db.select({ count: count() }).from(snippets);
    
    const categoryBreakdown = await this.db
      .select({
        category: snippets.category,
        count: count()
      })
      .from(snippets)
      .groupBy(snippets.category)
      .orderBy(desc(count()));

    const avgUsageCount = await this.db
      .select({
        avgUsage: sql<number>`AVG(${snippets.usageCount})`
      })
      .from(snippets);

    return {
      total: totalSnippets[0]?.count || 0,
      categories: categoryBreakdown.length,
      avgUsage: Math.round(avgUsageCount[0]?.avgUsage || 0),
      categoryBreakdown
    };
  }

  async getUsageOverview(): Promise<any> {
    const totalUsage = await this.db
      .select({ total: count() })
      .from(usageMetrics);

    const uniqueUsers = await this.db
      .select({ 
        uniqueUsers: sql<number>`COUNT(DISTINCT ${usageMetrics.userId})`
      })
      .from(usageMetrics);

    const avgSearchTime = await this.db
      .select({
        avgTime: sql<number>`AVG(${usageMetrics.searchTime})`
      })
      .from(usageMetrics)
      .where(sql`${usageMetrics.searchTime} IS NOT NULL`);

    const successRate = await this.db
      .select({
        rate: sql<number>`AVG(CASE WHEN ${usageMetrics.wasAccepted} THEN 1.0 ELSE 0.0 END) * 100`
      })
      .from(usageMetrics);

    return {
      totalUsage: totalUsage[0]?.total || 0,
      uniqueUsers: uniqueUsers[0]?.uniqueUsers || 0,
      avgSearchTime: Math.round(avgSearchTime[0]?.avgTime || 0),
      successRate: Math.round(successRate[0]?.rate || 0)
    };
  }

  async getCategoryStats(): Promise<any> {
    const categoryUsage = await this.db
      .select({
        category: snippets.category,
        totalUsage: sql<number>`SUM(${snippets.usageCount})`,
        snippetCount: count()
      })
      .from(snippets)
      .groupBy(snippets.category)
      .orderBy(desc(sql<number>`SUM(${snippets.usageCount})`))
      .limit(5);

    return categoryUsage;
  }

  async close(): Promise<void> {
    this.sqlite.close();
  }
}

export { snippets, usageMetrics, apiKeys };
export type { Snippet, NewSnippet, UsageMetric, NewUsageMetric, ApiKey, NewApiKey };