import './lib/chatKitBoot'
import { syncDeployEnvMeta } from '@xiaoone/react-ui'
import { installDomMutationGuard } from './lib/domMutationGuard'
import { migrateLegacySitePreferences } from './lib/migrateLegacySitePreferences'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import '@xiaoone/design-tokens/tokens.css'
import '@xiaoone/design-tokens/app-shell.css'
import '@xiaoone/design-tokens/ui-states.css'
import '@xiaoone/design-tokens/product-surfaces.css'
import '@xiaoone/react-ui/styles.css'
import './styles.css'
import './styles/portal-tokens.css'
import './marketing/styles/index.css'

installDomMutationGuard()
migrateLegacySitePreferences()
syncDeployEnvMeta()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
