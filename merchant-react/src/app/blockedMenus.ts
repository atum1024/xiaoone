export const USER_BLOCKED_MENU_IDS = new Set([
  'automation',
  'repository',
  'skills',
  'support',
  'system',
])

export function isUserBlockedMenu(menuId: string): boolean {
  return USER_BLOCKED_MENU_IDS.has(menuId)
}
