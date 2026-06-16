import React, { Suspense } from 'react'
import { Navigate, Outlet, createBrowserRouter, useLocation, useParams, useRouteError } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RequireAuth } from './RequireAuth'
import { MerchantLayout } from '../layout/MerchantLayout'
import { queryClient } from './queryClient'
import { RouteScrollReset } from '../marketing/components/RouteScrollReset'
import { HomePortalTransitionBridge } from '../portal/HomePortalTransitionBridge'
import { Layout as MarketingLayout } from '../marketing/components/Layout'
import { MarketingIndex } from '../marketing/MarketingIndex'
import { isVipPublicHost } from '../lib/vipDomain'

import { WorkbenchHomePage } from '../pages/WorkbenchHomePage'
import { AgentConversationPage } from '../pages/AgentConversationPage'
import { legacyRedirectTarget, resolveWorkbenchRoute } from './workbenchRouteModel'
import { KefuOverviewPage } from '../pages/KefuOverviewPage'

const LoginPage = React.lazy(() => import('../pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = React.lazy(() => import('../pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = React.lazy(() => import('../pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const AccountCenterPage = React.lazy(() => import('../pages/AccountCenterPage').then(m => ({ default: m.AccountCenterPage })))
const MembershipGatePage = React.lazy(() => import('../pages/MembershipGatePage').then(m => ({ default: m.MembershipGatePage })))
const PlanPurchasePage = React.lazy(() => import('../pages/PlanPurchasePage').then(m => ({ default: m.PlanPurchasePage })))
const GenerationAssetsPage = React.lazy(() => import('../pages/GenerationAssetsPage').then(m => ({ default: m.GenerationAssetsPage })))
const StandaloneSitePortalPage = React.lazy(() => import('../pages/StandaloneSitePortalPage').then(m => ({ default: m.StandaloneSitePortalPage })))
const HermesPanelPage = React.lazy(() => import('../pages/HermesPanelPage').then(m => ({ default: m.HermesPanelPage })))
const SkillsCenterPage = React.lazy(() => import('../pages/SkillsCenterPage').then(m => ({ default: m.SkillsCenterPage })))
const AutomationPage = React.lazy(() => import('../pages/AutomationPage').then(m => ({ default: m.AutomationPage })))
const SocialPostingPage = React.lazy(() => import('../pages/SocialPostingPage').then(m => ({ default: m.SocialPostingPage })))
const SocialBindRedirectPage = React.lazy(() => import('../pages/SocialPostingPage').then(m => ({ default: m.SocialBindRedirectPage })))
const AutomationRepositoryPage = React.lazy(() => import('../pages/AutomationRepositoryPage').then(m => ({ default: m.AutomationRepositoryPage })))
const AutomationFileLibraryPage = React.lazy(() => import('../pages/AutomationFileLibraryPage').then(m => ({ default: m.AutomationFileLibraryPage })))
const AgentArchivesPage = React.lazy(() => import('../pages/AgentArchivesPage').then(m => ({ default: m.AgentArchivesPage })))
const BillingSuccessPage = React.lazy(() => import('../pages/BillingSuccessPage').then(m => ({ default: m.BillingSuccessPage })))
const VipLandingPage = React.lazy(() => import('../marketing/vip/VipLandingPage').then(m => ({ default: m.VipLandingPage })))
const VipFigmaPage = React.lazy(() => import('../marketing/vip-figma/VipFigmaPage').then(m => ({ default: m.VipFigmaPage })))

const BrandGuidelines = React.lazy(() => import('../marketing/components/BrandGuidelines').then(m => ({ default: m.BrandGuidelines })))
const Pricing = React.lazy(() => import('../marketing/components/Pricing').then(m => ({ default: m.Pricing })))
const Consultant = React.lazy(() => import('../marketing/components/Consultant').then(m => ({ default: m.Consultant })))
const Programmer = React.lazy(() => import('../marketing/components/Programmer').then(m => ({ default: m.Programmer })))
const CustomerService = React.lazy(() => import('../marketing/components/CustomerService').then(m => ({ default: m.CustomerService })))
const MarketingPage = React.lazy(() => import('../marketing/components/Marketing').then(m => ({ default: m.Marketing })))
const ChannelBusiness = React.lazy(() => import('../marketing/components/ChannelBusiness').then(m => ({ default: m.ChannelBusiness })))
const About = React.lazy(() => import('../marketing/components/About').then(m => ({ default: m.About })))
const LegalPage = React.lazy(() => import('../marketing/components/LegalPage').then(m => ({ default: m.LegalPage })))
const CheckoutPage = React.lazy(() => import('../marketing/components/CheckoutPage').then(m => ({ default: m.CheckoutPage })))
const DeveloperResourcePage = React.lazy(() => import('../marketing/components/DeveloperResourcePage').then(m => ({ default: m.DeveloperResourcePage })))



function LegacyWorkbenchRedirect() {
  const location = useLocation()
  const target = legacyRedirectTarget(location.pathname, location.search)
  if (!target) return <Navigate to="/workbench" replace />
  return <Navigate to={target} replace />
}

function PublicSiteIndex() {
  if (isVipPublicHost()) return <Navigate to="/vip" replace />
  return <MarketingIndex />
}

const Suspended = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="mr-surface p-8 text-center text-sm text-gray-400">Loading...</div>}>
    {children}
  </Suspense>
)

const MarketingSuspended = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
    {children}
  </Suspense>
)

const CHUNK_RELOAD_KEY = 'xiaoone:route-chunk-reload'

function getRouteErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '')
  }
  return ''
}

