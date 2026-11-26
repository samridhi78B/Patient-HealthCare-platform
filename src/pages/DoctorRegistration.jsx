import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, AuthShell, Field, Submit } from '../components/AuthForm.jsx'
import { clinicianApi, errMsg } from '../api/client'

const initialForm = { name: '', email: '', phone: '', password: '', licenseNumber: '', specialization: '', hospital: '' }

export default function DoctorRegistration() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async event => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await clinicianApi.register(form)
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (reason) {
      setError(errMsg(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Doctor registration" subtitle="Create a doctor account to continue to MedLink">
      <form onSubmit={submit} className="mt-7 space-y-4">
        <Alert>{error}</Alert>
        <Field id="name" name="name" label="Full name" autoComplete="name" required value={form.name} onChange={change} />
        <Field id="email" name="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={change} />
        <Field id="phone" name="phone" label="Phone" type="tel" autoComplete="tel" value={form.phone || ''} onChange={change} />
        <Field id="licenseNumber" name="licenseNumber" label="Medical license number" required value={form.licenseNumber} onChange={change} />
        <Field id="specialization" name="specialization" label="Specialization" required value={form.specialization} onChange={change} />
        <Field id="hospital" name="hospital" label="Hospital / clinic" required value={form.hospital} onChange={change} />
        <Field id="password" name="password" label="Password (12+ characters; up to 72 UTF-8 bytes)" secret autoComplete="new-password" minLength={12} maxLength={72} required value={form.password} onChange={change} />
        <Submit loading={busy}>{busy ? 'Creating account…' : 'Create doctor account'}</Submit>
        <p className="text-center text-sm text-navy-500">Already have an account? <Link to="/login" className="font-semibold text-teal-700">Log in</Link></p>
      </form>
    </AuthShell>
  )
}
