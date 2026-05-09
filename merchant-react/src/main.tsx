import './lib/chatKitBoot'
import { installDomMutationGuard } from './lib/domMutationGuard'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import '@xiaoone/design-tokens/tokens.css'
import '@xiaoone/design-tokens/app-shell.css'
import '@xiaoone/react-ui/styles.css'
import './styles.css'
import './styles/portal-tokens.css'

installDomMutationGuard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
