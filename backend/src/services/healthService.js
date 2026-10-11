import { pool } from '../config/database.js'

export async function checkDatabaseHealth() {
  const result = await pool.query('SELECT 1 AS connected')
  return result.rows[0]?.connected === 1
}
