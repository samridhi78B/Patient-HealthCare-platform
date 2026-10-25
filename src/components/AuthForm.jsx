import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Logo from './Logo.jsx'
export const AuthShell = ({ title, subtitle, children }) => (
  <div className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
    <aside className="hidden flex-col justify-between auth-aside bg-teal-900 p-12 text-ivory lg:flex">
      <Logo light />
      <div><p className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">Every report you have ever been given, in one <span className="text-lime">private</span> place.</p>
        <p className="mt-5 max-w-sm text-sm text-white/70">Files are stored privately and are only ever served to the account that uploaded them.</p></div>
      <p className="eyebrow !text-white/60">MedLink · college project, first evaluation build</p>
    </aside>
    <main className="grid place-items-center bg-ivory px-5 py-10"><div className="w-full max-w-md">
      <div className="mb-8 lg:hidden"><Logo /></div>
      <h1 className="text-5xl">{title}</h1><p className="mt-3 text-navy-500">{subtitle}</p>{children}</div></main>
  </div>)
export const Field = ({ label, error, id, secret, ...p }) => {
  const [show, setShow] = useState(false)
  return (<div><label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">{label}</label>
    <div className="relative"><input id={id} {...p} type={secret ? (show ? 'text' : 'password') : p.type} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} className={`input ${secret ? 'pr-11' : ''} ${error ? '!border-red-400' : ''}`} />
      {secret && <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>}</div>
    {error && <p id={`${id}-e`} className="mt-1 text-xs text-red-600">{error}</p>}</div>)
}
export const Submit = ({ loading, children }) => (<button className="btn-primary w-full py-3" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}{children}</button>)
export const Alert = ({ type = 'error', children }) => children ? (<div role="alert" className={`rounded-lg border px-3.5 py-2.5 text-sm ${type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-teal-200 bg-teal-50 text-teal-700'}`}>{children}</div>) : null
