import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell, Field, Submit, Alert } from '../components/AuthForm.jsx'
import { authApi, errMsg } from '../api/client'
import { useTranslation } from 'react-i18next'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const validate = (f, t = key => key) => {
  const e = {}
  if (f.name.trim().length < 2) e.name = t('auth.validation.name')
  if (!EMAIL.test(f.email.trim())) e.email = t('auth.validation.email')
  if (!/^\+?[\d\s-]{10,15}$/.test(f.phone)) e.phone = t('auth.validation.phone')
  if (f.password.length < 8 || !/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password)) e.password = t('auth.validation.password')
  if (f.confirm !== f.password) e.confirm = t('auth.validation.passwordMismatch')
  if (!f.terms) e.terms = t('auth.validation.terms')
  return e
}
export default function Register() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '', terms: false })
  const [err, setErr] = useState({}); const [loading, setLoading] = useState(false); const [apiErr, setApiErr] = useState(''); const [ok, setOk] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async e => {
    e.preventDefault(); setApiErr(''); const v = validate(f, t); setErr(v); if (Object.keys(v).length) return
    setLoading(true)
    try { await authApi.register({ name: f.name, email: f.email.trim(), phone: f.phone, password: f.password }); setOk(t('auth.accountCreated')); setTimeout(() => nav('/login', { state: { registered: true } }), 1200) }
    catch (x) { setApiErr(errMsg(x)) } finally { setLoading(false) }
  }
  return (<AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
    <form onSubmit={submit} noValidate className="mt-7 space-y-4">
      <Alert>{apiErr}</Alert><Alert type="ok">{ok}</Alert>
      <Field id="name" label={t('auth.fullName')} autoComplete="name" value={f.name} onChange={set('name')} error={err.name} />
      <Field id="email" label={t('auth.email')} type="email" autoComplete="email" value={f.email} onChange={set('email')} error={err.email} />
      <Field id="phone" label={t('auth.phone')} type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={err.phone} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="password" label={t('auth.password')} secret autoComplete="new-password" value={f.password} onChange={set('password')} error={err.password} />
        <Field id="confirm" label={t('auth.confirmPassword')} secret autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={err.confirm} /></div>
      <div><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-teal-600" checked={f.terms} onChange={set('terms')} />
        <span>{t('auth.acceptTerms')}</span></label>{err.terms && <p className="mt-1 text-xs text-red-600">{err.terms}</p>}</div>
      <Submit loading={loading}>{loading ? t('auth.creatingAccount') : t('nav.createAccount')}</Submit>
      <p className="text-center text-sm text-navy-500">{t('auth.alreadyHaveAccount')} <Link to="/login" className="font-semibold text-teal-700">{t('nav.login')}</Link></p>
    </form></AuthShell>)
}
