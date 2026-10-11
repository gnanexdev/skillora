import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import SkilloraLogo from '../components/brand/SkilloraLogo.jsx'
import { useAuth } from '../context/useAuth.js'

export function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    const formData = new FormData(event.currentTarget)
    const name = isSignup ? formData.get('name').trim() : ''
    const email = formData.get('email').trim()
    const password = formData.get('password')

    if (isSignup && (!name || name.length > 100)) {
      setErrorMessage('Enter your name using 1 to 100 characters.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setErrorMessage('Enter a valid email address.')
      return
    }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setErrorMessage('Password must be at least 8 characters and no more than 72 bytes.')
      return
    }
    if (isSignup && password !== formData.get('confirmPassword')) {
      setErrorMessage('Your passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isSignup) {
        await register({ name, email, password })
      } else {
        await login({ email, password })
      }
      navigate('/app', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to authenticate. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-page__side">
        <Link className="auth-page__back" to="/"><ArrowLeft size={16} /> Back to SkillOra</Link>
        <div className="auth-page__message">
          <p className="eyebrow eyebrow--light">Your next chapter starts here</p>
          <h1>{isSignup ? 'Make room for the goals that matter.' : 'Pick up where your progress left off.'}</h1>
          <p>{isSignup ? 'Give your ambition a clear path, then make steady progress at your own pace.' : 'Your goals, plans, and small wins are ready when you are.'}</p>
          <span className="auth-page__tagline">Set. Plan. Act. Track. Grow.</span>
        </div>
        <span className="auth-page__organization">Organized by GNANEX</span>
      </div>
      <div className="auth-panel">
        <Link to="/" className="auth-panel__logo" aria-label="SkillOra home"><SkilloraLogo variant="full" orientation="horizontal" size="sm" /></Link>
        <div className="auth-panel__form-wrap">
          <p className="eyebrow">{isSignup ? 'Start your progress' : 'Welcome back'}</p>
          <h2>{isSignup ? 'Create your account' : 'Sign in to SkillOra'}</h2>
          <p className="auth-panel__description">{isSignup ? 'A clearer way to turn goals into progress.' : 'Continue building toward what matters to you.'}</p>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isSignup && <label>Full name<input name="name" type="text" autoComplete="name" placeholder="Your name" maxLength="100" required /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength="254" required /></label>
            <label>Password<input name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="At least 8 characters" minLength="8" maxLength="72" required /></label>
            {isSignup && <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Enter your password again" minLength="8" maxLength="72" required /></label>}
            {!isSignup && <div className="auth-form__forgot"><span>Use the email linked to your account.</span></div>}
            {errorMessage && <p className="auth-form__error" role="alert">{errorMessage}</p>}
            <button className="button button--primary auth-form__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign In'}
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>
          <p className="auth-panel__switch">{isSignup ? 'Already have an account?' : 'New to SkillOra?'} <Link to={isSignup ? '/signin' : '/signup'}>{isSignup ? 'Sign in' : 'Get started'}</Link></p>
        </div>
        <p className="auth-panel__footer">Organized by GNANEX</p>
      </div>
    </main>
  )
}

export default AuthPage
