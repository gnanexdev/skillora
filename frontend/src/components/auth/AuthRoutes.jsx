import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'

function AuthLoading() {
  return (
    <main className="auth-loading" role="status" aria-live="polite">
      <span className="auth-loading__spinner" aria-hidden="true" />
      <span>Checking your session...</span>
    </main>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <AuthLoading />
  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <AuthLoading />
  return isAuthenticated ? <Navigate to="/app" replace /> : <Outlet />
}

export default ProtectedRoute