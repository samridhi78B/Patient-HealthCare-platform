import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell, Field, Submit, Alert } from '../components/AuthForm.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { errMsg } from '../api/client'
import { useTranslation } from 'react-i18next'
export default function Login() {
  const { t } = useTranslation()
  const { user, login } = useAuth(); const nav = useNavigate(); const loc = useLocation()
  const [f, setF] = useState({ email: '', password: '', remember: false }); const [err, setErr] = useState({}); const [apiErr, setApiErr] = useState(''); const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/reports" replace />
  const submit = async e => {
    e.preventDefault(); setApiErr(''); const v = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) v.email = t('auth.validation.email')
    if (!f.password) v.password = t('auth.validation.passwordRequired')
    setErr(v); if (Object.keys(v).length) return
    setLoading(true)
    try { await login({ ...f, email: f.email.trim() }); nav('/reports', { replace: true }) } catch (x) { setApiErr(errMsg(x)) } finally { setLoading(false) }
  }
  return (<AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
    <form onSubmit={submit} noValidate className="mt-7 space-y-4">
      <Alert type="ok">{loc.state?.registered && t('auth.registrationSuccess')}</Alert><Alert>{apiErr}</Alert>
      <Field id="email" label={t('auth.email')} type="email" autoComplete="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} error={err.email} />
      <Field id="password" label={t('auth.password')} secret autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} error={err.password} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={f.remember} onChange={e => setF({ ...f, remember: e.target.checked })} />{t('auth.remember')}</label>
      <Submit loading={loading}>{loading ? t('auth.signingIn') : t('nav.login')}</Submit>
      <p className="text-center text-sm text-navy-500">{t('auth.newToMediLink')} <Link to="/register" className="font-semibold text-teal-700">{t('nav.createAccount')}</Link></p>
    </form></AuthShell>)
}
