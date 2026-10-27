import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'
import hi from './locales/hi/translation.json'
import mr from './locales/mr/translation.json'
import ta from './locales/ta/translation.json'
import te from './locales/te/translation.json'
import gu from './locales/gu/translation.json'

export const supportedLanguages = ['en', 'hi', 'mr', 'ta', 'te', 'gu']
const LANGUAGE_KEY = 'medlink-language'
const localeTranslations = { en, hi, mr, ta, te, gu }
const metricAliases = {
  ageForBmi: 'dashboard.age',
  ageRequired: 'dashboard.ageUnknownBmi',
  bedtime: 'dashboard.bedtime',
  bmi: 'dashboard.bmi',
  bmiExplanation: 'dashboard.adultBmi',
  calculateSleep: 'dashboard.recordSleep',
  calculator: 'dashboard.bmi',
  chart: 'dashboard.weightTracker',
  chartDescription: 'dashboard.oneMetric',
  currentWeight: 'dashboard.weight',
  dailyWaterGoal: 'dashboard.waterGoal',
  date: 'dashboard.date',
  delete: 'common.delete',
  deleteFailed: 'common.error',
  edit: 'dashboard.editHealthProfile',
  failedSave: 'dashboard.profileSaveError',
  height: 'dashboard.height',
  history: 'dashboard.measurements',
  historyDescription: 'dashboard.weightTracker',
  insights: 'dashboard.trendsTitle',
  loadError: 'common.error',
  loading: 'common.loading',
  lower: 'dashboard.belowRange',
  measurementDate: 'dashboard.measurementDate',
  metric: 'common.metricSystem',
  noDifference: 'common.noDifference',
  noInsights: 'common.noData',
  noMeasurements: 'dashboard.noRecords',
  noWeightHistory: 'common.noData',
  converters: 'common.converterTitle',
  pediatric: 'dashboard.childBmi',
  rangeDisclaimer: 'dashboard.adultBmi',
  reference: 'dashboard.adultBmi',
  reset: 'dashboard.reset',
  retry: 'common.retry',
  saveMeasurement: 'dashboard.weightSaved',
  saving: 'common.loading',
  sleepCalculator: 'dashboard.sleepTracker',
  sleepDuration: 'dashboard.sleep',
  sleepGoal: 'dashboard.sleepGoal',
  stepGoal: 'dashboard.goal',
  stepGoalError: 'common.error',
  stepsError: 'common.error',
  stepsToday: 'dashboard.steps',
  undoWater: 'dashboard.undo',
  upper: 'dashboard.aboveRange',
  validWeightMetric: 'common.weightRangeError',
  wakeTime: 'dashboard.wakeUp',
  waterGoalError: 'common.waterTargetError',
  waterPlanner: 'dashboard.hydration',
  weight: 'dashboard.weight',
  sevenDays: 'dashboard.weekly',
  thirtyDays: 'dashboard.monthly',
  ninetyDays: 'dashboard.custom',
  allTime: 'dashboard.custom',
}

function getTranslation(source, path) {
  return path.split('.').reduce((value, part) => value?.[part], source)
}

function withMetricAliases(translation) {
  const metrics = { ...translation.metrics }
  for (const [key, sourcePath] of Object.entries(metricAliases)) {
    if (metrics[key] === undefined) {
      const localizedValue = getTranslation(translation, sourcePath)
      if (localizedValue !== undefined) metrics[key] = localizedValue
    }
  }
  return { ...translation, metrics }
}

function getSavedLanguage() {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY)
    return supportedLanguages.includes(saved) ? saved : 'en'
  } catch {
    return 'en'
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(Object.entries(localeTranslations).map(([language, translation]) => [
      language,
      { translation: withMetricAliases(translation) },
    ])),
    lng: getSavedLanguage(),
    supportedLngs: supportedLanguages,
    fallbackLng: false,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    parseMissingKeyHandler: key => `[${key}]`,
    initImmediate: false,
  })

i18n.on('languageChanged', language => {
  const normalized = supportedLanguages.includes(language) ? language : 'en'
  document.documentElement.lang = normalized
  document.documentElement.dir = 'ltr'
  try {
    window.localStorage.setItem(LANGUAGE_KEY, normalized)
  } catch (error) {
    console.warn('MediLink could not persist the selected language.', error)
  }
})

document.documentElement.lang = i18n.language || getSavedLanguage()

export default i18n
