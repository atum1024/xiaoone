import { useSitePreferences } from '../sitePreferences'

/** Marketing pages i18n — proxies unified locale store via SitePreferencesProvider. */
export function useMarketingI18n() {
  const { t, tKey, locale } = useSitePreferences()
  return { t, tKey, locale }
}