function isDynamicImportFailure(message: string): boolean {
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|loading chunk/i.test(message)
}

function readSessionFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeSessionFlag(key: string) {
  try {
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Ignore storage restrictions; the manual refresh button remains available.
  }
}

function RouteErrorFallback() {
  const error = useRouteError()
  const message = getRouteErrorMessage(error)
  const isChunkError = isDynamicImportFailure(message)
  const [isReloading, setIsReloading] = React.useState(false)

  React.useEffect(() => {
    if (!isChunkError) return
    const key = `${CHUNK_RELOAD_KEY}:${window.location.pathname}`
    if (readSessionFlag(key)) return
    writeSessionFlag(key)
    setIsReloading(true)
    window.setTimeout(() => window.location.reload(), 150)
  }, [isChunkError])

  const title = isChunkError ? '页面版本已更新' : '页面暂时不可用'
  const description = isChunkError
    ? isReloading
      ? '正在刷新到最新版本。'
      : '刷新后即可继续访问。'
    : '请刷新页面后重试。'

  return (
    <div className="mr-loading-screen">
      <div className="mr-route-error" role="alert">
        <strong>{title}</strong>
        <span>{description}</span>
        <button type="button" onClick={() => window.location.reload()}>
          刷新
        </button>
      </div>
    </div>
  )
}

