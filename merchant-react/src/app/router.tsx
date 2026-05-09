import React, { Suspense } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'
import { RequireAuth } from './RequireAuth'
import { MerchantLayout } from '../layout/MerchantLayout'

const LoginPage = React.lazy(() => import('../pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = React.lazy(() => import('../pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const WorkbenchHomePage = React.lazy(() => import('../pages/WorkbenchHomePage').then(m => ({ default: m.WorkbenchHomePage })))
const KefuOverviewPage = React.lazy(() => import('../pages/KefuOverviewPage').then(m => ({ default: m.KefuOverviewPage })))
const AgentConversationPage = React.lazy(() => import('../pages/AgentConversationPage').then(m => ({ default: m.AgentConversationPage })))
const AccountCenterPage = React.lazy(() => import('../pages/AccountCenterPage').then(m => ({ default: m.AccountCenterPage })))
const TeamChatPage = React.lazy(() => import('../pages/TeamChatPage').then(m => ({ default: m.TeamChatPage })))
const TeamManagementPage = React.lazy(() => import('../pages/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })))
const AgentArchivesPage = React.lazy(() => import('../pages/AgentArchivesPage').then(m => ({ default: m.AgentArchivesPage })))
const GenerationAssetsPage = React.lazy(() => import('../pages/GenerationAssetsPage').then(m => ({ default: m.GenerationAssetsPage })))
const SkillsCenterPage = React.lazy(() => import('../pages/SkillsCenterPage').then(m => ({ default: m.SkillsCenterPage })))
const PlatformTeamGatePage = React.lazy(() => import('../pages/PlatformTeamGatePage').then(m => ({ default: m.PlatformTeamGatePage })))
const AutomationPage = React.lazy(() => import('../pages/AutomationPage').then(m => ({ default: m.AutomationPage })))
const AutomationFileLibraryPage = React.lazy(() => import('../pages/AutomationFileLibraryPage').then(m => ({ default: m.AutomationFileLibraryPage })))

const Suspended = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="mr-surface p-8 text-center text-sm text-gray-400">Loading...</div>}>
    {children}
  </Suspense>
)

export const router = createBrowserRouter([
  { path: '/login', element: <Suspended><LoginPage /></Suspended> },
  { path: '/register', element: <Suspended><RegisterPage /></Suspended> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <MerchantLayout />,
        children: [
          { index: true, element: <Navigate to="/workbench" replace /> },
          { path: 'workbench', element: <Suspended><WorkbenchHomePage /></Suspended> },
          { path: 'workbench/consultant', element: <Suspended><AgentConversationPage /></Suspended> },
          { path: 'workbench/system', element: <Suspended><AgentConversationPage /></Suspended> },
          { path: 'workbench/marketing', element: <Suspended><AgentConversationPage /></Suspended> },
          { path: 'workbench/kefu', element: <Suspended><KefuOverviewPage /></Suspended> },
          { path: 'workbench/kefu/stores', element: <Suspended><KefuOverviewPage /></Suspended> },
          { path: 'workbench/kefu/qa-templates', element: <Suspended><KefuOverviewPage /></Suspended> },
          { path: 'workbench/kefu/tech-config', element: <Suspended><KefuOverviewPage /></Suspended> },
          { path: 'workbench/live-chat', element: <Navigate to="/workbench/kefu" replace /> },
          { path: 'workbench/support', element: <Suspended><AgentConversationPage /></Suspended> },
          { path: 'workbench/agency', element: <Suspended><AgentConversationPage /></Suspended> },
          { path: 'workbench/automation', element: <Suspended><AutomationPage /></Suspended> },
          { path: 'workbench/file-library', element: <Suspended><AutomationFileLibraryPage /></Suspended> },
          { path: 'workbench/feedback', element: <Suspended><AgentConversationPage /></Suspended> },
          { path: 'workbench/skills', element: <Suspended><SkillsCenterPage /></Suspended> },
          { path: 'workbench/account', element: <Suspended><AccountCenterPage /></Suspended> },
          { path: 'workbench/team-management', element: <Suspended><TeamManagementPage /></Suspended> },
          { path: 'workbench/archives', element: <Suspended><AgentArchivesPage /></Suspended> },
          { path: 'workbench/generation-assets', element: <Suspended><GenerationAssetsPage /></Suspended> },
          { path: 'workbench/team-chat', element: <Suspended><TeamChatPage /></Suspended> },
          { path: 'workbench/platform-team', element: <Suspended><PlatformTeamGatePage /></Suspended> },
          { path: 'workbench/corpus', element: <Navigate to="/workbench/kefu/qa-templates" replace /> },
          { path: 'workbench/agent', element: <Navigate to="/workbench/consultant" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
