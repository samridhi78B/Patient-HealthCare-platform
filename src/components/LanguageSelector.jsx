import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../i18n.js'

export default function LanguageSelector({ variant = 'compact' }) {
  const { t, i18n } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage || i18n.language || 'en'

  if (variant === 'cards') {
    return (
      <section className="language-section" aria-labelledby="language-selector-heading">
        <div className="mx-auto max-w-7xl px-5 py-9 lg:px-8 lg:py-11">
          <div className="mb-5 text-center sm:text-left">
            <h2 id="language-selector-heading" className="language-section-heading">{t('selector.heading')}</h2>
            <p className="mt-1 text-sm text-navy-500">{t('selector.subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {supportedLanguages.map(language => {
              const selected = activeLanguage === language
              const languageLabel = t(`selector.languages.${language}.name`)
              return (
                <button
                  key={language}
                  type="button"
                  lang={language}
                  aria-label={t('selector.choose', { language: languageLabel })}
                  aria-pressed={selected}
                  onClick={() => i18n.changeLanguage(language)}
                  className={`language-card ${selected ? 'language-card--selected' : ''}`}
                >
                  <span className="language-card-label">{t(`selector.languages.${language}.label`)}</span>
                  <span className="language-card-name">{languageLabel}</span>
                  <span className="language-card-subtitle">{t(`selector.languages.${language}.subtitle`)}</span>
                  {selected && <span className="language-card-selected">{t('selector.selected')}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  return (
    <label className="language-select-wrap">
      <span className="sr-only">{t('selector.heading')}</span>
      <select
        className="language-select"
        aria-label={t('selector.heading')}
        value={activeLanguage}
        onChange={event => i18n.changeLanguage(event.target.value)}
      >
        {supportedLanguages.map(language => (
          <option key={language} value={language} lang={language}>
            {t(`selector.languages.${language}.name`)}
          </option>
        ))}
      </select>
    </label>
  )
}
