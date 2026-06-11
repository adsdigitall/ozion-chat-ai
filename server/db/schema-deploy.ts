import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const changelogs = sqliteTable('changelogs', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'feature', 'fix', 'improvement', 'breaking', 'security'
  module: text('module').notNull(), // 'crm', 'chat', 'flows', 'agents', 'voice', 'ctwa', 'sales', 'analytics', 'integrations', 'core'
  author: text('author').default('system'),
  environment: text('environment').default('production'), // 'development', 'staging', 'production'
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  publishedAt: text('published_at'),
  createdAt: text('created_at').default('datetime("now")').notNull(),
});

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'full', 'database', 'flows', 'agents', 'config', 'integrations'
  status: text('status').default('pending'), // 'pending', 'running', 'completed', 'failed', 'restored'
  size: integer('size').default(0),
  filePath: text('file_path'),
  modules: text('modules').default('[]'),
  metadata: text('metadata').default('{}'),
  createdAt: text('created_at').default('datetime("now")').notNull(),
  completedAt: text('completed_at'),
});

export const modules = sqliteTable('modules', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  version: text('version').default('1.0.0'),
  status: text('status').default('active'), // 'active', 'inactive', 'deprecated'
  isCore: integer('is_core', { mode: 'boolean' }).default(false),
  dependencies: text('dependencies').default('[]'),
  lastUpdated: text('last_updated').default('datetime("now")'),
  createdAt: text('created_at').default('datetime("now")').notNull(),
  updatedAt: text('updated_at').default('datetime("now")').notNull(),
});

export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  environment: text('environment').notNull(), // 'development', 'staging', 'production'
  status: text('status').default('pending'), // 'pending', 'building', 'testing', 'deploying', 'completed', 'failed', 'rolled-back'
  branch: text('branch'),
  commitHash: text('commit_hash'),
  commitMessage: text('commit_message'),
  deployedBy: text('deployed_by').default('system'),
  buildLog: text('build_log'),
  rollbackVersion: text('rollback_version'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default('datetime("now")').notNull(),
});
