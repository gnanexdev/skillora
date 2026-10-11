import { useEffect, useState } from 'react'
import { Settings2 } from 'lucide-react'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import { useTheme } from '../context/useTheme.js'
import settingsApi from '../services/settingsApi.js'
import '../styles/profile-settings.css'

const DEFAULT_SETTINGS = { theme: 'system', week_starts_on: 1, notifications_enabled: true, timezone: 'UTC' }
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function SettingsPage() {
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [draft, setDraft] = useState(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    settingsApi.get()
      .then(({ settings: loaded }) => {
        if (!active) return
        const normalized = { ...DEFAULT_SETTINGS, ...loaded }
        setSettings(normalized)
        setDraft(normalized)
        setTheme(normalized.theme)
      })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load settings.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [setTheme])

  const cancel = () => {
    setDraft(settings)
    setTheme(settings.theme)
    setError('')
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSaving(true)
    try {
      const { settings: savedSettings } = await settingsApi.update(draft)
      setSettings(savedSettings)
      setDraft(savedSettings)
      setTheme(savedSettings.theme)
      setNotice('Settings saved.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  return (
    <main className="product-page">
      <ProductHeader />
      <section className="product-content page-wrap settings-content">
        <header className="product-page-heading"><div><p className="eyebrow">Your preferences</p><h1>Settings</h1><p>Choose how SkillOra fits your time and workspace.</p></div></header>
        {error && <div className="goals-error" role="alert"><p>{error}</p><button className="button button--quiet" type="button" onClick={() => window.location.reload()}>Try again</button></div>}
        {notice && <p className="profile-notice" role="status">{notice}</p>}
        {isLoading ? <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading settings...</div> : (
          <form className="settings-form" onSubmit={save}>
            <section className="settings-group"><header><Settings2 size={18} /><div><h2>Appearance and time</h2><p>These preferences also guide weekly planning.</p></div></header>
              <label>Theme<select value={draft.theme} onChange={(event) => updateDraft('theme', event.target.value)}><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
              <label>Week starts on<select value={draft.week_starts_on} onChange={(event) => updateDraft('week_starts_on', Number(event.target.value))}>{WEEK_DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label>Timezone<input value={draft.timezone} maxLength={100} placeholder="e.g. America/New_York" onChange={(event) => updateDraft('timezone', event.target.value)} /><small>Use an IANA timezone such as Europe/London or Asia/Tokyo.</small></label>
            </section>
            <section className="settings-group settings-group--notifications"><label className="settings-toggle"><input type="checkbox" checked={draft.notifications_enabled} onChange={(event) => updateDraft('notifications_enabled', event.target.checked)} /><span><strong>Notifications</strong><small>Allow SkillOra notifications where supported.</small></span></label></section>
            {error && <p className="goal-form__error" role="alert">{error}</p>}
            <footer className="profile-editor__actions"><button className="button button--quiet" type="button" onClick={cancel} disabled={isSaving}>Cancel</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save settings'}</button></footer>
          </form>
        )}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
    </main>
  )
}

export default SettingsPage