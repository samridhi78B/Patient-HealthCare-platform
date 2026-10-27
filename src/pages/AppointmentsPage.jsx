import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { appointmentsApi, errMsg } from '../api/client'
import { useToast } from '../context/ToastContext.jsx'
import HospitalSelection from '../components/appointments/HospitalSelection.jsx'
import DoctorSelection from '../components/appointments/DoctorSelection.jsx'
import ConsultationDetails from '../components/appointments/ConsultationDetails.jsx'
import AppointmentCalendar from '../components/appointments/AppointmentCalendar.jsx'
import BookingSummary from '../components/appointments/BookingSummary.jsx'
import AppointmentConfirmation from '../components/appointments/AppointmentConfirmation.jsx'
import MyAppointments from '../components/appointments/MyAppointments.jsx'

const steps = ['Hospital', 'Doctor', 'Consultation', 'Date & time', 'Review']
export default function AppointmentsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [hospitals, setHospitals] = useState([])
  const [hospital, setHospital] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [doctor, setDoctor] = useState(null)
  const [details, setDetails] = useState({ reason: '', symptoms: '', appointmentType: 'in-person' })
  const [selection, setSelection] = useState({ date: '', time: '' })
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isHistory = location.pathname === '/appointments/my'

  useEffect(() => {
    if (isHistory || appointment) return
    let active = true
    setLoading(true)
    appointmentsApi.hospitals()
      .then(data => { if (active) setHospitals(data.hospitals) })
      .catch(e => { if (active) setError(errMsg(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isHistory, appointment])

  const chooseHospital = async selected => {
    setHospital(selected)
    setDoctor(null)
    setSelection({ date: '', time: '' })
    setError('')
    setLoading(true)
    try {
      const result = await appointmentsApi.doctors(selected._id)
      setDoctors(result.doctors)
      setStep(1)
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }
  const chooseDoctor = selected => {
    setDoctor(selected)
    setDetails(current => ({ ...current, appointmentType: selected.supportsOnline ? current.appointmentType : 'in-person' }))
    setSelection({ date: '', time: '' })
    setStep(2)
  }
  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await appointmentsApi.create({
        hospitalId: hospital._id, doctorId: doctor._id, reason: details.reason,
        symptoms: details.symptoms, appointmentType: details.appointmentType,
        date: selection.date, time: selection.time,
      })
      setAppointment(result.appointment)
      toast.success('Demo appointment saved successfully')
    } catch (e) { setError(errMsg(e)) }
    finally { setBusy(false) }
  }

  if (isHistory) return <div className="space-y-5"><div className="flex flex-wrap gap-3 text-sm"><Link className="font-semibold text-teal-700 underline" to="/appointments">Book appointment</Link><span aria-hidden="true">/</span><span>My appointments</span></div><MyAppointments onBook={() => navigate('/appointments')} /></div>
  if (appointment) return <AppointmentConfirmation appointment={appointment} onViewAppointments={() => navigate('/appointments/my')} />

  return (
    <div className="space-y-6">
      <header className="appointments-hero flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8"><div><p className="section-kicker">Care, connected</p><h1 className="mt-1 text-3xl sm:text-4xl">Book an appointment</h1><p className="mt-2 max-w-xl text-sm leading-6 text-navy-500">Choose a provider, select an open slot, and review before confirming.</p></div><Link to="/appointments/my" className="btn-outline">My appointments</Link></header>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Booking progress">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={`border-b-2 px-2 py-2 text-xs sm:text-sm ${step === index ? 'border-teal-700 font-bold text-teal-700' : index < step ? 'border-teal-200 text-navy-500' : 'border-ink/15 text-navy-300'}`}><span className="mr-1">{index + 1}.</span>{label}</li>)}</ol>
      {error && !busy && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" className="ml-2 underline" onClick={() => setError('')}>Dismiss</button></div>}
      {loading ? <p className="panel p-6 text-sm text-navy-500" role="status">Loading appointment information…</p>
        : error && !hospital ? <div role="alert" className="panel p-5 text-sm text-red-700">{error} <button className="ml-2 underline" type="button" onClick={() => { setError(''); setLoading(true); appointmentsApi.hospitals().then(data => setHospitals(data.hospitals)).catch(e => setError(errMsg(e))).finally(() => setLoading(false)) }}>Retry</button></div>
          : <div className="panel p-5 sm:p-7">
            {step === 0 && <HospitalSelection hospitals={hospitals} selectedHospital={hospital} onSelect={chooseHospital} />}
            {step === 1 && hospital && <div className="space-y-4"><button className="text-sm font-semibold text-teal-700 underline" type="button" onClick={() => setStep(0)}>← Change hospital</button><DoctorSelection hospital={hospital} doctors={doctors} selectedDoctor={doctor} onSelect={chooseDoctor} /></div>}
            {step === 2 && doctor && <div className="space-y-4"><button className="text-sm font-semibold text-teal-700 underline" type="button" onClick={() => setStep(1)}>← Back to doctors</button><ConsultationDetails doctor={doctor} details={details} onChange={setDetails} onContinue={() => setStep(3)} /></div>}
            {step === 3 && doctor && <div className="space-y-4"><button className="text-sm font-semibold text-teal-700 underline" type="button" onClick={() => setStep(2)}>← Back to consultation</button><AppointmentCalendar doctor={doctor} appointmentType={details.appointmentType} selection={selection} onChange={setSelection} onContinue={() => setStep(4)} /></div>}
            {step === 4 && hospital && doctor && <BookingSummary hospital={hospital} doctor={doctor} details={details} selection={selection} onEdit={setStep} onBack={() => setStep(3)} onConfirm={confirm} busy={busy} error={error} />}
          </div>}
    </div>
  )
}
