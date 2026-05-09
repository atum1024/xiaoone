import { api } from './httpClient'

export interface SkillBinding {
  id: string
  merchant_id: number
  skill_slug: string
  domain: string
  plugin_key: string
  auto_load: boolean
}

export interface SkillItem {
  slug: string
  name: string
  vendor: string
  description: string
  category: string
  is_official: boolean
  target_domains: string[]
  installed: boolean
  binding_count: number
  bindings: SkillBinding[]
}

const BASE = '/api/v1/skills'

export async function listSkills() {
  const r = await api.get<{ items: SkillItem[] }>(`${BASE}/`)
  return r.data?.items || []
}

export async function installSkill(id: string) {
  const r = await api.post(`${BASE}/${id}/install/`)
  return r.data
}

export async function uninstallSkill(id: string) {
  const r = await api.post(`${BASE}/${id}/uninstall/`)
  return r.data
}

export async function createSkillBinding(payload: any) {
  const r = await api.post(`${BASE}/bindings/`, payload)
  return r.data
}

export async function removeSkillBinding(id: string) {
  const r = await api.delete(`${BASE}/bindings/${id}/`)
  return r.data
}