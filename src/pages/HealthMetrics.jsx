import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeftRight, Droplets, Moon, Pencil, Plus, RotateCcw, Ruler, Scale, Trash2 } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { errMsg, measurementsApi, profileApi } from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const dateLabel = (value, language) => new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
const validHeight = (value, units) => Number.isFinite(value) && value >= (units === 'metric' ? 80 : 31.5) && value <= (units === 'metric' ? 250 : 98.4)
const validWeight = (value, units) => Number.isFinite(value) && value >= (units === 'metric' ? 20 : 44) && value <= (units === 'metric' ? 350 : 772)
const toCm = (value, units) => units === 'metric' ? value : value * 2.54
const toKg = (value, units) => units === 'metric' ? value : value / 2.2046226218
const toDateOnly = value => typeof value === 'string' ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10)
const tooltipStyle = { border: '1px solid rgb(var(--sage-200))', borderRadius: 12, backgroundColor: 'rgb(var(--paper))', color: 'rgb(var(--ink))', fontSize: 12 }

function CalculatorCard({ icon: Icon, title, description, tone = 'blue', children }) {
  return <section className={`health-panel health-panel--${tone} p-5 sm:p-6`}>
    <header className="flex items-start gap-3"><span className={`health-panel__icon health-panel__icon--${tone}`}><Icon size={19} /></span><div><h2 className="text-lg">{title}</h2><p className="mt-1 text-xs leading-5 text-navy-500">{description}</p></div></header>
    <div className="mt-5">{children}</div>
  </section>
}

function ProgressRing({ percent, color, label, complete = false }) {
  const circumference = 2 * Math.PI * 40
  const progress = Math.min(100, Math.max(0, percent))
  return <div className={`health-progress-ring${complete ? ' health-progress-ring--complete' : ''}`} role="img" aria-label={label} style={{ '--ring-color': color }}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle className="health-progress-ring__track" cx="50" cy="50" r="40" />
      <circle className="health-progress-ring__value" cx="50" cy="50" r="40" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} />
      <text x="50" y="53" textAnchor="middle">{progress}%</text>
    </svg>
  </div>
}

