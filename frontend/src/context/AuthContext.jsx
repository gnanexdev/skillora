import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './AuthContext.js'
import authApi from '../services/authApi.js'

const TOKEN_STORAGE_KEY = 'skillora_access_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)))

  useEffect(() => {
    let active = true
    const handleUnauthorized = () => {
      if (active) {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setUser(null)
      }
    }
    window.addEventListener('skillora:unauthorized', handleUnauthorized)
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)

    if (!token) {
      return () => {
        active = false
        window.removeEventListener('skillora:unauthorized', handleUnauthorized)
      }
    }

    authApi.me(token)
      .then(({ user: authenticatedUser }) => {
        if (active) setUser(authenticatedUser)
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem(TOKEN_STORAGE_KEY)
        }
        setUser(null)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      window.removeEventListener('skillora:unauthorized', handleUnauthorized)
    }
  }, [])

  const establishSession = ({ token: accessToken, user: authenticatedUser }) => {
    if (!accessToken || !authenticatedUser) {
      throw new Error('The server returned an incomplete authentication response.')
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
    setUser(authenticatedUser)
  }

  const register = async (details) => {
    const result = await authApi.register(details)
    establishSession(result)
    return result.user
  }

  const login = async (credentials) => {
    const result = await authApi.login(credentials)
    establishSession(result)
    return result.user
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setUser(null)
  }

  const updateUser = useCallback((updatedUser) => {
    setUser((current) => current ? { ...current, ...updatedUser } : updatedUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: Boolean(user), register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider