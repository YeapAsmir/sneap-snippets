import sqlite3 from 'sqlite3';
import { promisify } from 'util';

interface Snippet {
  id?: number;
  name: string;
  prefix: string;
  body: string; // JSON string array
  description: string;
  scope?: string; // JSON string array or null
  category?: string;
  usageCount?: number;
  lastUsed?: number;
  createdAt?: number;
}

interface UsageMetric {
  id?: number;
  snippetId: number;
  userId: string;
  language: string;
  fileExtension?: string;
  searchTime?: number;
  wasAccepted: boolean;
  timestamp?: number;
}

export class SQLiteDatabase {
  private db: sqlite3.Database;
  private dbRun: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private dbGet: (sql: string, params?: any[]) => Promise<any>;
  private dbAll: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(dbPath: string = './snippets.db') {
    this.db = new sqlite3.Database(dbPath);
    
    // Promisify database methods
    this.dbRun = promisify(this.db.run.bind(this.db));
    this.dbGet = promisify(this.db.get.bind(this.db));
    this.dbAll = promisify(this.db.all.bind(this.db));
  }

  async initialize(): Promise<void> {
    console.log('Initializing SQLite database...');
    
    // Enable foreign keys
    await this.dbRun('PRAGMA foreign_keys = ON');
    
    // Create tables
    await this.createTables();
    
    // Seed initial data if empty
    const count = await this.getSnippetCount();
    console.log(`Found ${count} existing snippets in database`);
    
    if (count === 0) {
      await this.seedInitialData();
    }
  }

  private async createTables(): Promise<void> {
    // Create snippets table
    await this.dbRun(`
      CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        prefix TEXT NOT NULL UNIQUE,
        body TEXT NOT NULL,
        description TEXT NOT NULL,
        scope TEXT,
        category TEXT DEFAULT 'general',
        usage_count INTEGER DEFAULT 0,
        last_used INTEGER DEFAULT CURRENT_TIMESTAMP,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create usage_metrics table
    await this.dbRun(`
      CREATE TABLE IF NOT EXISTS usage_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snippet_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        language TEXT NOT NULL,
        file_extension TEXT,
        search_time REAL,
        was_accepted INTEGER DEFAULT 1,
        timestamp INTEGER DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (snippet_id) REFERENCES snippets (id)
      )
    `);

    // Create indexes for performance
    await this.dbRun('CREATE INDEX IF NOT EXISTS idx_snippets_prefix ON snippets(prefix)');
    await this.dbRun('CREATE INDEX IF NOT EXISTS idx_snippets_usage ON snippets(usage_count DESC)');
    await this.dbRun('CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets(category)');
    await this.dbRun('CREATE INDEX IF NOT EXISTS idx_metrics_snippet ON usage_metrics(snippet_id)');
    await this.dbRun('CREATE INDEX IF NOT EXISTS idx_metrics_user ON usage_metrics(user_id)');
    await this.dbRun('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON usage_metrics(timestamp)');
  }

  // CRUD Operations for Snippets
  async createSnippet(snippet: Omit<Snippet, 'id'>): Promise<Snippet> {
    const result = await this.dbRun(
      `INSERT INTO snippets (name, prefix, body, description, scope, category) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [snippet.name, snippet.prefix, snippet.body, snippet.description, snippet.scope, snippet.category]
    );
    
