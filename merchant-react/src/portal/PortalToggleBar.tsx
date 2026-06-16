import { Languages, Mail, Moon, Phone, Sun } from 'lucide-react'
import {
  LocalIpRegionToggle,
  LocalPartnerRoleToggle,
  LocalRealNameToggle,
  RegionExperienceToggle,
} from '@xiaoone/region'
import type { PortalPrefs } from './portalPrefs'
import { portalDict } from './dict'

type PortalIdentifierType = 'phone' | 'email'

interface PortalIdentifierSwitch {
  value: PortalIdentifierType
  onChange: (value: PortalIdentifierType) => void
  disabled?: boolean
}

/**
 * 用户端门面页（/login、/register）右上角的「主题 + 语言」切换栏。
 * 样式走 `styles.css` 的 `.x1-portal-toggle*`，与全局 `--xiaoone-*` token 同步。
 */
export function PortalToggleBar({
  prefs,
  identifierSwitch,
}: {
  prefs: PortalPrefs
  identifierSwitch?: PortalIdentifierSwitch
}) {
  const { locale, theme, toggleLocale, toggleTheme, t } = prefs
  const isDark = theme === 'dark'

  return (
    <div className="x1-portal-toggle">
      <button
        type="button"
        onClick={toggleTheme}
        className="x1-portal-toggle__btn"
        aria-label={t(portalDict.toggleTheme)}
        title={isDark ? t(portalDict.light) : t(portalDict.dark)}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <button
        type="button"
        onClick={toggleLocale}
        className="x1-portal-toggle__lang"
        aria-label={t(portalDict.toggleLanguage)}
        title={t(portalDict.toggleLanguage)}
      >
        <Languages size={14} />
        {locale === 'zh' ? 'EN' : '中文'}
      </button>
      <RegionExperienceToggle locale={locale} className="x1-portal-toggle__ip" />
      <LocalIpRegionToggle locale={locale} className="x1-portal-toggle__ip" />
      <LocalRealNameToggle locale={locale} className="x1-portal-toggle__ip" />
      <LocalPartnerRoleToggle locale={locale} className="x1-portal-toggle__ip" />
      {identifierSwitch && (
        <div
          className="x1-portal-toggle__identifier"
          role="group"
          aria-label={t(portalDict.chatSwitchIdentifierHint)}
          data-xiaoone-local-identifier-type={identifierSwitch.value}
        >
          <button
            type="button"
            onClick={() => identifierSwitch.onChange('phone')}
            className={`x1-portal-toggle__identifier-btn ${identifierSwitch.value === 'phone' ? 'is-active' : ''}`}
            aria-pressed={identifierSwitch.value === 'phone'}
            disabled={identifierSwitch.disabled}
            title={t(portalDict.loginIdentifierTabPhone)}
          >
            <Phone size={13} />
            <span>{t(portalDict.loginIdentifierTabPhone)}</span>
          </button>
          <button
            type="button"
            onClick={() => identifierSwitch.onChange('email')}
            className={`x1-portal-toggle__identifier-btn ${identifierSwitch.value === 'email' ? 'is-active' : ''}`}
            aria-pressed={identifierSwitch.value === 'email'}
            disabled={identifierSwitch.disabled}
            title={t(portalDict.loginIdentifierTabEmail)}
          >
            <Mail size={13} />
            <span>{t(portalDict.loginIdentifierTabEmail)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
