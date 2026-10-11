import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BrandParticleIntro from './components/brand/BrandParticleIntro.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/AuthRoutes.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/useAuth.js'
import AppDashboard from './pages/AppDashboard.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import GoalDetailPage from './pages/GoalDetailPage.jsx'
import WeekPage from './pages/WeekPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import RoutinesPage from './pages/RoutinesPage.jsx'
import LifeEventsPage from './pages/LifeEventsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import WeeklyReviewPage from './pages/WeeklyReviewPage.jsx'
import AchievementsPage from './pages/AchievementsPage.jsx'
import Landing from './pages/Landing.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'
import './styles/landing.css'

function HomeRoute() {
  const { isLoading, isAuthenticated } = useAuth()
  if (isLoading) return <main className="auth-loading" role="status"><span className="auth-loading__spinner" /> Checking your session...</main>
  return isAuthenticated ? <Navigate to="/app" replace /> : <Landing />
}

function SiteRoutes() {
  const location = useLocation()
  const [introActive, setIntroActive] = useState(() => location.pathname === '/' && sessionStorage.getItem('skillora_intro_seen') !== 'true')

  const completeIntro = () => {
    sessionStorage.setItem('skillora_intro_seen', 'true')
    setIntroActive(false)
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppDashboard />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/goals/:id" element={<GoalDetailPage />} />
          <Route path="/week" element={<WeekPage />} />
          <Route path="/routines" element={<RoutinesPage />} />
          <Route path="/life-events" element={<LifeEventsPage />} />
          <Route path="/life-context" element={<LifeEventsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/weekly-review" element={<WeeklyReviewPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Landing />} />
      </Routes>
      {introActive && <BrandParticleIntro onComplete={completeIntro} />}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App