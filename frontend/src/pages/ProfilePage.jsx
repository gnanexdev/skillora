import { useEffect, useState } from 'react'
import { CircleUserRound, Pencil, UserRound } from 'lucide-react'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import { useAuth } from '../context/useAuth.js'
import profileApi from '../services/profileApi.js'
import '../styles/profile-settings.css'

const PROFILE_FIELDS = [
  { name: 'college_or_university', label: 'College or university', maxLength: 180 },
  { name: 'degree', label: 'Degree or qualification', maxLength: 140 },
  { name: 'department', label: 'Department or branch', maxLength: 140 },
  { name: 'study_year', label: 'Current academic year', maxLength: 80 },
  { name: 'professional_role', label: 'Professional role', maxLength: 140 },
  { name: 'organization', label: 'Organization or company', maxLength: 180 },
  { name: 'career_interests', label: 'Career interests', maxLength: 500 },
]

const EMPTY_PROFILE = {
  name: '', avatar_url: '', college_or_university: '', degree: '', department: '',
  study_year: '', professional_role: '', organization: '', career_interests: '', bio: '',
}

export function ProfilePage() {
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [draft, setDraft] = useState(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    profileApi.get()
      .then(({ user }) => {
        if (!active) return
        const loaded = { ...EMPTY_PROFILE, ...user, avatar_url: user.avatar_url || '' }
        setProfile(loaded)
        setDraft(loaded)
        updateUser(user)
      })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load your profile.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [updateUser])

  const cancelEdit = () => {
    setDraft(profile)
    setError('')
    setIsEditing(false)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!draft.name.trim()) {
      setError('Full name is required.')
      return
    }
    if (draft.avatar_url && !/^https?:\/\//i.test(draft.avatar_url)) {
      setError('Profile photo URL must start with https:// or http://.')
      return
    }
    setIsSaving(true)
    try {
      const { user } = await profileApi.update({
        name: draft.name,
        avatar_url: draft.avatar_url || null,
        ...Object.fromEntries(PROFILE_FIELDS.map(({ name }) => [name, draft[name]])),
        bio: draft.bio,
      })
      const savedProfile = { ...EMPTY_PROFILE, ...user, avatar_url: user.avatar_url || '' }
      setProfile(savedProfile)
      setDraft(savedProfile)
      updateUser(user)
      setIsEditing(false)
      setNotice('Profile saved.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="product-page">
      <ProductHeader />
      <section className="product-content page-wrap profile-content">
        <header className="product-page-heading profile-page-heading">
          <div><p className="eyebrow">Your account</p><h1>Profile</h1><p>A few details about you and the direction you are exploring.</p></div>
          {!isEditing && <button className="button button--quiet" type="button" onClick={() => { setNotice(''); setIsEditing(true) }}><Pencil size={15} /> Edit profile</button>}
        </header>
        {error && <div className="goals-error" role="alert"><p>{error}</p><button className="button button--quiet" type="button" onClick={() => window.location.reload()}>Try again</button></div>}
        {notice && <p className="profile-notice" role="status">{notice}</p>}
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading profile...</div>}
        {!isLoading && (isEditing || !error) && (isEditing ? (
          <form className="profile-editor" onSubmit={saveProfile}>
            <div className="profile-editor__grid">
              <label>Full name <span aria-hidden="true">*</span><input value={draft.name} maxLength={100} required onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Email address<input value={profile.email || ''} disabled readOnly /><small>Email is managed by your account sign-in.</small></label>
              <label className="profile-editor__wide">Profile photo URL <small>Optional. Existing avatar support is retained.</small><input type="url" value={draft.avatar_url} maxLength={2048} placeholder="https://" onChange={(event) => setDraft((current) => ({ ...current, avatar_url: event.target.value }))} /></label>
              {PROFILE_FIELDS.map(({ name, label, maxLength }) => <label key={name}>{label}<input value={draft[name] || ''} maxLength={maxLength} onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))} /></label>)}
              <label className="profile-editor__wide">Short biography<textarea rows={4} maxLength={1200} value={draft.bio || ''} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))} /></label>
            </div>
            {error && <p className="goal-form__error" role="alert">{error}</p>}
            <footer className="profile-editor__actions"><button className="button button--quiet" type="button" onClick={cancelEdit} disabled={isSaving}>Cancel</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save profile'}</button></footer>
          </form>
        ) : (
          <section className="profile-summary profile-summary--details" aria-label="Profile information">
            <span className="profile-summary__avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <CircleUserRound size={24} />}</span>
            <div className="profile-summary__details">
              <h2>{profile.name || 'Your profile'}</h2>
              <p>{profile.email || 'Email not available'}</p>
              <dl>
                {PROFILE_FIELDS.map(({ name, label }) => profile[name] && <div key={name}><dt>{label}</dt><dd>{profile[name]}</dd></div>)}
                {profile.bio && <div className="profile-summary__bio"><dt>About</dt><dd>{profile.bio}</dd></div>}
              </dl>
              {!PROFILE_FIELDS.some(({ name }) => profile[name]) && !profile.bio && <p className="profile-summary__empty"><UserRound size={16} /> Add a few details to personalize your profile.</p>}
            </div>
          </section>
        ))}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
    </main>
  )
}

export default ProfilePage