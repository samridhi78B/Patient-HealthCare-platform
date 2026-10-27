import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CalendarDays, FileHeart, Pencil, ShieldCheck, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { errMsg, measurementsApi, profileApi } from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const emptyForm = (profile, user) => ({
  name: profile?.name || user.name,
  phone: profile?.phone || user.phone || '',
  dateOfBirth: profile?.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
  gender: profile?.gender || '',
  address: profile?.address || '',
  bloodGroup: profile?.bloodGroup || '',
  allergies: Array.isArray(profile?.allergies) ? profile.allergies.join('\n') : '',
  medicalConditions: Array.isArray(profile?.medicalConditions) ? profile.medicalConditions.join('\n') : '',
  currentMedications: Array.isArray(profile?.currentMedications) ? profile.currentMedications.join('\n') : '',
  medicalNotes: profile?.medicalNotes || '',
  emergencyContacts: profile?.emergencyContacts || [],
  emergencyName: profile?.emergencyContacts?.[0]?.name || '',
  emergencyRelationship: profile?.emergencyContacts?.[0]?.relationship || '',
  emergencyPhone: profile?.emergencyContacts?.[0]?.phone || '',
})
const ageFromDate = dateValue => {
  if (!dateValue) return null
  const birth = new Date(`${String(dateValue).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return null
  const now = new Date()
  return now.getFullYear() - birth.getFullYear() - (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) ? 1 : 0)
}
const ListDetail = ({ title, values, empty }) => <div className="health-detail min-h-24"><p>{title}</p>{values?.length ? <ul className="mt-2 space-y-1 text-sm text-navy-700">{values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}</ul> : <span className="mt-2 block text-sm text-navy-500">{empty}</span>}</div>

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => emptyForm(null, user))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [gender, setGender] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    Promise.allSettled([profileApi.get(), measurementsApi.list()])
      .then(([profileResult, measurementsResult]) => {
        if (!active) return
        const failures = []
        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value.profile)
          setGender(profileResult.value.profile.gender || '')
          setForm(emptyForm(profileResult.value.profile, user))
        } else failures.push(errMsg(profileResult.reason))
        if (measurementsResult.status === 'fulfilled') setMeasurements(measurementsResult.value.measurements)
        else failures.push(errMsg(measurementsResult.reason))
        if (failures.length) setLoadError(failures.join(' · '))
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry, user])

  const age = useMemo(() => ageFromDate(profile?.dateOfBirth), [profile?.dateOfBirth])
  const latest = measurements.at(-1)
  const bmi = latest?.heightCm > 0 && latest?.weightKg > 0 ? latest.weightKg / ((latest.heightCm / 100) ** 2) : null
  const bmiContext = age !== null && age < 20 ? 'common.bmiPediatric' : age === null ? 'dashboard.ageUnknownBmi' : 'dashboard.adultBmi'
  const initials = (profile?.name || user.name).split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()
  const genderKeys = { Female: 'common.genderFemale', Male: 'common.genderMale', 'Non-binary': 'common.genderNonBinary', 'Prefer not to say': 'common.genderNotSay' }
  const genderLabel = genderKeys[gender] ? t(genderKeys[gender]) : gender
  const updateField = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

  const saveProfile = async event => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (form.name.trim().length < 2 || form.name.trim().length > 80) { setError(t('auth.validation.name')); return }
    if (form.phone.replace(/\D/g, '').length < 10 || form.phone.replace(/\D/g, '').length > 15) { setError(t('auth.validation.phone')); return }
    if (Boolean(form.emergencyName.trim()) !== Boolean(form.emergencyPhone.trim())) { setError(t('dashboard.emergencyError')); return }
    const contacts = form.emergencyName.trim()
      ? [{ name: form.emergencyName.trim(), relationship: form.emergencyRelationship.trim(), phone: form.emergencyPhone.trim() }, ...form.emergencyContacts.slice(1)]
      : form.emergencyContacts.slice(1)
    setSaving(true)
    try {
      const { profile: updated } = await profileApi.update({
        name: form.name.trim(), phone: form.phone.trim(), dateOfBirth: form.dateOfBirth, gender: form.gender,
        address: form.address, bloodGroup: form.bloodGroup,
        allergies: form.allergies.split('\n').map(item => item.trim()).filter(Boolean),
        medicalConditions: form.medicalConditions.split('\n').map(item => item.trim()).filter(Boolean),
        currentMedications: form.currentMedications.split('\n').map(item => item.trim()).filter(Boolean),
        emergencyContacts: contacts, medicalNotes: form.medicalNotes,
      })
      setProfile(updated)
      setForm(emptyForm(updated, { ...user, name: updated.name }))
      setEditing(false)
      setGender(updated.gender || '')
      setSuccess(t('dashboard.profileSaved'))
      window.dispatchEvent(new CustomEvent('medlink:health-profile-updated', { detail: { email: user.email.toLowerCase(), gender: updated.gender || '', name: updated.name } }))
    } catch (saveError) {
      setError(saveError.response?.data?.message || t('dashboard.profileSaveError'))
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <header className="health-hero flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker flex items-center gap-2"><UserRound size={14} />{t('nav.profile')}</p><h1 className="mt-2 text-3xl">{t('dashboard.profileTitle')}</h1><p className="mt-2 text-sm text-navy-500">{t('dashboard.profileSubtitle')}</p></div>
        <button type="button" className="btn-primary" onClick={() => { setForm(emptyForm(profile, user)); setError(''); setEditing(true) }}><Pencil size={15} />{t('dashboard.editHealthProfile')}</button>
      </header>
      {loadError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{t('common.error')} {loadError} <button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>{t('common.retry')}</button></p>}
      {success && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}
      {loading ? <p role="status" className="health-panel p-5 text-sm text-navy-500">{t('dashboard.loading')}</p> : (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <section className="health-panel p-5 sm:p-6">
            <div className="flex items-center gap-4 border-b border-ink/10 pb-5"><span className="grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-lg font-bold text-blue-800">{initials}</span><div className="min-w-0"><h2 className="truncate text-xl">{profile?.name || user.name}</h2><p className="truncate text-sm text-navy-500">{user.email}</p></div></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="health-detail"><p>{t('dashboard.fullName')}</p><strong>{profile?.name || user.name}</strong></div>
              <div className="health-detail"><p>{t('dashboard.age')}</p><strong>{age === null ? t('dashboard.notProvided') : age}</strong></div>
              <div className="health-detail"><p>{t('dashboard.gender')}</p><strong>{genderLabel || t('dashboard.notProvided')}</strong></div>
              <div className="health-detail"><p>{t('dashboard.bloodGroup')}</p><strong>{profile?.bloodGroup || t('dashboard.notProvided')}</strong></div>
              <div className="health-detail col-span-2"><p>{t('common.dateOfBirth')}</p><strong>{profile?.dateOfBirth ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(new Date(`${String(profile.dateOfBirth).slice(0, 10)}T12:00:00`)) : t('dashboard.notProvided')}</strong></div>
              <div className="health-detail col-span-2"><p>{t('dashboard.emergencyContact')}</p><strong>{profile?.emergencyContacts?.[0] ? `${profile.emergencyContacts[0].name} · ${profile.emergencyContacts[0].phone}` : t('dashboard.notProvided')}</strong></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/health-metrics" className="btn-outline"><Activity size={15} />{t('nav.healthMetrics')}</Link>
              <Link to="/reports" className="btn-outline"><FileHeart size={15} />{t('nav.reports')}</Link>
              <Link to="/appointments" className="btn-outline"><CalendarDays size={15} />{t('nav.appointments')}</Link>
            </div>
          </section>

          <section className="space-y-5">
            <div className="health-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="section-kicker">{t('dashboard.healthMetrics')}</p><h2 className="mt-1 text-xl">{t('dashboard.personalDetails')}</h2></div><Link to="/health-metrics" aria-label={t('nav.healthMetrics')} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"><Activity size={18} /></Link></div>
              {latest ? <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="health-detail"><p>{t('dashboard.height')}</p><strong>{latest.heightCm.toFixed(1)} cm</strong></div>
                <div className="health-detail"><p>{t('dashboard.weight')}</p><strong>{latest.weightKg.toFixed(1)} kg</strong></div>
                <div className="health-detail"><p>{t('dashboard.bmi')}</p><strong>{bmi?.toFixed(1) ?? '—'}</strong></div>
                <p className="col-span-full text-xs leading-5 text-navy-500">{t(bmiContext)} {t('common.bmiScreening')}</p>
              </div>               : <p className="mt-4 rounded-xl bg-sage-100/50 p-4 text-sm text-navy-500">{t('common.noData')} <Link className="font-semibold text-blue-700 underline" to="/health-metrics">{t('nav.healthMetrics')}</Link></p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ListDetail title={t('dashboard.allergies')} values={profile?.allergies} empty={t('dashboard.noneRecorded')} />
              <ListDetail title={t('dashboard.conditions')} values={profile?.medicalConditions} empty={t('dashboard.noneRecorded')} />
              <ListDetail title={t('dashboard.medications')} values={profile?.currentMedications} empty={t('dashboard.noneRecorded')} />
              <div className="health-detail min-h-24"><p>{t('dashboard.address')}</p><span className="mt-2 block text-sm text-navy-700">{profile?.address || t('dashboard.notProvided')}</span></div>
            </div>
            <p className="flex items-start gap-2 rounded-xl border border-ink/10 bg-white/70 p-4 text-xs leading-5 text-navy-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-blue-700" />{t(bmiContext)} {t('common.bmiScreening')}</p>
          </section>
        </div>
      )}

      {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(false) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" className="health-panel max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 sm:p-7">
          <h2 id="profile-edit-title" className="text-2xl">{t('dashboard.editHealthProfile')}</h2>
          <p className="mt-1 text-sm text-navy-500">{t('dashboard.personalDetails')}</p>
          <form className="mt-5 space-y-4" onSubmit={saveProfile}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">{t('dashboard.fullName')}<input className="input mt-1" name="name" required minLength="2" maxLength="80" value={form.name} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('auth.phone')}<input className="input mt-1" name="phone" type="tel" required value={form.phone} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('common.dateOfBirth')}<input className="input mt-1" name="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('dashboard.gender')}<select className="input mt-1" name="gender" value={form.gender} onChange={updateField}><option value="">{t('dashboard.notProvided')}</option><option value="Female">{t('common.genderFemale')}</option><option value="Male">{t('common.genderMale')}</option><option value="Non-binary">{t('common.genderNonBinary')}</option><option value="Prefer not to say">{t('common.genderNotSay')}</option></select></label>
              <label className="text-xs font-semibold">{t('dashboard.bloodGroup')}<select className="input mt-1" name="bloodGroup" value={form.bloodGroup} onChange={updateField}><option value="">{t('dashboard.notProvided')}</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => <option key={type}>{type}</option>)}</select></label>
              <label className="text-xs font-semibold sm:col-span-2">{t('dashboard.address')}<input className="input mt-1" name="address" maxLength="500" value={form.address} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('dashboard.allergies')}<textarea className="input mt-1 min-h-20" name="allergies" value={form.allergies} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('dashboard.conditions')}<textarea className="input mt-1 min-h-20" name="medicalConditions" value={form.medicalConditions} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('dashboard.medications')}<textarea className="input mt-1 min-h-20" name="currentMedications" value={form.currentMedications} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('dashboard.medicalNotes')}<textarea className="input mt-1 min-h-20" name="medicalNotes" maxLength="5000" value={form.medicalNotes} onChange={updateField} /></label>
              <label className="text-xs font-semibold">{t('dashboard.emergencyContact')}<input className="input mt-1" name="emergencyName" value={form.emergencyName} onChange={updateField} placeholder={t('dashboard.fullName')} /></label>
              <label className="text-xs font-semibold">{t('dashboard.relationship')}<input className="input mt-1" name="emergencyRelationship" value={form.emergencyRelationship} onChange={updateField} /></label>
              <label className="text-xs font-semibold sm:col-span-2">{t('auth.phone')}<input className="input mt-1" name="emergencyPhone" type="tel" value={form.emergencyPhone} onChange={updateField} /></label>
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-4"><button type="button" className="btn-outline" onClick={() => setEditing(false)}>{t('dashboard.cancel')}</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? t('metrics.saving') : t('dashboard.saveChanges')}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}
