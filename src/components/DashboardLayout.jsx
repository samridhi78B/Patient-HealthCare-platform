import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { LayoutGrid, FolderHeart, UserRound, LogOut, Menu, ChevronDown, CalendarDays, Activity, NotebookPen } from 'lucide-react'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { errMsg, profileApi } from '../api/client'
import LanguageSelector from './LanguageSelector.jsx'
import { useTranslation } from 'react-i18next'
const nav = [
  { to: '/overview', label: 'overview', icon: LayoutGrid },
  { to: '/profile', label: 'profile', icon: UserRound, group: 'account' },
  { to: '/health-metrics', label: 'healthMetrics', icon: Activity },
  { to: '/health-journal', label: 'symptomHistory', icon: NotebookPen },
  { to: '/health-timeline', label: 'trends', icon: Activity },
  { to: '/reports', label: 'reports', icon: FolderHeart },
  { to: '/appointments', label: 'appointments', icon: CalendarDays },
]
const titleKeys = { '/overview': 'nav.overview', '/reports': 'nav.reports', '/health-timeline': 'nav.trends', '/health-journal': 'nav.symptomHistory', '/health-metrics': 'nav.healthMetrics', '/appointments': 'nav.appointments', '/appointments/my': 'nav.appointments', '/profile': 'dashboard.profileTitle' }
export default function DashboardLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth(); const nav2 = useNavigate(); const loc = useLocation(); const toast = useToast()
  const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false)
  const [patientProfile, setPatientProfile] = useState(null); const [profileError, setProfileError] = useState('')
  const [gender, setGender] = useState('')
  const [displayName, setDisplayName] = useState(user.name)
  useEffect(() => {
    let active = true
    profileApi.get().then(({ profile }) => { if (active) { setPatientProfile(profile); setGender(profile.gender || ''); setDisplayName(profile.name || user.name) } })
      .catch(error => { if (active) setProfileError(errMsg(error)) })
    return () => { active = false }
  }, [user.name])
  useEffect(() => {
    const updateGender = event => {
      if (event.detail?.email === user.email.toLowerCase()) {
        setGender(event.detail.gender || '')
        if (event.detail.name) setDisplayName(event.detail.name)
      }
    }
    try {
      const saved = window.localStorage.getItem(`medlink-health-profile:${user.email.toLowerCase()}`)
      if (saved) setGender(JSON.parse(saved).gender || '')
    } catch {
      setProfileError(current => current || 'Saved gender preference is unavailable.')
    }
    window.addEventListener('medlink:health-profile-updated', updateGender)
    return () => window.removeEventListener('medlink:health-profile-updated', updateGender)
  }, [user.email])
  useEffect(() => {
    if (!loc.hash) return undefined
    const timer = window.setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    return () => window.clearTimeout(timer)
  }, [loc.hash, loc.pathname])
  const isNavActive = to => loc.pathname === to || loc.pathname.startsWith(`${to}/`)
  const patientAge = patientProfile?.dateOfBirth ? (() => {
    const birth = new Date(`${String(patientProfile.dateOfBirth).slice(0, 10)}T12:00:00`)
    const now = new Date()
    return now.getFullYear() - birth.getFullYear() - (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) ? 1 : 0)
  })() : null
  const out = async () => { try { await logout() } finally { toast.success('You have been logged out'); nav2('/login', { replace: true }) } }
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const genderKeys = { Female: 'common.genderFemale', Male: 'common.genderMale', 'Non-binary': 'common.genderNonBinary', 'Prefer not to say': 'common.genderNotSay' }
  const displayedGender = genderKeys[gender] ? t(genderKeys[gender]) : gender
  return (
    <div className="min-h-screen bg-ivory lg:pl-64">
      {open && <button type="button" className="fixed inset-0 z-30 cursor-default bg-ink/50 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-ink/10 px-4 py-6 transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="px-2"><Logo to="/overview" /></div>
        <p className="mt-2 px-2 text-[11px] tracking-wide text-navy-500">{t('auth.brandTagline')}</p>
        <section className="mt-5 rounded-xl border border-ink/10 bg-sage-100/40 p-3" aria-label="Patient profile summary">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="truncate text-[10px] text-navy-500">Patient ID · {user.id || user._id || '—'}</p></div>
          </div>
          <p className="mt-2 text-[10px] text-navy-500">{t('dashboard.age')} · {patientAge === null ? t('dashboard.notProvided') : `${patientAge}`} <span className="mx-1">·</span> {t('dashboard.gender')} · {displayedGender || t('dashboard.notProvided')}</p>
          {profileError && <p className="mt-2 text-[10px] text-red-700">Profile summary unavailable: {profileError}</p>}
          <Link to="/profile" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><UserRound size={13} />{t('nav.editProfile')}</Link>
        </section>
        <nav className="mt-6" aria-label="Main">
          <p className="nav-section">{t('nav.workspace')}</p>
          <div className="space-y-1">{nav.filter(item => !item.group).map(({ to, label, icon: I }) => (<Link key={to} to={to} aria-current={isNavActive(to) ? 'page' : undefined} onClick={() => setOpen(false)} className="app-sidebar-link flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-navy-500 transition"><I size={18} strokeWidth={1.8} />{t(`nav.${label}`)}</Link>))}</div>
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="px-3 pb-3 text-xs text-navy-500">{t('home.privateSpace')}</p>
          <button onClick={out} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-navy-500 transition hover:bg-sage-100 hover:text-ink"><LogOut size={18} />{t('nav.logout')}</button>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex min-h-[76px] items-center gap-3 border-b border-ink/10 bg-ivory/95 px-4 backdrop-blur-md lg:px-8">
        <button className="rounded-md p-2 hover:bg-teal-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div><p className="text-[11px] text-navy-500"><Link to="/overview" className="hover:text-teal-700">MediLink</Link><span className="mx-2 text-ink/30">/</span>{t(titleKeys[loc.pathname] || 'nav.appointments')}</p><h2 className="font-display text-lg font-semibold leading-tight">{t(titleKeys[loc.pathname] || 'nav.appointments')}</h2></div>
        <LanguageSelector />
        <ThemeToggle />
        <div className="hidden items-center gap-2 border-l border-ink/10 pl-5 text-sm md:flex"><span className="text-navy-500">Good to see you,</span><span className="font-semibold text-navy-900">{displayName.split(' ')[0]}</span></div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-teal-50" aria-haspopup="menu" aria-expanded={menu}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-900">{initials}</span><ChevronDown size={14} /></button>
          {menu && (<div role="menu" className="panel absolute right-0 mt-2 w-52 p-1.5 text-sm">
            <p className="truncate px-3 py-2 text-xs text-navy-500">{user.email}</p>
            <Link role="menuitem" to="/profile" onClick={() => setMenu(false)} className="block rounded-md px-3 py-2 hover:bg-teal-50">{t('nav.profile')}</Link>
            <button role="menuitem" onClick={out} className="block w-full rounded-md px-3 py-2 text-left hover:bg-teal-50">{t('nav.logout')}</button></div>)}
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 lg:p-8"><Outlet /></main>
    </div>)
}
