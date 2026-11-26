import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { KeyRound, LogOut, Pencil, Save, UserRound } from 'lucide-react'
import { doctorApi, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const emptyForm = profile => ({
  name: profile?.name || '',
  phone: profile?.phone || '',
  licenseNumber: profile?.licenseNumber || '',
  specialization: profile?.specialization || '',
  hospital: profile?.hospital || '',
  experienceYears: profile?.experienceYears || 0,
  about: profile?.about || '',
  avatarUrl: profile?.avatarUrl || '',
})

export default function DoctorProfile() {
  const { doctor, setDoctor } = useOutletContext()
  const { logout: logoutSession } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(doctor)
  const [form, setForm] = useState(() => emptyForm(doctor))
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(!doctor)
  const [saving, setSaving] = useState(false)
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    doctorApi.profile()
      .then(result => {
        if (!active) return
        setProfile(result.clinician)
        setForm(emptyForm(result.clinician))
        setDoctor(result.clinician)
      })
      .catch(reason => { if (active) setError(errMsg(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [setDoctor])

  const save = async event => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const result = await doctorApi.updateProfile({ ...form, experienceYears: Number(form.experienceYears) })
      setProfile(result.clinician)
      setForm(emptyForm(result.clinician))
      setDoctor(result.clinician)
      setEditing(false)
      setSuccess('Your doctor profile has been updated.')
    } catch (reason) { setError(errMsg(reason)) } finally { setSaving(false) }
  }

  const changePassword = async event => {
    event.preventDefault()
    setPasswordBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await doctorApi.changePassword(passwords)
      setPasswords({ currentPassword: '', newPassword: '' })
      setSuccess(result.message || 'Password updated.')
    } catch (reason) { setError(errMsg(reason)) } finally { setPasswordBusy(false) }
  }

  const logout = async () => {
    setError('')
    try {
      await logoutSession()
    } catch (reason) {
      setError(errMsg(reason))
    } finally {
      navigate('/login', { replace: true })
    }
  }

  if (loading) return <p role="status" className="health-panel p-6 text-sm text-navy-500">Loading doctor profile…</p>

  return (
    <div className="space-y-6">
      <header className="health-hero flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker flex items-center gap-2"><UserRound size={14} />Account</p><h1 className="mt-2 text-3xl">Doctor profile</h1><p className="mt-2 text-sm text-navy-500">Your professional details and account security.</p></div>
        {!editing && <button type="button" className="btn-primary" onClick={() => { setForm(emptyForm(profile)); setError(''); setEditing(true) }}><Pencil size={15} />Edit profile</button>}
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="health-panel p-5 sm:p-6">
          <div className="flex items-center gap-4 border-b border-ink/10 pb-5">
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt={`${profile.name} profile`} className="h-16 w-16 rounded-full object-cover" />
              : <span className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-lg font-bold text-blue-800">{(profile?.name || 'Doctor').split(/\s+/).map(item => item[0]).slice(0, 2).join('').toUpperCase()}</span>}
            <div className="min-w-0"><h2 className="truncate text-xl">{profile?.name}</h2><p className="truncate text-sm text-navy-500">{profile?.specialization}</p></div>
          </div>
          {editing ? <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <label className="text-xs font-semibold">Full name<input className="input mt-1" required minLength={2} maxLength={100} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
            <label className="text-xs font-semibold">Email<input className="input mt-1" type="email" value={profile?.email || ''} disabled /></label>
            <label className="text-xs font-semibold">Phone<input className="input mt-1" type="tel" maxLength={20} value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></label>
            <label className="text-xs font-semibold">Specialization<input className="input mt-1" required maxLength={120} value={form.specialization} onChange={event => setForm(current => ({ ...current, specialization: event.target.value }))} /></label>
            <label className="text-xs font-semibold">License / registration number<input className="input mt-1" required maxLength={60} value={form.licenseNumber} onChange={event => setForm(current => ({ ...current, licenseNumber: event.target.value }))} /></label>
            <label className="text-xs font-semibold">Hospital / clinic<input className="input mt-1" required maxLength={160} value={form.hospital} onChange={event => setForm(current => ({ ...current, hospital: event.target.value }))} /></label>
            <label className="text-xs font-semibold">Experience (years)<input className="input mt-1" type="number" min="0" max="80" step="1" value={form.experienceYears} onChange={event => setForm(current => ({ ...current, experienceYears: event.target.value }))} /></label>
            <label className="text-xs font-semibold">Profile photo URL<input className="input mt-1" type="url" maxLength={2000} value={form.avatarUrl} onChange={event => setForm(current => ({ ...current, avatarUrl: event.target.value }))} placeholder="https://…" /></label>
            <label className="text-xs font-semibold sm:col-span-2">About<textarea className="input mt-1 min-h-24" maxLength={2000} value={form.about} onChange={event => setForm(current => ({ ...current, about: event.target.value }))} /></label>
            <div className="flex flex-wrap gap-2 sm:col-span-2"><button className="btn-primary" type="submit" disabled={saving}><Save size={15} />{saving ? 'Saving…' : 'Save profile'}</button><button type="button" className="btn-outline" onClick={() => { setEditing(false); setForm(emptyForm(profile)); setError('') }}>Cancel</button></div>
          </form> : <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {[['Email', profile?.email], ['Phone', profile?.phone], ['Specialization', profile?.specialization], ['License / registration number', profile?.licenseNumber], ['Hospital / clinic', profile?.hospital], ['Experience', `${profile?.experienceYears || 0} years`]].map(([label, value]) => <div className="health-detail" key={label}><dt>{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value || 'Not provided'}</dd></div>)}
            <div className="health-detail sm:col-span-2"><dt>About</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{profile?.about || 'No biography has been added.'}</dd></div>
          </dl>}
        </section>

        <div className="space-y-5">
          <section className="health-panel p-5 sm:p-6">
            <div className="flex items-center gap-2"><KeyRound size={18} className="text-teal-700" /><div><p className="section-kicker">Account security</p><h2 className="text-xl">Change password</h2></div></div>
            <form className="mt-4 space-y-3" onSubmit={changePassword}>
              <label className="block text-xs font-semibold">Current password<input className="input mt-1" type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={event => setPasswords(current => ({ ...current, currentPassword: event.target.value }))} /></label>
              <label className="block text-xs font-semibold">New password<input className="input mt-1" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={passwords.newPassword} onChange={event => setPasswords(current => ({ ...current, newPassword: event.target.value }))} /><span className="mt-1 block font-normal text-navy-500">At least 12 characters.</span></label>
              <button type="submit" className="btn-outline" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button>
            </form>
          </section>
          <section className="health-panel flex flex-wrap items-center justify-between gap-3 p-5">
            <div><h2 className="font-semibold">Sign out</h2><p className="mt-1 text-xs text-navy-500">End this secure doctor session.</p></div>
            <button type="button" className="btn-outline text-red-700" onClick={logout}><LogOut size={15} />Log out</button>
          </section>
        </div>
      </div>
    </div>
  )
}
