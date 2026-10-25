import { Link } from 'react-router-dom'
export default function Logo({ light, to = '/' }) {
  return (<Link to={to} className="flex items-center gap-2.5" aria-label="MedLink home">
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" className="fill-teal-700" /><path d="M16 7.5v17M7.5 16h17" stroke="#f7f4ec" strokeWidth="2.6" strokeLinecap="round" /><circle cx="16" cy="16" r="2.7" fill="#c9e9d8" /></svg>
    <span className={`font-display text-[21px] font-bold tracking-tight ${light ? 'text-ivory' : 'text-ink'}`}>MedLink <span className={`text-[10px] font-semibold uppercase tracking-[.16em] ${light ? 'text-white/55' : 'text-teal-700'}`}>AI</span></span></Link>)
}
