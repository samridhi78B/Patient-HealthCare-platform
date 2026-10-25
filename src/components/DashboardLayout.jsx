import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { LayoutGrid, FolderHeart, UserRound, LogOut, Menu, ChevronDown, CalendarDays } from 'lucide-react'
import Logo from './Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
const nav = [{ to: '/overview', label: 'Overview', icon: LayoutGrid }, { to: '/reports', label: 'Medical reports', icon: FolderHeart }, { to: '/appointments', label: 'Appointments', icon: CalendarDays }, { to: '/profile', label: 'Profile', icon: UserRound }]
const titles = { '/overview': 'Overview', '/reports': 'My Medical Reports', '/appointments': 'Appointments', '/appointments/my': 'My Appointments', '/profile': 'Profile' }
export default function DashboardLayout() {
  const { user, logout } = useAuth(); const nav2 = useNavigate(); const loc = useLocation(); const toast = useToast()
  const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false)
  const out = async () => { try { await logout() } finally { toast.success('You have been logged out'); nav2('/login', { replace: true }) } }
  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="min-h-screen bg-ivory lg:pl-64">
      {open && <button type="button" className="fixed inset-0 z-30 cursor-default bg-ink/50 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-teal-900 px-4 py-6 transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="px-2"><Logo light to="/overview" /></div>
        <p className="mt-2 px-2 text-[11px] tracking-wide text-white/45">Your care, thoughtfully organized</p>
        <nav className="mt-6" aria-label="Main">
          <p className="nav-section">Workspace</p>
          <div className="space-y-1">{nav.slice(0, 3).map(({ to, label, icon: I }) => (<NavLink key={to} to={to} onClick={() => setOpen(false)} className="app-sidebar-link flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"><I size={18} strokeWidth={1.8} />{label}</NavLink>))}</div>
          <p className="nav-section">Account</p>
          {nav.slice(3).map(({ to, label, icon: I }) => (<NavLink key={to} to={to} onClick={() => setOpen(false)} className="app-sidebar-link flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"><I size={18} strokeWidth={1.8} />{label}</NavLink>))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="px-3 pb-3 text-xs text-white/45">A private space for your health records.</p>
          <button onClick={out} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"><LogOut size={18} />Log out</button>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex min-h-[76px] items-center gap-3 border-b border-ink/10 bg-ivory/95 px-4 backdrop-blur-md lg:px-8">
        <button className="rounded-md p-2 hover:bg-teal-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div><p className="text-[11px] text-navy-500"><Link to="/overview" className="hover:text-teal-700">MedLink AI</Link><span className="mx-2 text-ink/30">/</span>{titles[loc.pathname] || 'Appointments'}</p><h2 className="font-display text-lg font-semibold leading-tight">{titles[loc.pathname] || 'Appointments'}</h2></div>
        <div className="ml-auto hidden items-center gap-2 border-l border-ink/10 pl-5 text-sm md:flex"><span className="text-navy-500">Good to see you,</span><span className="font-semibold text-navy-900">{user.name.split(' ')[0]}</span></div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-teal-50" aria-haspopup="menu" aria-expanded={menu}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-900">{initials}</span><ChevronDown size={14} /></button>
          {menu && (<div role="menu" className="panel absolute right-0 mt-2 w-52 p-1.5 text-sm">
            <p className="truncate px-3 py-2 text-xs text-navy-500">{user.email}</p>
            <Link role="menuitem" to="/profile" onClick={() => setMenu(false)} className="block rounded-md px-3 py-2 hover:bg-teal-50">Profile</Link>
            <button role="menuitem" onClick={out} className="block w-full rounded-md px-3 py-2 text-left hover:bg-teal-50">Logout</button></div>)}
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 lg:p-8"><Outlet /></main>
    </div>)
}
