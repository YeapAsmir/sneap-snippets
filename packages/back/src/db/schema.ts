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
  
  // Usage tracking
  usageCount: integer('usage_count').default(0),
  lastUsed: integer('last_used').default(sql`(unixepoch())`),
  
  // Metadata
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
  createdBy: text('created_by').references(() => apiKeys.keyId, { onDelete: 'set default' }).default('system')
});

export const usageMetrics = sqliteTable('usage_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snippetId: integer('snippet_id').notNull().references(() => snippets.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Extension installation ID
  
  // Usage context
  language: text('language').notNull(),
  fileExtension: text('file_extension'),
  
  // Performance data
  searchTime: real('search_time'), // ms to find snippet
  
  // Context data
  wasAccepted: integer('was_accepted', { mode: 'boolean' }).default(true),
  
  timestamp: integer('timestamp').default(sql`(unixepoch())`),
});


export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  
  // Metadata
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`)
});

export const teamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email'),
  avatar: text('avatar'), // File path for uploaded avatar
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  // Metadata
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`)
});

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  keyId: text('key_id').notNull().unique(), // e.g., asmr_9kdoe24fjzi2
  userName: text('user_name').notNull(), // Display name
  prefix: text('prefix').notNull(), // User prefix (asmr, john, etc.)
  teamMemberId: integer('team_member_id').references(() => teamMembers.id, { onDelete: 'set null' }),
  
  // Key management
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  usageCount: integer('usage_count').default(0),
  
  // Metadata
  createdAt: integer('created_at').default(sql`(unixepoch())`)
});

// Export types
export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export type NewUsageMetric = typeof usageMetrics.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;