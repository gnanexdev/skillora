import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { pool, verifyDatabaseConnection } from './config/database.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import authRoutes from './routes/authRoutes.js'
import achievementRoutes from './routes/achievementRoutes.js'
import goalRoutes from './routes/goalRoutes.js'
import goalHealthRoutes from './routes/goalHealthRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import lifeEventRoutes from './routes/lifeEventRoutes.js'
import roadmapRoutes from './routes/roadmapRoutes.js'
import planningRecommendationRoutes from './routes/planningRecommendationRoutes.js'
import progressRoutes from './routes/progressRoutes.js'
import routineRoutes from './routes/routineRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import weeklyPlanRoutes from './routes/weeklyPlanRoutes.js'
import weeklyReviewRoutes from './routes/weeklyReviewRoutes.js'

const app = express()
const port = Number(process.env.PORT || 5000)
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Origin is not allowed by CORS'))
  },
}))
app.use(express.json({ limit: '16kb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/achievements', achievementRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/goals', progressRoutes)
app.use('/api/goals', goalHealthRoutes)
app.use('/api', roadmapRoutes)
app.use('/api/weekly-plans', weeklyPlanRoutes)
app.use('/api/weekly-reviews', weeklyReviewRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/routines', routineRoutes)
app.use('/api/life-events', lifeEventRoutes)
app.use('/api/planning-suggestions', planningRecommendationRoutes)
app.use(notFound)
app.use(errorHandler)

const server = app.listen(port, () => {
  console.log(`SkillOra API listening on port ${port}`)
})

try {
  await verifyDatabaseConnection()
  console.log('PostgreSQL connection verified')
} catch (error) {
  console.error(`PostgreSQL connection check failed: ${error.message}`)
}

async function shutdown(signal) {
  console.log(`${signal} received; closing server`)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
