import { useEffect, useRef, useState } from 'react'
import { Award, ChevronDown, CircleUserRound, Goal, LogOut, Settings, SunMoon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { useTheme } from '../../context/useTheme.js'
import settingsApi from '../../services/settingsApi.js'

export function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [themeError, setThemeError] = useState('')
  const [isSavingTheme, setIsSavingTheme] = useState(false)
  const rootRef = useRef(null)
  const { user, logout } = useAuth()
  const { preference, setTheme } = useTheme()
  const navigate = useNavigate()
  const initials = (user?.name || user?.email || 'U').trim().slice(0, 1).toUpperCase()

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const handleSignOut = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const handleThemeChange = async (event) => {
    const nextTheme = event.target.value
    setIsSavingTheme(true)
    setThemeError('')
    try {
      await settingsApi.update({ theme: nextTheme })
      setTheme(nextTheme)
    } catch (error) {
      setThemeError(error.message || 'Unable to save theme preference.')
    } finally {
      setIsSavingTheme(false)
    }
  }

  return (
    <div className="profile-menu" ref={rootRef}>
      <button className="profile-menu__trigger" type="button" aria-label="Open profile menu" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <span className="profile-menu__avatar" aria-hidden="true">{initials}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="profile-menu__panel" role="menu" aria-label="Profile menu">
          <Link role="menuitem" to="/profile" onClick={() => setIsOpen(false)}><CircleUserRound size={16} /> Profile</Link>
          <Link role="menuitem" to="/goals" onClick={() => setIsOpen(false)}><Goal size={16} /> Goals</Link>
          <Link role="menuitem" to="/achievements" onClick={() => setIsOpen(false)}><Award size={16} /> Achievements</Link>
          <label className="profile-menu__theme"><span><SunMoon size={16} /> Theme</span>
            <select aria-label="Theme" value={preference} disabled={isSavingTheme} onChange={handleThemeChange}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          {themeError && <p className="profile-menu__error" role="alert">{themeError}</p>}
          <Link role="menuitem" to="/settings" onClick={() => setIsOpen(false)}><Settings size={16} /> Settings</Link>
          <div className="profile-menu__divider" />
          <button role="menuitem" type="button" onClick={handleSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  )
}

export default ProfileMenu