function RouterProviders() {
  const shouldShowReactQueryDevtools =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS === 'true'

  return (
    <QueryClientProvider client={queryClient}>
      <HomePortalTransitionBridge />
      <Outlet />
      {shouldShowReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}

function stableAgentConversationRouteKey(routeContextKey: string) {
  return routeContextKey.replace(/:thread:[^:]+$/, '')
}

function AgentConversationRoute() {
  const { threadId = '' } = useParams()
  const location = useLocation()
  const route = resolveWorkbenchRoute(location.pathname, location.search)
  const routeKey = route?.kind === 'agent' ? route.routeContextKey : 'agent:unknown'
  const stableKey = stableAgentConversationRouteKey(routeKey)
  return <AgentConversationPage key={stableKey} threadId={threadId} />
}

function resolveRouterBasename(): string | undefined {
  const fromEnv = import.meta.env.VITE_ROUTER_BASENAME?.trim()
  if (fromEnv) {
    return fromEnv.startsWith('/') ? fromEnv.replace(/\/$/, '') || '/' : `/${fromEnv.replace(/\/$/, '')}`
  }

  const path = window.location.pathname
  if (path === '/user' || path.startsWith('/user/')) {
    return '/user'
  }
  return undefined
}

export const router = createBrowserRouter([
  {
    element: <RouterProviders />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: '/login', element: <Suspended><LoginPage /></Suspended> },
      { path: '/register', element: <Suspended><RegisterPage /></Suspended> },
      { path: '/forgot-password', element: <Suspended><ForgotPasswordPage /></Suspended> },
      { path: '/vip', element: <MarketingSuspended><VipFigmaPage /></MarketingSuspended> },
      { path: '/v1', element: <MarketingSuspended><VipLandingPage /></MarketingSuspended> },
      {
        Component: RouteScrollReset,
        children: [
          {
            Component: MarketingLayout,
            children: [
              { index: true, Component: PublicSiteIndex },
              { path: 'brand', element: <MarketingSuspended><BrandGuidelines /></MarketingSuspended> },
              { path: 'consultant', element: <MarketingSuspended><Consultant /></MarketingSuspended> },
              { path: 'programmer', element: <MarketingSuspended><Programmer /></MarketingSuspended> },
              { path: 'customer-service', element: <MarketingSuspended><CustomerService /></MarketingSuspended> },
              { path: 'marketing', element: <MarketingSuspended><MarketingPage /></MarketingSuspended> },
              { path: 'channel-business', element: <MarketingSuspended><ChannelBusiness /></MarketingSuspended> },
              { path: 'pricing', element: <MarketingSuspended><Pricing /></MarketingSuspended> },
              { path: 'checkout/:plan', element: <MarketingSuspended><CheckoutPage /></MarketingSuspended> },
              { path: 'about', element: <MarketingSuspended><About /></MarketingSuspended> },
              { path: 'privacy', element: <MarketingSuspended><LegalPage kind="privacy" /></MarketingSuspended> },
              { path: 'terms', element: <MarketingSuspended><LegalPage kind="terms" /></MarketingSuspended> },
              { path: 'refund-policy', element: <MarketingSuspended><LegalPage kind="refund" /></MarketingSuspended> },
              { path: 'contact', element: <MarketingSuspended><LegalPage kind="contact" /></MarketingSuspended> },
              { path: 'support', element: <MarketingSuspended><LegalPage kind="contact" /></MarketingSuspended> },
              { path: 'compliance', element: <MarketingSuspended><LegalPage kind="compliance" /></MarketingSuspended> },
              { path: 'developers/docs', element: <MarketingSuspended><DeveloperResourcePage kind="docs" /></MarketingSuspended> },
              { path: 'developers/sdk', element: <MarketingSuspended><DeveloperResourcePage kind="sdk" /></MarketingSuspended> },
              { path: 'developers/api', element: <MarketingSuspended><DeveloperResourcePage kind="api" /></MarketingSuspended> },
            ],
          },
          {
            element: <RequireAuth />,
            children: [
              { path: 'membership', element: <Suspended><MembershipGatePage /></Suspended> },
              { path: 'billing/success', element: <Suspended><BillingSuccessPage /></Suspended> },
              {
                element: <MerchantLayout />,
                children: [
                  { path: 'workbench', element: <WorkbenchHomePage /> },
                  { path: 'workbench/assistant', element: <AgentConversationRoute /> },
                  { path: 'workbench/assistant/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/consultant', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/consultant/threads/:threadId', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/system', element: <AgentConversationRoute /> },
                  { path: 'workbench/system/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/standalone-site', element: <StandaloneSitePortalPage /> },
                  { path: 'workbench/marketing', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/marketing/threads/:threadId', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/marketing/image', element: <AgentConversationRoute /> },
                  { path: 'workbench/marketing/image/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/marketing/video', element: <AgentConversationRoute /> },
                  { path: 'workbench/marketing/video/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/marketing/copy', element: <AgentConversationRoute /> },
                  { path: 'workbench/marketing/copy/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/kefu', element: <KefuOverviewPage /> },
                  { path: 'workbench/kefu/settings', element: <KefuOverviewPage /> },
                  { path: 'workbench/kefu/help-center', element: <KefuOverviewPage /> },
                  { path: 'workbench/kefu/stores', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/kefu/qa-templates', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/kefu/quick-replies', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/kefu/tech-config', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/live-chat', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/support', element: <AgentConversationRoute /> },
                  { path: 'workbench/support/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/agency', element: <AgentConversationRoute /> },
                  { path: 'workbench/agency/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/automation', element: <AutomationPage /> },
                  { path: 'workbench/automation/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/automation/social', element: <SocialPostingPage /> },
                  { path: 'workbench/automation/social/bind-redirect', element: <SocialBindRedirectPage /> },
                  { path: 'workbench/repository', element: <AutomationRepositoryPage /> },
                  { path: 'workbench/file-library', element: <AutomationFileLibraryPage /> },
                  { path: 'workbench/feedback', element: <AgentConversationRoute /> },
                  { path: 'workbench/feedback/threads/:threadId', element: <AgentConversationRoute /> },
                  { path: 'workbench/skills', element: <SkillsCenterPage /> },
                  { path: 'workbench/pricing', element: <PlanPurchasePage /> },
                  { path: 'workbench/account', element: <AccountCenterPage /> },
                  { path: 'workbench/team-management', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/archives', element: <Suspended><AgentArchivesPage /></Suspended> },
                  { path: 'workbench/generation-assets', element: <GenerationAssetsPage /> },
                  { path: 'workbench/hermes', element: <HermesPanelPage /> },
                  { path: 'workbench/us-numbers', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/us-numbers/sms', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/dcpay-cards', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/dcpay-cards/transactions', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/corpus', element: <LegacyWorkbenchRedirect /> },
                  { path: 'workbench/agent', element: <LegacyWorkbenchRedirect /> },
                ],
              },
            ],
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
], { basename: resolveRouterBasename() })
