import type { AccountSettingsSubTab, AccountTab, WorkView } from './workspace'
import { resolveRegistryMatch } from '../app/workbenchRouteRegistry'
import type { NavCategory } from '../lib/nav'
import type { BusinessKey } from '../lib/composer'

export interface WorkspaceRoutePatch {
  view: WorkView
  selectedCategory: NavCategory | null
  selectedKefuItem: string | null
  selectedThreadId: string | null
  activeDomain: string
  accountTab?: AccountTab
  accountSettingsSubTab?: AccountSettingsSubTab
  heroBusiness?: BusinessKey | null
}

export function mapRouteContextToWorkspacePatch(pathname: string, search = ''): WorkspaceRoutePatch | null {
  const match = resolveRegistryMatch(pathname, search)
  if (!match) return null
  const { entry, threadId, queryTab } = match

  if (entry.kind === 'home') {
    return {
      view: 'hero',
      selectedCategory: null,
      selectedKefuItem: null,
      selectedThreadId: null,
      activeDomain: 'general',
      heroBusiness: null,
    }
  }

  if (entry.kind === 'agent') {
    const category = (entry.navCategory || entry.moduleId || 'consultant') as NavCategory
    if (threadId) {
      return {
        view: 'agent',
        selectedCategory: category,
        selectedKefuItem: null,
        selectedThreadId: threadId,
        activeDomain: String(entry.domain),
      }
    }
    if (entry.moduleId === 'automation') {
      return {
        view: 'automation',
        selectedCategory: 'automation',
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'general',
      }
    }
    return {
      view: 'agent',
      selectedCategory: category,
      selectedKefuItem: null,
      selectedThreadId: null,
      activeDomain: String(entry.domain),
    }
  }

  if (entry.id === 'kefu' || entry.id === 'kefuSettings' || entry.id === 'kefuHelpCenter') {
    const kefuItem = queryTab?.kefuItem
      || (entry.id === 'kefuHelpCenter' ? 'help-center' : entry.id === 'kefu' ? 'waiting' : 'stores')
    return {
      view: 'kefu',
      selectedCategory: 'kefu',
      selectedKefuItem: kefuItem,
      selectedThreadId: null,
      activeDomain: 'kefu',
    }
  }

  if (entry.id === 'repository') {
    return { view: 'repository', selectedCategory: 'automation', selectedKefuItem: null, selectedThreadId: null, activeDomain: 'general' }
  }
  if (entry.id === 'fileLibrary') {
    return { view: 'file-library', selectedCategory: 'automation', selectedKefuItem: null, selectedThreadId: null, activeDomain: 'general' }
  }
  if (entry.id === 'generationAssets') {
    return { view: 'generation-assets', selectedCategory: null, selectedKefuItem: null, selectedThreadId: null, activeDomain: 'general' }
  }
  if (entry.id === 'skills') {
    return { view: 'news', selectedCategory: null, selectedKefuItem: null, selectedThreadId: null, activeDomain: 'news' }
  }
  if (entry.id === 'account') {
    const section = new URLSearchParams(search).get('section')
    if (section === 'team') {
      return { view: 'account', selectedCategory: null, selectedKefuItem: null, selectedThreadId: null, activeDomain: 'account', accountTab: 'settings', accountSettingsSubTab: 'team' }
    }
    if (section === 'archives') {
      return { view: 'account', selectedCategory: null, selectedKefuItem: null, selectedThreadId: null, activeDomain: 'account', accountTab: 'settings', accountSettingsSubTab: 'archives' }
    }
    if (section === 'partner') {
      return { view: 'account', selectedCategory: null, selectedKefuItem: null, selectedThreadId: null, activeDomain: 'account', accountTab: 'settings', accountSettingsSubTab: 'partner' }
    }
    return { view: 'account', selectedCategory: null, selectedKefuItem: null, selectedThreadId: null, activeDomain: 'account' }
  }

  return {
    view: 'placeholder',
    selectedCategory: null,
    selectedKefuItem: null,
    selectedThreadId: null,
    activeDomain: String(entry.domain),
  }
}
