// Lazy SQLite initialization (only for local dev)
let sqlite: any;
let _db: any;

function initSqlite() {
  if (sqlite) return;
  try {
    const Database = require('better-sqlite3');
    const { join, dirname } = require('path');
    const { fileURLToPath } = require('url');
    const { mkdirSync } = require('fs');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const DB_PATH = join(__dirname, '../../data/ozion.db');

    mkdirSync(join(__dirname, '../../data'), { recursive: true });
    sqlite = new Database(DB_PATH);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    const schema = require('./schema.js');
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    _db = drizzle(sqlite, { schema });
  } catch (e) {
    console.warn('SQLite unavailable (Vercel serverless)');
  }
}

export function getDb() {
  initSqlite();
  return _db;
}

// Proxy that lazily initializes SQLite
export const db = new Proxy({} as any, {
  get(target, prop) {
    initSqlite();
    if (!_db) throw new Error('SQLite not available in production');
    return (_db as any)[prop];
  }
});

export function initDatabase() {
  initSqlite();
  if (!sqlite) {
    console.log('⚠️  SQLite not available, using Supabase');
    return;
  }
  console.log('✅ Database initialized');
}

export async function testConnection() {
  try {
    if (!sqlite) {
      console.log('ℹ️  SQLite not available, using Supabase');
      return true;
    }
    sqlite.prepare('SELECT 1').get();
    console.log('✅ SQLite connected');
    initDatabase();
    return true;
  } catch (error) {
    console.error('❌ Database error:', error);
    return false;
  }
}

export { sqlite };
