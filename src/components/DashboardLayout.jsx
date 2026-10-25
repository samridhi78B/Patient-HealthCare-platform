import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { LayoutGrid, FolderHeart, UserRound, LogOut, Menu, ChevronDown } from 'lucide-react'
import Logo from './Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
const nav = [{ to: '/overview', label: 'Overview', icon: LayoutGrid }, { to: '/reports', label: 'My Medical Reports', icon: FolderHeart }, { to: '/profile', label: 'Profile', icon: UserRound }]
const titles = { '/overview': 'Overview', '/reports': 'My Medical Reports', '/profile': 'Profile' }
export default function DashboardLayout() {
  const { user, logout } = useAuth(); const nav2 = useNavigate(); const loc = useLocation(); const toast = useToast()
  const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false)
  const out = async () => { try { await logout() } finally { toast.success('You have been logged out'); nav2('/login', { replace: true }) } }
  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="min-h-screen bg-ivory lg:pl-64">
      {open && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-teal-900 px-4 py-5 transition-transform lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="px-2"><Logo light to="/overview" /></div>
        <nav className="mt-9 space-y-1" aria-label="Main">
          {nav.map(({ to, label, icon: I }) => (<NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-white shadow-[inset_2px_0_0_rgb(var(--lime))]' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}><I size={18} />{label}</NavLink>))}
        </nav>
        <button onClick={out} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"><LogOut size={18} />Logout</button>
      </aside>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink/15 bg-ivory px-4 py-3 lg:px-8">
        <button className="rounded-lg p-2 hover:bg-teal-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div><p className="text-xs text-navy-500"><Link to="/overview" className="hover:text-teal-700">MedLink</Link> / {titles[loc.pathname]}</p><h2 className="font-display text-xl font-semibold leading-tight">{titles[loc.pathname]}</h2></div>
        <p className="ml-auto hidden text-sm text-navy-500 md:block">Hello, <span className="font-semibold text-navy-900">{user.name.split(' ')[0]}</span></p>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-teal-50" aria-haspopup="menu" aria-expanded={menu}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{initials}</span><ChevronDown size={14} /></button>
          {menu && (<div role="menu" className="panel absolute right-0 mt-2 w-52 p-1.5 text-sm">
            <p className="truncate px-3 py-2 text-xs text-navy-500">{user.email}</p>
            <Link role="menuitem" to="/profile" onClick={() => setMenu(false)} className="block rounded-md px-3 py-2 hover:bg-teal-50">Profile</Link>
            <button role="menuitem" onClick={out} className="block w-full rounded-md px-3 py-2 text-left hover:bg-teal-50">Logout</button></div>)}
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 lg:p-8"><Outlet /></main>
    </div>)
}
