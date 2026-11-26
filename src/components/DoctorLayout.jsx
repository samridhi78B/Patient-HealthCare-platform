import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, FileHeart, LayoutGrid, LogOut, Menu, Stethoscope, UserRound, Users } from 'lucide-react'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { doctorApi, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const links = [
  { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/doctor/patients', label: 'Patients', icon: Users },
  { to: '/doctor/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/doctor/reports', label: 'Reports', icon: FileHeart },
  { to: '/doctor/profile', label: 'Profile', icon: UserRound },
]

export default function DoctorLayout() {
  const { logout: logoutSession } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    doctorApi.profile()
      .then(result => { if (active) setDoctor(result.clinician) })
      .catch(error => { if (active) setProfileError(errMsg(error)) })
    return () => { active = false }
  }, [])

  const logout = async () => {
    setLoggingOut(true)
    try {
      await logoutSession()
    } catch (error) {
      setProfileError(errMsg(error))
    } finally {
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }
  const initials = (doctor?.name || 'Doctor').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()
  const title = links.find(item => item.to === location.pathname)?.label || (location.pathname.includes('/patients/') ? 'Patient profile' : 'Doctor workspace')

  return (
    <div className="min-h-screen bg-ivory lg:pl-64">
      {open && <button type="button" className="fixed inset-0 z-30 cursor-default bg-ink/50 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-ink/10 px-4 py-6 transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="px-2"><Logo to="/doctor/dashboard" /></div>
        <p className="mt-2 px-2 text-[11px] tracking-wide text-navy-500">Doctor workspace</p>
        <section className="mt-5 rounded-xl border border-ink/10 bg-sage-100/40 p-3" aria-label="Doctor profile summary">
          <div className="flex items-center gap-3">
            {doctor?.avatarUrl
              ? <img src={doctor.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials}</span>}
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{doctor?.name || 'Doctor'}</p><p className="truncate text-[10px] text-navy-500">{doctor?.specialization || 'Clinician'}</p></div>
          </div>
          <p className="mt-2 truncate text-[10px] text-navy-500">{doctor?.hospital || 'Hospital / clinic'}</p>
          <Link to="/doctor/profile" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><UserRound size={13} />Edit profile</Link>
        </section>
        <nav className="mt-6" aria-label="Doctor navigation">
          <p className="nav-section">Workspace</p>
          <div className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/doctor/dashboard'} onClick={() => setOpen(false)}
                className={({ isActive }) => `app-sidebar-link flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${isActive ? '' : 'text-navy-500'}`}>
                <Icon size={18} strokeWidth={1.8} />{label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="mt-auto border-t border-ink/10 pt-4">
          <p className="px-3 pb-3 text-xs text-navy-500">Secure clinical workspace</p>
          <button type="button" disabled={loggingOut} onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-navy-500 transition hover:bg-sage-100 hover:text-ink"><LogOut size={18} />{loggingOut ? 'Signing out…' : 'Log out'}</button>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex min-h-[76px] items-center gap-3 border-b border-ink/10 bg-ivory/95 px-4 backdrop-blur-md lg:px-8">
        <button className="rounded-md p-2 hover:bg-teal-50 lg:hidden" type="button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div className="min-w-0 flex-1"><p className="text-[11px] text-navy-500"><Link to="/doctor/dashboard" className="hover:text-teal-700">MediLink</Link><span className="mx-2 text-ink/30">/</span>{title}</p><h2 className="font-display text-lg font-semibold leading-tight">{title}</h2></div>
        <ThemeToggle />
        <div className="hidden items-center gap-2 border-l border-ink/10 pl-5 text-sm md:flex"><Stethoscope size={16} className="text-teal-700" /><span className="font-semibold text-navy-900">{doctor?.name || 'Doctor'}</span></div>
        {doctor?.avatarUrl
          ? <img className="h-9 w-9 rounded-full object-cover" alt={`${doctor.name} profile`} src={doctor.avatarUrl} />
          : <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-900">{initials}</span>}
      </header>
      {profileError && <p role="alert" className="mx-4 mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 lg:mx-8">Doctor profile unavailable: {profileError}</p>}
      <main className="mx-auto max-w-6xl p-4 lg:p-8"><Outlet context={{ doctor, setDoctor }} /></main>
    </div>
  )
}
