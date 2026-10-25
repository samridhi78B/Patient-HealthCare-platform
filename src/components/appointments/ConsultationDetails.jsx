import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

export default function ConsultationDetails({ doctor, details, onChange, onContinue }) {
  const [error, setError] = useState('')
  const submit = event => {
    event.preventDefault()
    if (details.reason.trim().length < 3) return setError('Please enter a consultation reason of at least 3 characters.')
    if (details.reason.trim().length > 500) return setError('The reason must be 500 characters or fewer.')
    setError('')
    onContinue()
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div><p className="eyebrow">{doctor.name} · {doctor.specialty}</p><h2 className="mt-1 text-2xl">Tell us about your visit</h2></div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold" htmlFor="consultation-reason">What health concern or condition are you consulting the doctor for? <span aria-hidden="true">*</span></label>
        <input id="consultation-reason" className="input" required maxLength={500} value={details.reason} onChange={e => onChange({ ...details, reason: e.target.value })} placeholder="Briefly describe the reason for your visit" />
        <p className="mt-1 text-right text-xs text-navy-500">{details.reason.length}/500</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold" htmlFor="consultation-symptoms">Symptoms or additional details <span className="font-normal text-navy-500">(optional)</span></label>
        <textarea id="consultation-symptoms" className="input min-h-28 resize-y" maxLength={2000} value={details.symptoms} onChange={e => onChange({ ...details, symptoms: e.target.value })} placeholder="Add details you would like the provider to know" />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Appointment type</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="appointment-type" value="in-person" checked={details.appointmentType === 'in-person'} onChange={e => onChange({ ...details, appointmentType: e.target.value })} />In-person consultation</label>
          {doctor.supportsOnline && <label className="flex items-center gap-2"><input type="radio" name="appointment-type" value="online" checked={details.appointmentType === 'online'} onChange={e => onChange({ ...details, appointmentType: e.target.value })} />Online consultation</label>}
        </div>
      </fieldset>
      <div className="flex gap-3 border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"><ShieldCheck size={19} className="mt-0.5 shrink-0" /><p><strong>Privacy:</strong> Your consultation details will be shared with the selected healthcare provider for this appointment only. This form does not provide a diagnosis or treatment recommendations.</p></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button className="btn-primary" type="submit">Continue to date &amp; time</button>
    </form>
  )
}
