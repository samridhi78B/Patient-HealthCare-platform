import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell, Field, Submit, Alert } from '../components/AuthForm.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { errMsg } from '../api/client'
export default function Login() {
  const { user, login } = useAuth(); const nav = useNavigate(); const loc = useLocation()
  const [f, setF] = useState({ email: '', password: '', remember: false }); const [err, setErr] = useState({}); const [apiErr, setApiErr] = useState(''); const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/reports" replace />
  const submit = async e => {
    e.preventDefault(); setApiErr(''); const v = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) v.email = 'Enter a valid email address'
    if (!f.password) v.password = 'Enter your password'
    setErr(v); if (Object.keys(v).length) return
    setLoading(true)
    try { await login(f); nav('/reports', { replace: true }) } catch (x) { setApiErr(errMsg(x)) } finally { setLoading(false) }
  }
  return (<AuthShell title="Welcome back" subtitle="Log in to open your medical reports.">
    <form onSubmit={submit} noValidate className="mt-7 space-y-4">
      <Alert type="ok">{loc.state?.registered && 'Registration successful. Please log in.'}</Alert><Alert>{apiErr}</Alert>
      <Field id="email" label="Email address" type="email" autoComplete="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} error={err.email} />
      <Field id="password" label="Password" secret autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} error={err.password} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={f.remember} onChange={e => setF({ ...f, remember: e.target.checked })} />Keep me signed in on this device</label>
      <Submit loading={loading}>{loading ? 'Signing in…' : 'Log in'}</Submit>
      <p className="text-center text-sm text-navy-500">New to MedLink? <Link to="/register" className="font-semibold text-teal-700">Create an account</Link></p>
    </form></AuthShell>)
}