    const created = await this.dbGet('SELECT * FROM snippets WHERE id = ?', [result.lastID]);
    return this.transformSnippet(created);
  }

  async getSnippetById(id: number): Promise<Snippet | null> {
    const row = await this.dbGet('SELECT * FROM snippets WHERE id = ?', [id]);
    return row ? this.transformSnippet(row) : null;
  }

  async updateSnippet(id: number, updates: Partial<Snippet>): Promise<Snippet | null> {
    const fields = [];
    const values = [];
    
    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.prefix) { fields.push('prefix = ?'); values.push(updates.prefix); }
    if (updates.body) { fields.push('body = ?'); values.push(updates.body); }
    if (updates.description) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.scope !== undefined) { fields.push('scope = ?'); values.push(updates.scope); }
    if (updates.category) { fields.push('category = ?'); values.push(updates.category); }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    
    await this.dbRun(
      `UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return this.getSnippetById(id);
  }

  async deleteSnippet(id: number): Promise<boolean> {
    const result = await this.dbRun('DELETE FROM snippets WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }

  // Search Operations
  async searchSnippets(query: string = '', language?: string, limit: number = 20): Promise<Snippet[]> {
    let sql = 'SELECT * FROM snippets WHERE 1=1';
    const params: any[] = [];

    if (query.trim()) {
      sql += ' AND (prefix LIKE ? OR name LIKE ? OR description LIKE ?)';
      const likeQuery = `%${query}%`;
      params.push(likeQuery, likeQuery, likeQuery);
    }

    if (language) {
      sql += ' AND (scope IS NULL OR scope LIKE ?)';
      params.push(`%"${language}"%`);
    }

    sql += ' ORDER BY usage_count DESC, prefix ASC LIMIT ?';
    params.push(limit);

    const rows = await this.dbAll(sql, params);
    return rows.map(row => this.transformSnippet(row));
  }

  async getPopularSnippets(limit: number = 50, language?: string): Promise<Snippet[]> {
    let sql = 'SELECT * FROM snippets WHERE 1=1';
    const params: any[] = [];

    if (language) {
      sql += ' AND (scope IS NULL OR scope LIKE ?)';
      params.push(`%"${language}"%`);
    }

    sql += ' ORDER BY usage_count DESC, last_used DESC LIMIT ?';
    params.push(limit);

    const rows = await this.dbAll(sql, params);
    return rows.map(row => this.transformSnippet(row));
  }

  async getPersonalizedSnippets(userId: string, language?: string, limit: number = 20): Promise<Snippet[]> {
    let sql = `
      SELECT s.*, COUNT(um.id) as user_usage_count
      FROM snippets s
      LEFT JOIN usage_metrics um ON s.id = um.snippet_id AND um.user_id = ?
      WHERE 1=1
    `;
    const params: any[] = [userId];

    if (language) {
      sql += ' AND (s.scope IS NULL OR s.scope LIKE ?)';
      params.push(`%"${language}"%`);
    }

    sql += ' GROUP BY s.id ORDER BY user_usage_count DESC, s.usage_count DESC LIMIT ?';
    params.push(limit);

    const rows = await this.dbAll(sql, params);
    return rows.map(row => this.transformSnippet(row));
  }

  // Usage Tracking
  async recordUsage(metric: Omit<UsageMetric, 'id' | 'timestamp'>): Promise<void> {
    await this.dbRun(
      `INSERT INTO usage_metrics (snippet_id, user_id, language, file_extension, search_time, was_accepted) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        metric.snippetId, 
        metric.userId, 
        metric.language, 
        metric.fileExtension, 
        metric.searchTime, 
        metric.wasAccepted ? 1 : 0
      ]
    );

    // Update snippet usage count if accepted
    if (metric.wasAccepted) {
      await this.dbRun(
        'UPDATE snippets SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?',
        [metric.snippetId]
      );
    }
  }

  // Analytics
  async getUserStats(userId: string): Promise<any> {
    const totalUsage = await this.dbGet(
      'SELECT COUNT(*) as count FROM usage_metrics WHERE user_id = ?',
      [userId]
    );

    const favoriteLanguages = await this.dbAll(
      `SELECT language, COUNT(*) as count 
       FROM usage_metrics 
       WHERE user_id = ? 
       GROUP BY language 
       ORDER BY count DESC 
       LIMIT 5`,
      [userId]
    );

    const avgPerformance = await this.dbGet(
      `SELECT AVG(search_time) as avgSearchTime 
       FROM usage_metrics 
       WHERE user_id = ? AND search_time IS NOT NULL`,
      [userId]
    );

    return {
      totalUsage: totalUsage.count || 0,
      favoriteLanguages: favoriteLanguages || [],
      performance: {
        avgSearchTime: avgPerformance?.avgSearchTime || null
      }
    };
  }

  async getSnippetAnalytics(snippetId: number): Promise<any> {
    const usage = await this.dbGet(
      `SELECT 
        COUNT(*) as totalUsage,
        COUNT(DISTINCT user_id) as uniqueUsers,
        AVG(search_time) as avgSearchTime,
        AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END) as successRate
       FROM usage_metrics 
       WHERE snippet_id = ?`,
      [snippetId]
    );

    const languageBreakdown = await this.dbAll(
      `SELECT language, COUNT(*) as count
       FROM usage_metrics 
       WHERE snippet_id = ?
       GROUP BY language 
       ORDER BY count DESC`,
      [snippetId]
    );

    return {
      ...usage,
      languageBreakdown
    };
  }

  // Utility Methods
  private async getSnippetCount(): Promise<number> {
    const result = await this.dbGet('SELECT COUNT(*) as count FROM snippets');
    return result.count || 0;
  }

  private transformSnippet(row: any): Snippet {
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      body: row.body,
      description: row.description,
      scope: row.scope,
      category: row.category,
      usageCount: row.usage_count || 0,
      lastUsed: row.last_used,
      createdAt: row.created_at
    };
  }

  private async seedInitialData(): Promise<void> {
    console.log('Seeding initial snippet data...');
    
    try {
      const { snippets } = await import('./snippets');
      
      for (const snippet of snippets) {
        await this.createSnippet({
          name: snippet.name,
          prefix: snippet.prefix,
          body: JSON.stringify(snippet.body),
          description: snippet.description,
          scope: snippet.scope ? JSON.stringify(snippet.scope) : undefined,
          category: this.categorizeSnippet(snippet.name)
        });
      }
      
      console.log(`✅ Seeded ${snippets.length} initial snippets into SQLite database`);
    } catch (error) {
      console.error('Error seeding initial data:', error);
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

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}