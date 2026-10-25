import { Link } from 'react-router-dom'
export default function Logo({ light, to = '/' }) {
  return (<Link to={to} className="flex items-center gap-2.5" aria-label="MedLink home">
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="3" className="fill-teal-700" /><path d="M16 7v18M7 16h18" stroke="#f6f2e8" strokeWidth="3.4" strokeLinecap="round" /><circle cx="16" cy="16" r="3" fill="#c6f24a" /></svg>
    <span className={`font-display text-[22px] font-bold tracking-tight ${light ? 'text-ivory' : 'text-ink'}`}>MedLink</span></Link>)
}
