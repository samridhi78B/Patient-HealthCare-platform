import { useState } from 'react'
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import LanguageSelector from './LanguageSelector.jsx'
import { useTranslation } from 'react-i18next'
export const AuthShell = ({ title, subtitle, children }) => (
  <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
    <aside className="auth-aside hidden min-h-screen flex-col justify-between p-10 text-ivory lg:flex xl:p-14">
      <AuthBrand />
      <div className="relative z-10 max-w-xl">
        <AuthHero />
        <div className="mt-8 grid max-w-sm grid-cols-2 gap-3">
          <AuthFeature icon={ShieldCheck} title="privateAccess" detail="signedInAccount" />
          <AuthFeature icon={LockKeyhole} title="yourWorkspace" detail="reportsAppointments" />
        </div>
      </div>
      <AuthFooter />
    </aside>
    <main className="relative grid place-items-center bg-ivory px-5 py-10 sm:px-8"><div className="absolute right-5 top-5 flex items-center gap-2"><LanguageSelector /><ThemeToggle /></div><div className="w-full max-w-md">
      <div className="mb-8 lg:hidden"><Logo /></div>
      <AuthHeading title={title} subtitle={subtitle} />{children}</div></main>
  </div>)
function AuthBrand() {
  const { t } = useTranslation()
  return <div className="relative z-10"><Logo light /><p className="mt-2 pl-11 text-[11px] tracking-wide text-white/50">{t('auth.brandTagline')}</p></div>
}
function AuthHero() {
  const { t } = useTranslation()
  return <><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-100">{t('auth.privateWorkspace')}</p>
    <p className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">{t('auth.heroTitle')} <span className="text-teal-100">{t('auth.heroEmphasis')}</span></p>
    <p className="mt-5 max-w-md text-sm leading-6 text-white/65">{t('auth.heroDescription')}</p></>
}
function AuthFeature({ icon: Icon, title, detail }) {
  const { t } = useTranslation()
  return <div className="border border-white/15 bg-white/5 p-4"><Icon size={19} className="text-teal-100" /><p className="mt-3 text-sm font-semibold">{t(`auth.${title}`)}</p><p className="mt-1 text-xs text-white/55">{t(`auth.${detail}`)}</p></div>
}
function AuthFooter() {
  const { t } = useTranslation()
  return <p className="relative z-10 text-xs text-white/45">{t('auth.footer')}</p>
}
function AuthHeading({ title, subtitle }) {
  const { t } = useTranslation()
  return <div className="mb-7"><p className="section-kicker">{t('auth.welcome')}</p><h1 className="mt-2 text-4xl sm:text-5xl">{title}</h1><p className="mt-3 text-sm leading-6 text-navy-500">{subtitle}</p></div>
}
export const Field = ({ label, error, id, secret, ...p }) => {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  return (<div><label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">{label}</label>
    <div className="relative"><input id={id} {...p} type={secret ? (show ? 'text' : 'password') : p.type} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} className={`input ${secret ? 'pr-11' : ''} ${error ? '!border-red-400' : ''}`} />
      {secret && <button type="button" onClick={() => setShow(!show)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>}</div>
    {error && <p id={`${id}-e`} className="mt-1 text-xs text-red-600">{error}</p>}</div>)
}
export const Submit = ({ loading, children }) => (<button className="btn-primary w-full py-3" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}{children}</button>)
export const Alert = ({ type = 'error', children }) => children ? (<div role="alert" className={`rounded-lg border px-3.5 py-2.5 text-sm ${type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-teal-200 bg-teal-50 text-teal-700'}`}>{children}</div>) : null
