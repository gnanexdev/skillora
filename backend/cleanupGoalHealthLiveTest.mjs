import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')
const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
const users = await client.query(`
  SELECT id
  FROM public.users
  WHERE email LIKE 'goal-health-%' OR email LIKE 'goal-health-other-%'
`)
for (const user of users.rows) {
  const id = user.id
  await client.query('DELETE FROM public.planning_recommendations WHERE user_id = $1', [id])
  await client.query('DELETE FROM public.tasks WHERE user_id = $1', [id])
  await client.query('DELETE FROM public.life_events WHERE user_id = $1', [id])
  await client.query('DELETE FROM public.weekly_plans WHERE user_id = $1', [id])
  await client.query(`
    DELETE FROM public.skills
    WHERE milestone_id IN (
      SELECT id FROM public.milestones
      WHERE roadmap_id IN (
        SELECT id FROM public.roadmaps
        WHERE goal_id IN (
          SELECT id FROM public.goals WHERE user_id = $1
        )
      )
    )
  `, [id])
  await client.query(`
    DELETE FROM public.milestones
    WHERE roadmap_id IN (
      SELECT id FROM public.roadmaps
      WHERE goal_id IN (
        SELECT id FROM public.goals WHERE user_id = $1
      )
    )
  `, [id])
  await client.query(`
    DELETE FROM public.roadmaps
    WHERE goal_id IN (
      SELECT id FROM public.goals WHERE user_id = $1
    )
  `, [id])
  await client.query('DELETE FROM public.goals WHERE user_id = $1', [id])
  await client.query('DELETE FROM public.users WHERE id = $1', [id])
}
console.log(`cleaned_temporary_users=${users.rowCount}`)
await client.end()
