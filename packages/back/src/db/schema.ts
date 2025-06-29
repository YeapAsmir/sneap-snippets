import { sql } from 'drizzle-orm';
import { integer, text, sqliteTable, real } from 'drizzle-orm/sqlite-core';

export const snippets = sqliteTable('snippets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  prefix: text('prefix').notNull().unique(),
  body: text('body').notNull(), // JSON string array
  description: text('description').notNull(),
  scope: text('scope'), // JSON string array or null
  category: text('category').default('general'),
  tags: text('tags'), // JSON string array
  
  // Usage tracking
  usageCount: integer('usage_count').default(0),
  lastUsed: integer('last_used').default(sql`(unixepoch())`),
  
  // Metadata
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
  createdBy: text('created_by').default('system'),
  
  // Performance metrics
  avgCompletionTime: real('avg_completion_time').default(0), // milliseconds
  successRate: real('success_rate').default(1.0), // 0-1
});

export const usageMetrics = sqliteTable('usage_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snippetId: integer('snippet_id').notNull().references(() => snippets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Extension installation ID
  
  // Usage context
  language: text('language').notNull(),
  fileExtension: text('file_extension'),
  projectType: text('project_type'), // react, node, etc.
  
  // Performance data
  searchTime: real('search_time'), // ms to find snippet
  completionTime: real('completion_time'), // ms to accept snippet
  
  // Context data
  triggerPrefix: text('trigger_prefix'), // What user typed
  wasAccepted: integer('was_accepted', { mode: 'boolean' }).default(true),
  
  timestamp: integer('timestamp').default(sql`(unixepoch())`),
});

export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  
  // Personalization
  favoriteCategories: text('favorite_categories'), // JSON array
  excludedCategories: text('excluded_categories'), // JSON array
  customKeywords: text('custom_keywords'), // JSON array
  
  // Behavior tracking
  averageSessionLength: real('avg_session_length').default(0),
  preferredLanguages: text('preferred_languages'), // JSON array
  typingSpeed: real('typing_speed').default(50), // WPM
  
  lastActive: integer('last_active').default(sql`(unixepoch())`),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
});

// Export types
export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export type NewUsageMetric = typeof usageMetrics.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;