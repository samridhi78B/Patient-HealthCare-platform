import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell, Field, Submit, Alert } from '../components/AuthForm.jsx'
import { authApi, errMsg } from '../api/client'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const validate = f => {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Enter your full name'
  if (!EMAIL.test(f.email)) e.email = 'Enter a valid email address'
  if (!/^\+?[\d\s-]{10,15}$/.test(f.phone)) e.phone = 'Enter a valid phone number (10-15 digits)'
  if (f.password.length < 8 || !/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Use 8+ characters with upper-case, lower-case and a number'
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match'
  if (!f.terms) e.terms = 'You must accept the terms and privacy policy'
  return e
}
export default function Register() {
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '', terms: false })
  const [err, setErr] = useState({}); const [loading, setLoading] = useState(false); const [apiErr, setApiErr] = useState(''); const [ok, setOk] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async e => {
    e.preventDefault(); setApiErr(''); const v = validate(f); setErr(v); if (Object.keys(v).length) return
    setLoading(true)
    try { await authApi.register({ name: f.name, email: f.email, phone: f.phone, password: f.password }); setOk('Account created. Redirecting to login…'); setTimeout(() => nav('/login', { state: { registered: true } }), 1200) }
    catch (x) { setApiErr(errMsg(x)) } finally { setLoading(false) }
  }
  return (<AuthShell title="Create your account" subtitle="Set up your private medical record space.">
    <form onSubmit={submit} noValidate className="mt-7 space-y-4">
      <Alert>{apiErr}</Alert><Alert type="ok">{ok}</Alert>
      <Field id="name" label="Full name" autoComplete="name" value={f.name} onChange={set('name')} error={err.name} />
      <Field id="email" label="Email address" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={err.email} />
      <Field id="phone" label="Phone number" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={err.phone} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="password" label="Password" secret autoComplete="new-password" value={f.password} onChange={set('password')} error={err.password} />
        <Field id="confirm" label="Confirm password" secret autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={err.confirm} /></div>
      <div><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-teal-600" checked={f.terms} onChange={set('terms')} />
        <span>I accept the Terms of Service and Privacy Policy.</span></label>{err.terms && <p className="mt-1 text-xs text-red-600">{err.terms}</p>}</div>
      <Submit loading={loading}>{loading ? 'Creating account…' : 'Create account'}</Submit>
      <p className="text-center text-sm text-navy-500">Already have an account? <Link to="/login" className="font-semibold text-teal-700">Log in</Link></p>
    </form></AuthShell>)
}