export default function HealthMetrics() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const wellnessKey = `medlink-metrics-wellness:${user.email.toLowerCase()}`
  const [profile, setProfile] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [units, setUnits] = useState('metric')
  const [heightInput, setHeightInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [waistInput, setWaistInput] = useState('')
  const [measurementDate, setMeasurementDate] = useState(today())
  const [editingId, setEditingId] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [chartRange, setChartRange] = useState('30')
  const [water, setWater] = useState({ goal: 2, consumed: 0, entries: [] })
  const [wellnessLoaded, setWellnessLoaded] = useState(false)
  const [waterInput, setWaterInput] = useState('0.25')
  const [waterGoalInput, setWaterGoalInput] = useState('2')
  const [waterError, setWaterError] = useState('')
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [sleepGoal, setSleepGoal] = useState('8')
  const [sleepDuration, setSleepDuration] = useState(null)
  const [sleepRecord, setSleepRecord] = useState(null)
  const [stepsInput, setStepsInput] = useState('')
  const [stepGoalInput, setStepGoalInput] = useState('8000')
  const [activity, setActivity] = useState({ steps: 0, goal: 8000, date: today() })
  const [activityError, setActivityError] = useState('')
  const [converterKg, setConverterKg] = useState('')
  const [converterCm, setConverterCm] = useState('')
  const [converterLitres, setConverterLitres] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    Promise.allSettled([profileApi.get(), measurementsApi.list()])
      .then(([profileResult, measurementsResult]) => {
        if (!active) return
        if (profileResult.status === 'fulfilled') setProfile(profileResult.value.profile)
        if (measurementsResult.status === 'fulfilled') {
          const records = measurementsResult.value.measurements
          setMeasurements(records)
          const latest = records.at(-1)
          if (latest) {
            setHeightInput(String(latest.heightCm))
            setWeightInput(String(latest.weightKg))
          }
        }
        const errors = []
        if (profileResult.status === 'rejected') errors.push(errMsg(profileResult.reason))
        if (measurementsResult.status === 'rejected') errors.push(errMsg(measurementsResult.reason))
        if (errors.length) setLoadError(errors.join(' · '))
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(wellnessKey)
      if (!saved) { setWellnessLoaded(true); return }
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        if (parsed.water && typeof parsed.water.goal === 'number' && Array.isArray(parsed.water.entries)) {
          const todaysEntries = parsed.water.entries.filter(item => item.date === today())
          setWater({ goal: parsed.water.goal, entries: parsed.water.entries, consumed: todaysEntries.reduce((sum, item) => sum + item.litres, 0) })
          setWaterGoalInput(String(parsed.water.goal))
        }
        if (parsed.activity && typeof parsed.activity.goal === 'number') {
          setActivity(parsed.activity.date === today() ? parsed.activity : { ...parsed.activity, steps: 0, date: today() })
          setStepGoalInput(String(parsed.activity.goal))
        }
        if (parsed.sleep && parsed.sleep.date === today() && Number.isFinite(parsed.sleep.duration)
          && typeof parsed.sleep.bedtime === 'string' && typeof parsed.sleep.wakeTime === 'string') {
          setSleepRecord(parsed.sleep)
          setSleepDuration(parsed.sleep.duration)
          setBedtime(parsed.sleep.bedtime)
          setWakeTime(parsed.sleep.wakeTime)
        }
      }
    } catch {
      setWaterError(t('common.profileReadError'))
    } finally {
      setWellnessLoaded(true)
    }
  }, [wellnessKey, t])

  useEffect(() => {
    if (!wellnessLoaded) return
    try { window.localStorage.setItem(wellnessKey, JSON.stringify({ water, activity, sleep: sleepRecord })) } catch {
      setWaterError(t('common.localSaveError'))
    }
  }, [water, activity, sleepRecord, wellnessKey, wellnessLoaded, t])

  const age = useMemo(() => {
    if (!profile?.dateOfBirth) return null
    const birth = new Date(`${String(profile.dateOfBirth).slice(0, 10)}T12:00:00`)
    if (Number.isNaN(birth.getTime())) return null
    const now = new Date()
    return now.getFullYear() - birth.getFullYear() - (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) ? 1 : 0)
  }, [profile?.dateOfBirth])
  const height = Number(heightInput)
  const weight = Number(weightInput)
  const massUnit = units === 'metric' ? 'kg' : 'lb'
  const weightInCurrentUnits = value => units === 'metric' ? value : value * 2.2046226218
  const heightInCurrentUnits = value => units === 'metric' ? value : value / 2.54
  const valid = heightInput !== '' && weightInput !== '' && validHeight(height, units) && validWeight(weight, units)
  const heightCm = valid ? toCm(height, units) : null
  const weightKg = valid ? toKg(weight, units) : null
  const bmi = valid ? (units === 'metric' ? weight / ((height / 100) ** 2) : 703 * weight / (height ** 2)) : null
  const adultEligible = age !== null && age >= 20
  const bmiCategory = bmi === null ? '' : bmi < 18.5 ? t('common.underweight') : bmi < 25 ? t('common.healthyWeight') : bmi < 30 ? t('common.overweight') : t('common.obesity')
  const range = heightCm ? {
    low: 18.5 * (heightCm / 100) ** 2,
    high: 24.9 * (heightCm / 100) ** 2,
  } : null
  const rangeDifference = range && weightKg
    ? weightKg < range.low ? weightKg - range.low : weightKg > range.high ? weightKg - range.high : 0
    : null
  const latest = measurements.at(-1)
  const previous = measurements.at(-2)
  const chartMeasurements = useMemo(() => {
    const cutoff = chartRange === 'all' ? '' : (() => {
      const date = new Date()
      date.setDate(date.getDate() - Number(chartRange))
      return toDateOnly(date)
    })()
    return measurements.filter(item => !cutoff || toDateOnly(item.measuredAt) >= cutoff)
      .map(item => ({ date: toDateOnly(item.measuredAt), label: dateLabel(toDateOnly(item.measuredAt), i18n.language), weight: weightInCurrentUnits(item.weightKg) }))
  }, [measurements, chartRange, i18n.language, units])
  const bmiMarker = bmi === null ? 0 : Math.max(0, Math.min(100, (bmi / 40) * 100))
  const waterPercent = water.goal > 0 ? Math.min(100, Math.round(water.consumed / water.goal * 100)) : 0
  const activityPercent = activity.goal > 0 ? Math.min(100, Math.round(activity.steps / activity.goal * 100)) : 0
  const insights = [
    latest && `${t('dashboard.weight')}: ${Number(latest.weightKg).toFixed(1)} kg`,
    latest && previous && t('common.weightPrevious', { change: (latest.weightKg - previous.weightKg).toFixed(1) }),
    water.consumed > 0 && `${waterPercent}% ${t('dashboard.complete')}`,
  ].filter(Boolean)

  const resetCalculator = () => {
    setHeightInput(latest ? String(latest.heightCm) : '')
    setWeightInput(latest ? String(latest.weightKg) : '')
    setWaistInput('')
    setUnits('metric')
    setValidationError('')
    setSaveMessage('')
  }
  const switchUnits = nextUnits => {
    if (nextUnits === units) return
    const heightFactor = nextUnits === 'metric' ? 2.54 : 1 / 2.54
    const weightFactor = nextUnits === 'metric' ? 1 / 2.2046226218 : 2.2046226218
    const convert = (value, factor) => value === '' || !Number.isFinite(Number(value)) ? value : String(Number(value) * factor)
    setHeightInput(value => convert(value, heightFactor))
    setWeightInput(value => convert(value, weightFactor))
    setWaistInput(value => convert(value, heightFactor))
    setUnits(nextUnits)
    setValidationError('')
  }
  const submitMeasurement = async event => {
    event.preventDefault()
    setValidationError('')
    setSaveMessage('')
    if (!validHeight(height, units)) { setValidationError(t(units === 'metric' ? 'common.heightRangeError' : 'common.validHeightImperial')); return }
    if (!validWeight(weight, units)) { setValidationError(t(units === 'metric' ? 'common.weightRangeError' : 'common.validWeightImperial')); return }
    const waist = waistInput === '' ? null : Number(waistInput) * (units === 'metric' ? 1 : 2.54)
    if (waist !== null && (!Number.isFinite(waist) || waist < 20 || waist > 250)) { setValidationError(t('common.weightRangeError')); return }
    setSaving(true)
    const payload = { measuredAt: measurementDate, heightCm, weightKg, waistCm: waist }
    try {
      const existing = measurements.find(item => toDateOnly(item.measuredAt) === measurementDate)
      const result = editingId
        ? await measurementsApi.update(editingId, payload)
        : existing
          ? await measurementsApi.update(existing._id, payload)
          : await measurementsApi.create(payload)
      setMeasurements(current => [...current.filter(item => item._id !== result.measurement._id && toDateOnly(item.measuredAt) !== measurementDate), result.measurement]
        .sort((left, right) => new Date(left.measuredAt) - new Date(right.measuredAt)))
      setEditingId(null)
      setSaveMessage(t(existing || editingId ? 'metrics.updated' : 'metrics.saved'))
    } catch (error) {
      setValidationError(error.response?.data?.message || t('metrics.failedSave'))
    } finally { setSaving(false) }
  }
  const editMeasurement = item => {
    setEditingId(item._id)
    setMeasurementDate(toDateOnly(item.measuredAt))
    setUnits('metric')
    setHeightInput(String(item.heightCm))
    setWeightInput(String(item.weightKg))
    setWaistInput(item.waistCm == null ? '' : String(item.waistCm))
    setValidationError('')
    setSaveMessage('')
    document.getElementById('bmi-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const deleteMeasurement = async item => {
    if (!window.confirm(t('common.confirmDelete'))) return
    setValidationError('')
    try {
      await measurementsApi.remove(item._id)
      setMeasurements(current => current.filter(record => record._id !== item._id))
      if (editingId === item._id) resetCalculator()
      setSaveMessage(t('dashboard.weightSaved'))
    } catch (error) { setValidationError(error.response?.data?.message || t('metrics.deleteFailed')) }
  }
  const addWater = event => {
    event.preventDefault()
    const amount = Number(waterInput)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 2) { setWaterError(t('common.error')); return }
    const entry = { id: crypto.randomUUID(), date: today(), litres: amount }
    setWater(current => ({ ...current, consumed: Number((current.consumed + amount).toFixed(2)), entries: [...current.entries, entry] }))
    setWaterError('')
  }
  const undoWater = () => {
    const index = water.entries.findLastIndex ? water.entries.findLastIndex(item => item.date === today()) : water.entries.map(item => item.date).lastIndexOf(today())
    if (index < 0) return
    const [entry] = water.entries.slice(index, index + 1)
    setWater(current => ({ ...current, consumed: Math.max(0, Number((current.consumed - entry.litres).toFixed(2))), entries: current.entries.filter((_item, itemIndex) => itemIndex !== index) }))
  }
  const saveWaterGoal = event => {
    const value = Number(event.target.value)
    setWaterGoalInput(event.target.value)
    if (value >= 0.1 && value <= 10) {
      setWater(current => ({ ...current, goal: value }))
      setWaterError('')
    } else setWaterError(t('metrics.waterGoalError'))
  }
  const calculateSleep = event => {
    event.preventDefault()
    let start = bedtime.split(':').reduce((total, part) => total * 60 + Number(part), 0)
    let end = wakeTime.split(':').reduce((total, part) => total * 60 + Number(part), 0)
    if (end <= start) end += 24 * 60
    const duration = (end - start) / 60
    setSleepDuration(duration)
    setSleepRecord({ date: today(), bedtime, wakeTime, duration })
  }
  const saveSteps = event => {
    event.preventDefault()
    const steps = Number(stepsInput)
    const goal = Number(stepGoalInput)
    if (!Number.isInteger(steps) || steps < 0 || steps > 100000) { setActivityError(t('metrics.stepsError')); return }
    if (!Number.isInteger(goal) || goal < 100 || goal > 100000) { setActivityError(t('metrics.stepGoalError')); return }
    setActivity({ steps, goal, date: today() })
    setActivityError('')
  }

  return (
    <div className="health-metrics-dashboard space-y-6">
      <header className="health-hero flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5 sm:p-7">
        <div><p className="section-kicker flex items-center gap-2"><Activity size={14} />{t('nav.healthMetrics')}</p><h1 className="mt-2 text-3xl">{t('nav.healthMetrics')}</h1><p className="mt-2 max-w-2xl text-sm text-navy-500">{t('home.description')}</p></div>
      </header>

      <p className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs leading-5 text-blue-900">{t('common.metricsPrivacy')}</p>
      {loadError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{t('metrics.loadError')} {loadError} <button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>{t('metrics.retry')}</button></p>}
      {loading && <p role="status" className="health-panel p-4 text-sm text-navy-500">{t('metrics.loading')}</p>}

      <section className="grid gap-4 xl:grid-cols-2">
        <CalculatorCard icon={Scale} title={t('metrics.calculator')} description={t('dashboard.adultBmi')} tone="blue">
          <form id="bmi-calculator" className="space-y-4" onSubmit={submitMeasurement}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <fieldset className="flex rounded-lg border border-ink/10 bg-white p-1" aria-label={t('metrics.metric')}>
                {['metric', 'imperial'].map(unit => <button key={unit} type="button" aria-pressed={units === unit} onClick={() => switchUnits(unit)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${units === unit ? 'bg-blue-600 text-white' : 'text-navy-500 hover:bg-sage-100'}`}>{t(`common.${unit}System`)}</button>)}
              </fieldset>
              <span className="text-xs text-navy-500">{age === null ? t('metrics.ageForBmi') : `${t('metrics.ageForBmi')}: ${age}`}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">{t('metrics.height')} ({t(units === 'metric' ? 'common.cm' : 'common.inches')})
                <input className="input mt-1" type="number" min={units === 'metric' ? '80' : '31.5'} max={units === 'metric' ? '250' : '98.4'} step="any" value={heightInput} onChange={event => { setHeightInput(event.target.value); setValidationError('') }} placeholder={units === 'metric' ? '170' : '67'} />
              </label>
              <label className="text-xs font-semibold">{t('metrics.weight')} ({t(units === 'metric' ? 'common.unitKilograms' : 'common.pounds')})
                <input className="input mt-1" type="number" min={units === 'metric' ? '20' : '44'} max={units === 'metric' ? '350' : '772'} step="any" value={weightInput} onChange={event => { setWeightInput(event.target.value); setValidationError('') }} placeholder={units === 'metric' ? '68' : '150'} />
              </label>
              <label className="text-xs font-semibold">{t('common.waist')} ({t(units === 'metric' ? 'common.cm' : 'common.inches')})
                <input className="input mt-1" type="number" min="20" max={units === 'metric' ? '250' : '98.4'} step="any" value={waistInput} onChange={event => setWaistInput(event.target.value)} />
              </label>
              <label className="text-xs font-semibold">{t('metrics.measurementDate')}
                <input className="input mt-1" type="date" max={today()} value={measurementDate} onChange={event => setMeasurementDate(event.target.value)} required />
              </label>
            </div>
            {validationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{validationError}</p>}
            {saveMessage && <p role="status" className="rounded-lg bg-green-50 p-3 text-xs text-green-800">{saveMessage}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('metrics.saving') : t('metrics.saveMeasurement')}</button>
              <button type="button" className="btn-outline" onClick={resetCalculator}><RotateCcw size={14} />{t('metrics.reset')}</button>
            </div>
          </form>

          <div className="mt-5 rounded-xl bg-blue-50/75 p-4">
            {bmi === null
              ? <p className="text-sm text-navy-500">{t('common.noData')}</p>
              : <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center"><div><p className="text-xs text-navy-500">{t('metrics.bmi')}</p><p className="text-3xl font-semibold">{bmi.toFixed(1)}</p></div><div><p className="text-sm font-semibold">{adultEligible ? bmiCategory : age !== null && age < 20 ? t('common.bmiPediatric') : t('metrics.ageRequired')}</p></div></div>}
            {adultEligible && <><div className="relative mt-4 h-3 overflow-visible rounded-full" role="img" aria-label={t('metrics.reference')}>
              <div className="health-bmi-range"><span className="health-bmi-range__segment health-bmi-range__segment--low" /><span className="health-bmi-range__segment health-bmi-range__segment--healthy" /><span className="health-bmi-range__segment health-bmi-range__segment--high" /><span className="health-bmi-range__segment health-bmi-range__segment--very-high" /></div>
              {bmi !== null && <span className="absolute -top-1.5 h-6 w-1 -translate-x-1/2 rounded bg-ink shadow" style={{ left: `${bmiMarker}%` }} />}
            </div>
            <div className="health-bmi-legend mt-2"><span className="health-bmi-legend__item health-bmi-legend__item--low">{t('common.underweight')} &lt;18.5</span><span className="health-bmi-legend__item health-bmi-legend__item--healthy">{t('common.healthyWeight')} 18.5–24.9</span><span className="health-bmi-legend__item health-bmi-legend__item--high">{t('common.overweight')} 25–29.9</span><span className="health-bmi-legend__item health-bmi-legend__item--very-high">{t('common.obesity')} ≥30</span></div></>}
            <p className="mt-3 text-[11px] leading-5 text-navy-500">{age !== null && age < 20 ? t('common.bmiPediatric') : age === null ? t('metrics.ageRequired') : t('metrics.bmiExplanation')} {age === null || age < 20 ? t('common.bmiScreening') : ''}</p>
          </div>
        </CalculatorCard>

        <CalculatorCard icon={Ruler} title={t('common.healthyWeightRange')} description={t('metrics.rangeDisclaimer')} tone="purple">
          {range && adultEligible
            ? <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3"><div className="health-detail"><p>{t('metrics.lower')}</p><strong>{weightInCurrentUnits(range.low).toFixed(1)} {massUnit}</strong></div><div className="health-detail"><p>{t('metrics.upper')}</p><strong>{weightInCurrentUnits(range.high).toFixed(1)} {massUnit}</strong></div></div>
              {latest && <p className="rounded-xl bg-sage-100/60 p-3 text-sm">{t('metrics.currentWeight')}: <strong>{weightInCurrentUnits(latest.weightKg).toFixed(1)} {massUnit}</strong></p>}
              {rangeDifference !== null && <p className="text-sm text-navy-600">{rangeDifference === 0 ? t('metrics.noDifference') : `${Math.abs(weightInCurrentUnits(rangeDifference)).toFixed(1)} ${massUnit} ${rangeDifference < 0 ? t('dashboard.belowRange') : t('dashboard.aboveRange')}`}</p>}
              <p className="text-xs leading-5 text-navy-500">{t('metrics.rangeDisclaimer')}</p>
            </div>
            : <p className="rounded-xl bg-sage-100/50 p-4 text-sm text-navy-500">{age !== null && age < 20 ? t('common.bmiPediatric') : age === null ? t('metrics.ageRequired') : t('common.noData')}</p>}
        </CalculatorCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <CalculatorCard icon={Scale} title={t('metrics.history')} description={t('metrics.historyDescription')} tone="purple">
          {measurements.length
            ? <div className="health-history-table overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-ink/10 text-navy-500"><tr><th className="py-2 pr-3">{t('metrics.date')}</th><th className="py-2 pr-3">{t('metrics.height')}</th><th className="py-2 pr-3">{t('metrics.weight')}</th><th className="py-2 pr-3">{t('common.waist')}</th><th className="py-2 pr-3">{t('dashboard.previousMeasurement')}</th><th className="py-2">{t('dashboard.action')}</th></tr></thead>
              <tbody>{[...measurements].reverse().map(item => {
                const index = measurements.findIndex(record => record._id === item._id)
                const previousItem = index > 0 ? measurements[index - 1] : null
                return <tr key={item._id} className="border-b border-ink/5 last:border-0"><td className="py-3 pr-3">{dateLabel(toDateOnly(item.measuredAt), i18n.language)}</td><td className="py-3 pr-3">{heightInCurrentUnits(item.heightCm).toFixed(1)} {units === 'metric' ? 'cm' : 'in'}</td><td className="py-3 pr-3">{weightInCurrentUnits(item.weightKg).toFixed(1)} {massUnit}</td><td className="py-3 pr-3">{item.waistCm == null ? '—' : `${heightInCurrentUnits(item.waistCm).toFixed(1)} ${units === 'metric' ? 'cm' : 'in'}`}</td><td className="py-3 pr-3">{previousItem ? `${weightInCurrentUnits(item.weightKg - previousItem.weightKg) > 0 ? '+' : ''}${weightInCurrentUnits(item.weightKg - previousItem.weightKg).toFixed(1)} ${massUnit}` : '—'}</td><td className="py-3"><span className="flex gap-2"><button type="button" className="text-blue-700" aria-label={`${t('metrics.edit')} ${dateLabel(toDateOnly(item.measuredAt), i18n.language)}`} onClick={() => editMeasurement(item)}><Pencil size={14} /></button><button type="button" className="text-red-700" aria-label={`${t('common.delete')} ${dateLabel(toDateOnly(item.measuredAt), i18n.language)}`} onClick={() => deleteMeasurement(item)}><Trash2 size={14} /></button></span></td></tr>
              })}</tbody>
            </table></div>
            : <p className="rounded-xl bg-sage-100/50 p-4 text-sm text-navy-500">{t('metrics.noMeasurements')}</p>}
        </CalculatorCard>

        <CalculatorCard icon={Activity} title={t('metrics.chart')} description={t('metrics.chartDescription')} tone="blue">
          <div className="health-date-filters mb-3 flex flex-wrap gap-1">{[['7', 'sevenDays'], ['30', 'thirtyDays'], ['90', 'ninetyDays'], ['all', 'allTime']].map(([value, label]) => <button type="button" key={value} aria-pressed={chartRange === value} onClick={() => setChartRange(value)} className="health-date-filter">{t(`metrics.${label}`)}</button>)}</div>
          {chartMeasurements.length ? <div className="h-56" role="img" aria-label={t('metrics.chart')}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={chartMeasurements} margin={{ top: 8, right: 12, left: -15, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
              <XAxis dataKey="label" tick={{ fill: 'var(--chart-label)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'var(--chart-label)', fontSize: 10 }} axisLine={false} tickLine={false} unit={` ${massUnit}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={value => [`${Number(value).toFixed(1)} ${massUnit}`, t('metrics.weight')]} />
              <Line type="monotone" dataKey="weight" stroke="#3978FF" strokeWidth={3} dot={{ r: 4, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} />
            </LineChart></ResponsiveContainer>
          </div> : <p className="rounded-xl bg-sage-100/50 p-4 text-sm text-navy-500">{t('metrics.noWeightHistory')}</p>}
          {latest && previous && <p className="mt-3 text-xs text-navy-500">{t('common.weightPrevious', { change: `${latest.weightKg - previous.weightKg > 0 ? '+' : ''}${(latest.weightKg - previous.weightKg).toFixed(1)}` })}</p>}
        </CalculatorCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <CalculatorCard icon={Droplets} title={t('metrics.waterPlanner')} description={t('common.goalDisclaimer')} tone="green">
          <label className="block text-xs font-semibold">{t('metrics.dailyWaterGoal')}<input className="input mt-1" type="number" min="0.1" max="10" step="0.1" value={waterGoalInput} onChange={saveWaterGoal} /></label>
          <div className="health-tracker-progress mt-4">
            <ProgressRing percent={waterPercent} color="#10B981" complete={waterPercent >= 100} label={`${water.consumed.toFixed(2)} / ${water.goal.toFixed(1)} ${t('common.unitLitres')}, ${waterPercent}%`} />
            <div className="min-w-0"><p className="text-sm font-bold">{water.consumed.toFixed(2)} / {water.goal.toFixed(1)} {t('common.unitLitres')}</p><p className="mt-1 text-xs text-navy-500">{t('metrics.dailyWaterGoal')}</p>{waterPercent >= 100 && <span className="health-goal-badge">{t('dashboard.goalReached')}</span>}</div>
          </div>
          <form className="mt-4 flex gap-2" onSubmit={addWater}><label className="sr-only" htmlFor="water-add-amount">{t('common.unitLitres')}</label><input id="water-add-amount" className="input" type="number" min="0.01" max="2" step="0.01" value={waterInput} onChange={event => setWaterInput(event.target.value)} /><button className="btn-primary px-3" type="submit"><Plus size={15} />{t('dashboard.add')}</button></form>
          <button type="button" className="btn-outline mt-2 w-full" disabled={!water.entries.some(item => item.date === today())} onClick={undoWater}><RotateCcw size={14} />{t('metrics.undoWater')}</button>
          {waterError && <p role="alert" className="mt-2 text-xs text-amber-800">{waterError}</p>}
          <p className="mt-3 text-[11px] leading-5 text-navy-500">{t('common.goalDisclaimer')}</p>
        </CalculatorCard>

        <CalculatorCard icon={Moon} title={t('metrics.sleepCalculator')} description={t('dashboard.sleepCompared', { goal: sleepGoal })} tone="purple">
          <form className="space-y-3" onSubmit={calculateSleep}>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">{t('metrics.bedtime')}<input className="input mt-1" type="time" required value={bedtime} onChange={event => setBedtime(event.target.value)} /></label><label className="text-xs font-semibold">{t('metrics.wakeTime')}<input className="input mt-1" type="time" required value={wakeTime} onChange={event => setWakeTime(event.target.value)} /></label></div>
            <label className="block text-xs font-semibold">{t('metrics.sleepGoal')}<input className="input mt-1" type="number" min="1" max="24" step="0.5" value={sleepGoal} onChange={event => setSleepGoal(event.target.value)} /></label>
            <button type="submit" className="btn-primary w-full">{t('metrics.calculateSleep')}</button>
          </form>
          {sleepDuration !== null && <div role="status" className={`health-sleep-result mt-3${sleepDuration >= Number(sleepGoal) ? ' health-sleep-result--complete' : ''}`}><p>{t('metrics.sleepDuration')}: <strong>{sleepDuration.toFixed(1)} {t('common.unitHours')}</strong> / {t('dashboard.goal')}: {Number(sleepGoal).toFixed(1)} {t('common.unitHours')}</p><div className="health-sleep-result__track"><span style={{ width: `${Math.min(100, sleepDuration / Number(sleepGoal) * 100)}%` }} /></div></div>}
        </CalculatorCard>

        <CalculatorCard icon={Activity} title={t('dashboard.activityTracker')} description={t('common.goalDisclaimer')} tone="orange">
          <form className="space-y-3" onSubmit={saveSteps}>
            <label className="block text-xs font-semibold">{t('metrics.stepGoal')}<input className="input mt-1" type="number" min="100" max="100000" step="100" value={stepGoalInput} onChange={event => setStepGoalInput(event.target.value)} /></label>
            <label className="block text-xs font-semibold">{t('metrics.stepsToday')}<input className="input mt-1" type="number" min="0" max="100000" step="1" value={stepsInput} onChange={event => setStepsInput(event.target.value)} /></label>
            <button type="submit" className="btn-primary w-full">{t('dashboard.manualActivity')}</button>
          </form>
          <div className="health-tracker-progress mt-4">
            <ProgressRing percent={activityPercent} color="#FF8A34" complete={activityPercent >= 100} label={`${activity.steps.toLocaleString()} / ${activity.goal.toLocaleString()} ${t('common.unitSteps')}, ${activityPercent}%`} />
            <div className="min-w-0"><p className="text-sm font-bold">{activity.steps.toLocaleString()} / {activity.goal.toLocaleString()} {t('common.unitSteps')}</p><p className="mt-1 text-xs text-navy-500">{t('metrics.stepGoal')}</p>{activityPercent >= 100 && <span className="health-goal-badge health-goal-badge--orange">{t('dashboard.goalReached')}</span>}</div>
          </div>
          {activityError && <p role="alert" className="mt-2 text-xs text-red-700">{activityError}</p>}
        </CalculatorCard>
      </section>

      <CalculatorCard icon={ArrowLeftRight} title={t('common.converterTitle')} description={t('dashboard.oneMetric')} tone="pink">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-semibold">{t('common.converterKgLb')}<input className="input mt-1" type="number" min="0" step="any" value={converterKg} onChange={event => setConverterKg(event.target.value)} placeholder={t('common.unitKilograms')} /><span className="mt-1 block font-normal text-navy-500">{converterKg && Number(converterKg) > 0 ? `${(Number(converterKg) * 2.2046226218).toFixed(2)} ${t('common.pounds')}` : '—'}</span></label>
          <label className="text-xs font-semibold">{t('common.converterCmFeet')}<input className="input mt-1" type="number" min="0" step="any" value={converterCm} onChange={event => setConverterCm(event.target.value)} placeholder={t('common.cm')} /><span className="mt-1 block font-normal text-navy-500">{converterCm && Number(converterCm) > 0 ? `${Math.floor(Number(converterCm) / 30.48)} ft ${(Number(converterCm) % 30.48 / 2.54).toFixed(1)} in` : '—'}</span></label>
          <label className="text-xs font-semibold">{t('common.converterLitreMl')}<input className="input mt-1" type="number" min="0" step="any" value={converterLitres} onChange={event => setConverterLitres(event.target.value)} placeholder={t('common.unitLitres')} /><span className="mt-1 block font-normal text-navy-500">{converterLitres && Number(converterLitres) > 0 ? `${(Number(converterLitres) * 1000).toLocaleString()} ${t('common.unitMillilitres')}` : '—'}</span></label>
        </div>
      </CalculatorCard>

      <section className="health-insight rounded-2xl border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t('metrics.insights')}</h2>
        {insights.length ? <ul className="mt-3 space-y-2 text-sm">{insights.map((insight, index) => <li key={index} className="flex gap-2"><span className="text-blue-700">•</span>{insight}</li>)}</ul>
          : <p className="mt-2 text-sm text-navy-500">{t('metrics.noInsights')}</p>}
        <p className="mt-3 border-t border-ink/10 pt-3 text-[11px] text-navy-500">{t('dashboard.notDiagnosis')}</p>
      </section>
    </div>
  )
}
