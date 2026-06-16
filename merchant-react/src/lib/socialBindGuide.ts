import type { Locale } from '../i18n/types'
import { uiT, uiTpl } from '../i18n/catalogResolve'

export function guidePrompt(platformLabel: string, locale: Locale = 'zh'): string {
  return [
    uiTpl(locale, 'common.social.guideIntro', platformLabel),
    '',
    uiT(locale, 'common.social.guideStep1'),
    uiT(locale, 'common.social.guideStep2'),
    uiTpl(locale, 'common.social.guideStep3', platformLabel),
    uiT(locale, 'common.social.guideStep4'),
    '',
    uiT(locale, 'common.social.guideFinish'),
    uiT(locale, 'common.social.guideFollowUp'),
  ].join('\n')
}
