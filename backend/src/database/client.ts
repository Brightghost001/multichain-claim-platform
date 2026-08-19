// ═══════════════════════════════════════════════════════════
// Database client — PostgreSQL connection pool
// ═══════════════════════════════════════════════════════════

import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) throw new Error('DATABASE_URL not set');
    pool = new Pool({ connectionString: connStr, max: 20, idleTimeoutMillis: 30000 });
    pool.on('error', (err) => console.error('Pool error:', err.message));
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}
