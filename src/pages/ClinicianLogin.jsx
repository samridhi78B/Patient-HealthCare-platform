import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell, Field, Submit, Alert } from '../components/AuthForm.jsx'
import { clinicianApi, errMsg } from '../api/client'

const blank = { name: '', email: '', password: '', licenseNumber: '', specialization: '', hospital: '' }

export default function ClinicianLogin() {
  const location = useLocation()
  const navigate = useNavigate()
  const [registering, setRegistering] = useState(false)
  const [form, setForm] = useState(blank)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async event => {
    event.preventDefault()
    setMessage('')
    setError('')
    setBusy(true)
    try {
      if (registering) {
        const result = await clinicianApi.register(form)
        setMessage(result.message)
        setRegistering(false)
      } else {
        await clinicianApi.login({ email: form.email, password: form.password })
        navigate(location.state?.from || '/clinician/dashboard', { replace: true })
      }
    } catch (reason) {
      setError(errMsg(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title={registering ? 'Clinician registration' : 'Clinician sign in'} subtitle="Verified healthcare professionals only">
      <form onSubmit={submit} className="mt-7 space-y-4">
        <Alert type="ok">{message}</Alert>
        <Alert>{error}</Alert>
        {registering && <>
          <Field id="name" name="name" label="Full name" autoComplete="name" required value={form.name} onChange={change} />
          <Field id="licenseNumber" name="licenseNumber" label="Medical license number" required value={form.licenseNumber} onChange={change} />
          <Field id="specialization" name="specialization" label="Specialization" required value={form.specialization} onChange={change} />
          <Field id="hospital" name="hospital" label="Hospital / clinic" required value={form.hospital} onChange={change} />
        </>}
        <Field id="email" name="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={change} />
        <Field id="password" name="password" label="Password (12+ characters; up to 72 UTF-8 bytes)" secret autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 12 : undefined} maxLength={72} required value={form.password} onChange={change} />
        <Submit loading={busy}>{busy ? 'Please wait…' : registering ? 'Submit registration' : 'Sign in'}</Submit>
        <button type="button" className="w-full text-sm font-semibold text-teal-700 underline" onClick={() => { setRegistering(value => !value); setError(''); setMessage('') }}>
          {registering ? 'Already registered? Sign in' : 'New clinician? Register for verification'}
        </button>
        <p className="text-center text-sm text-navy-500"><Link to="/login" className="font-semibold text-teal-700">Patient sign in</Link></p>
      </form>
    </AuthShell>
  )
}
