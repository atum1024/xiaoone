import { Languages, Moon, Sun } from 'lucide-react'
import type { PortalPrefs } from './portalPrefs'
import { portalDict } from './dict'

/**
 * 用户端门面页（/login、/register）右上角的「主题 + 语言」切换栏。
 *
 * 设计风格沿用官网 Header 上的 pill toggle，但去掉 dark: Tailwind 变体（用户端
 * 使用 [data-theme] 而不是 .dark），改用条件 className 直接绑定。
 */
export function PortalToggleBar({ prefs }: { prefs: PortalPrefs }) {
  const { locale, theme, toggleLocale, toggleTheme, t } = prefs
  const isDark = theme === 'dark'

  const wrapBase
    = 'pointer-events-auto inline-flex items-center gap-1.5 rounded-full backdrop-blur-md p-1 shadow-sm border'
  const wrapTone = isDark
    ? 'bg-white/10 border-white/20'
    : 'bg-white/70 border-white/80'

  const btnBase
    = 'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors'
  const btnTone = isDark
    ? 'text-slate-100 hover:bg-white/15'
    : 'text-slate-700 hover:bg-white'

  const langBase = 'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-colors'
  const langTone = isDark
    ? 'text-slate-100 hover:bg-white/15'
    : 'text-slate-700 hover:bg-white'

  return (
    <div className={`${wrapBase} ${wrapTone}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className={`${btnBase} ${btnTone}`}
        aria-label={t(portalDict.toggleTheme)}
        title={isDark ? t(portalDict.light) : t(portalDict.dark)}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <button
        type="button"
        onClick={toggleLocale}
        className={`${langBase} ${langTone}`}
        aria-label={t(portalDict.toggleLanguage)}
        title={t(portalDict.toggleLanguage)}
      >
        <Languages size={14} />
        {locale === 'zh' ? 'EN' : '中文'}
      </button>
    </div>
  )
}
