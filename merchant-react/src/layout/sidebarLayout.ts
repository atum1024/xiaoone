export const SIDEBAR_COLLAPSED_WIDTH = 60
export const SIDEBAR_MIN_EXPANDED_WIDTH = 176
export const SIDEBAR_DEFAULT_WIDTH = 260
export const SIDEBAR_MAX_WIDTH = 400

export function clampSidebarExpandedWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_EXPANDED_WIDTH, Math.round(width)))
}

export function resolveSidebarResize(width: number): { collapsed: boolean; width: number } {
  if (width < SIDEBAR_MIN_EXPANDED_WIDTH) {
    return { collapsed: true, width: SIDEBAR_DEFAULT_WIDTH }
  }
  return { collapsed: false, width: clampSidebarExpandedWidth(width) }
}
