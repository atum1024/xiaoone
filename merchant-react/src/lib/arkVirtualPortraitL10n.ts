import type { Locale } from '../i18n/types'
import type { ArkVirtualPortrait } from './arkVirtualPortraits'
import {
  ARK_PORTRAIT_COUNTRY_L10N,
  ARK_PORTRAIT_GENDER_L10N,
  ARK_PORTRAIT_OCCUPATION_L10N,
  ARK_PORTRAIT_TEMPERAMENT_L10N,
} from './arkVirtualPortraitL10nData'

export {
  ARK_PORTRAIT_COUNTRY_L10N,
  ARK_PORTRAIT_GENDER_L10N,
  ARK_PORTRAIT_OCCUPATION_L10N,
  ARK_PORTRAIT_TEMPERAMENT_L10N,
}

const PORTRAIT_FIELD_L10N: Record<string, Record<string, { en: string }>> = {
  country: ARK_PORTRAIT_COUNTRY_L10N,
  occupation: ARK_PORTRAIT_OCCUPATION_L10N,
  temperament: ARK_PORTRAIT_TEMPERAMENT_L10N,
  gender: ARK_PORTRAIT_GENDER_L10N,
}

const ARK_PORTRAIT_COUNTRY_ALIASES: Record<string, string> = {
  中国人: '中国',
}

export function portraitMetadataValue(portrait: ArkVirtualPortrait, key: string) {
  const value = portrait.metadata?.[key]
  if (value === null || typeof value === 'undefined')
    return ''
  return String(value).trim()
}

export function portraitCountryValue(portrait: ArkVirtualPortrait) {
  const country = portraitMetadataValue(portrait, 'country')
  if (!country)
    return ''
  return ARK_PORTRAIT_COUNTRY_ALIASES[country] || country
}

export function localizePortraitField(value: string, locale: Locale, field?: keyof typeof PORTRAIT_FIELD_L10N) {
  const raw = String(value || '').trim()
  if (!raw || locale !== 'en')
    return raw
  const dict = field ? PORTRAIT_FIELD_L10N[field] : null
  if (dict?.[raw]?.en)
    return dict[raw].en
  for (const table of Object.values(PORTRAIT_FIELD_L10N)) {
    if (table[raw]?.en)
      return table[raw].en
  }
  return raw
}

function localizedAgeLabel(portrait: ArkVirtualPortrait, locale: Locale) {
  const age = portraitMetadataValue(portrait, 'age')
  if (age)
    return locale === 'en' ? age : `${age}岁`
  const ageBand = portraitMetadataValue(portrait, 'ageBand')
  if (!ageBand)
    return ''
  return locale === 'en' ? ageBand : ageBand
}

export function formatPortraitLabel(portrait: ArkVirtualPortrait, locale: Locale) {
  const country = localizePortraitField(portraitCountryValue(portrait), locale, 'country')
  const gender = localizePortraitField(portraitMetadataValue(portrait, 'gender'), locale, 'gender')
  const age = localizedAgeLabel(portrait, locale)
  const occupation = localizePortraitField(portraitMetadataValue(portrait, 'occupation'), locale, 'occupation')
  const parts = [country, age, gender, occupation].filter(Boolean)
  if (parts.length)
    return parts.join(locale === 'en' ? ' · ' : ' ')
  return localizePortraitField(String(portrait.label || '').trim(), locale) || portrait.assetId
}

export function formatPortraitHint(portrait: ArkVirtualPortrait, locale: Locale) {
  const country = localizePortraitField(portraitCountryValue(portrait), locale, 'country')
  const gender = localizePortraitField(portraitMetadataValue(portrait, 'gender'), locale, 'gender')
  const age = localizedAgeLabel(portrait, locale)
  const occupation = localizePortraitField(portraitMetadataValue(portrait, 'occupation'), locale, 'occupation')
  const ageBand = portraitMetadataValue(portrait, 'ageBand')
  const sep = ' · '
  return [country, gender, age, occupation, ageBand].filter(Boolean).join(sep)
}

export function portraitSearchTokens(portrait: ArkVirtualPortrait, locale: Locale) {
  const country = portraitCountryValue(portrait)
  const gender = portraitMetadataValue(portrait, 'gender')
  const occupation = portraitMetadataValue(portrait, 'occupation')
  const temperament = portraitMetadataValue(portrait, 'temperament')
  const description = portraitMetadataValue(portrait, 'description')
  const tokens = [
    portrait.label,
    portrait.hint,
    portrait.assetId,
    country,
    gender,
    portraitMetadataValue(portrait, 'genderRaw'),
    portraitMetadataValue(portrait, 'age'),
    portraitMetadataValue(portrait, 'ageBand'),
    occupation,
    temperament,
    description,
    formatPortraitLabel(portrait, 'zh'),
    formatPortraitLabel(portrait, 'en'),
    formatPortraitHint(portrait, 'zh'),
    formatPortraitHint(portrait, 'en'),
  ]
  if (locale === 'en') {
    tokens.push(
      localizePortraitField(country, 'en', 'country'),
      localizePortraitField(gender, 'en', 'gender'),
      localizePortraitField(occupation, 'en', 'occupation'),
      localizePortraitField(temperament, 'en', 'temperament'),
    )
  }
  return tokens.join(' ').toLowerCase()
}

export function sortPortraitCountries(countries: string[], locale: Locale) {
  if (locale === 'en') {
    return [...countries].sort((a, b) =>
      localizePortraitField(a, 'en', 'country').localeCompare(localizePortraitField(b, 'en', 'country'), 'en'),
    )
  }
  return [...countries].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}
