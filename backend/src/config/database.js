import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const databaseUrl = new URL(process.env.DATABASE_URL)
const isSupabaseHost = databaseUrl.hostname.endsWith('.supabase.co')
  || databaseUrl.hostname.endsWith('.pooler.supabase.com')

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabaseHost ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message)
})

export async function verifyDatabaseConnection() {
  const result = await pool.query('SELECT 1 AS connected')
  return result.rows[0]?.connected === 1
}
