export function defaultXiaooneUsername(email?: string, phone?: string) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPhone = (phone || '').trim()
  const seed = cleanEmail && !cleanEmail.endsWith('@phone.xiaoone.local')
    ? cleanEmail.split('@')[0]
    : cleanPhone
  const compact = seed.replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 24)
  return compact ? `xiaoone${compact}` : 'xiaooneuser'
}

export function displayUserName(user?: { name?: string; email?: string; phone?: string } | null) {
  return (user?.name || '').trim() || defaultXiaooneUsername(user?.email, user?.phone)
}

export function displayUserContact(user?: { email?: string; phone?: string } | null) {
  const email = (user?.email || '').trim()
  if (email && !email.endsWith('@phone.xiaoone.local')) return email
  return (user?.phone || email || '').trim()
}

