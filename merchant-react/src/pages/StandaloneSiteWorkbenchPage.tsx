import { KeyRound } from 'lucide-react'
import { usePreferences } from '../app/preferences'
import { StandaloneSiteAccountConfig } from './StandaloneSiteAccountConfig'
import './standalone-site-portal-page.css'

export function StandaloneSiteWorkbenchPage() {
  const { t } = usePreferences()

  return (
    <div className="sa-portal">
      <div className="sa-block sa-block--narrow">
        <section className="sa-section">
          <div className="sa-section__head">
            <div className="sa-section__title"><KeyRound size={16} strokeWidth={1.9} /> {t('standalone.account.title')}</div>
            <div className="sa-section__desc">{t('standalone.workbench.desc')}</div>
          </div>
          <div className="sa-section__body">
            <StandaloneSiteAccountConfig />
          </div>
        </section>
      </div>
    </div>
  )
}
