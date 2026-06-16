import { useEffect, useMemo, useState } from 'react'
import { Package, RefreshCw } from 'lucide-react'
import { Button, Badge, Switch, toast, Empty } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import { useWorkspaceStore } from '../store/workspace'
import {
  createSkillBinding,
  installSkill,
  listSkills,
  removeSkillBinding,
  uninstallSkill,
  type SkillBinding,
  type SkillItem,
} from '../lib/skillsApi'
import './skills-center-page.css'

interface EmployeeTarget {
  key: string
  labelKey?: string
  label?: string
  domain: string
  pluginKey: string
}

const EMPLOYEES: EmployeeTarget[] = [
  { key: 'consultant', label: 'xiaoone', domain: 'general', pluginKey: 'consultant' },
  { key: 'automation', labelKey: 'automation.skills.employee.automation', domain: 'general', pluginKey: '' },
  { key: 'system', labelKey: 'automation.skills.employee.system', domain: 'general', pluginKey: 'self' },
  { key: 'system-outsource', labelKey: 'automation.skills.employee.systemOutsource', domain: 'general', pluginKey: 'outsource' },
  { key: 'marketing', labelKey: 'automation.skills.employee.marketing', domain: 'marketing', pluginKey: '' },
  { key: 'support', labelKey: 'automation.skills.employee.support', domain: 'support', pluginKey: '' },
  { key: 'agency', labelKey: 'automation.skills.employee.agency', domain: 'agency', pluginKey: '' },
  { key: 'kefu', labelKey: 'automation.skills.employee.kefu', domain: 'kefu', pluginKey: '' },
]

export function SkillsCenterPage() {
  const { t, tpl } = usePreferences()
  const ws = useWorkspaceStore()
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState('consultant')
  const [installing, setInstalling] = useState<Record<string, boolean>>({})
  const [bindingLoading, setBindingLoading] = useState<Record<string, boolean>>({})

  const selectedEmployee = useMemo(
    () => EMPLOYEES.find(item => item.key === selectedEmployeeKey) || EMPLOYEES[0],
    [selectedEmployeeKey],
  )

  const employeeLabel = (item: EmployeeTarget) => (
    item.labelKey ? t(item.labelKey) : (item.label || item.key)
  )

  const visibleSkills = useMemo(() => {
    return skills.filter((item) => {
      if (!Array.isArray(item.target_domains) || item.target_domains.length === 0)
        return true
      return item.target_domains.includes(selectedEmployee.domain)
    })
  }, [selectedEmployee.domain, skills])

  function activeBinding(item: SkillItem): SkillBinding | null {
    return item.bindings.find(binding => (
      binding.domain === selectedEmployee.domain
      && binding.plugin_key === selectedEmployee.pluginKey
    )) || null
  }

  async function loadSkills() {
    setLoading(true)
    try {
      const rows = await listSkills()
      setSkills(rows)
    } catch (err: any) {
      setSkills([])
      toast({ title: t('automation.skills.loadFailed'), description: err?.message || t('automation.archives.unknownError') })
    } finally {
      setLoading(false)
    }
  }

  async function onToggleInstall(item: SkillItem) {
    if (installing[item.slug]) return
    setInstalling(prev => ({ ...prev, [item.slug]: true }))
    try {
      if (item.installed) {
        await uninstallSkill(item.slug)
        toast({ title: t('automation.skills.uninstalled') })
      } else {
        await installSkill(item.slug)
        toast({ title: t('automation.skills.installed') })
      }
      await loadSkills()
      ws.bumpSkillBindings?.()
    } catch (err: any) {
      toast({
        title: item.installed ? t('automation.skills.uninstallFailed') : t('automation.skills.installFailed'),
        description: err?.message || t('automation.archives.unknownError'),
      })
    } finally {
      setInstalling(prev => {
        const next = { ...prev }
        delete next[item.slug]
        return next
      })
    }
  }

  async function onToggleBinding(item: SkillItem, enabled: boolean) {
    const loadingKey = `${item.slug}:${selectedEmployee.key}`
    if (bindingLoading[loadingKey]) return
    setBindingLoading(prev => ({ ...prev, [loadingKey]: true }))
    try {
      if (enabled) {
        await createSkillBinding({
          skill_slug: item.slug,
          domain: selectedEmployee.domain,
          plugin_key: selectedEmployee.pluginKey,
          auto_load: true,
        })
        toast({ title: t('automation.skills.autoLoadOn') })
      } else {
        const binding = activeBinding(item)
        if (binding) {
          await removeSkillBinding(binding.id)
          toast({ title: t('automation.skills.autoLoadOff') })
        }
      }
      await loadSkills()
      ws.bumpSkillBindings?.()
    } catch (err: any) {
      toast({ title: t('automation.skills.settingsFailed'), description: err?.message || t('automation.archives.unknownError') })
    } finally {
      setBindingLoading(prev => {
        const next = { ...prev }
        delete next[loadingKey]
        return next
      })
    }
  }

  useEffect(() => {
    loadSkills()
  }, [])

  return (
    <section className="skills-page">
      <div className="skills-toolbar">
        <div className="skills-employees" role="tablist" aria-label={t('automation.skills.employeesAria')}>
          {EMPLOYEES.map(item => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selectedEmployeeKey === item.key}
              className={`skills-employee ${selectedEmployeeKey === item.key ? 'is-on' : ''}`}
              onClick={() => setSelectedEmployeeKey(item.key)}
            >
              {employeeLabel(item)}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={loadSkills} disabled={loading}>
          <RefreshCw size={14} />
          {t('automation.skills.refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="py-8"><Empty description={t('automation.skills.loading')} /></div>
      ) : visibleSkills.length === 0 ? (
        <div className="py-8"><Empty description={t('automation.skills.empty')} /></div>
      ) : (
        <div className="skills-grid">
          {visibleSkills.map(item => (
            <article key={item.slug} className="skill-card">
              <div className="skill-top">
                <div className="skill-name-wrap">
                  <strong>{item.name}</strong>
                  <small>{item.vendor || 'xiaoone'}</small>
                </div>
                {item.is_official && <Badge variant="outline" className="rounded-full text-green-500 border-green-200 bg-green-50/50">{t('automation.skills.official')}</Badge>}
              </div>
              <p className="skill-desc">{item.description}</p>
              <div className="skill-meta">
                <span className="skill-cat"><Package size={12} /> {item.category || t('automation.skills.categoryDefault')}</span>
                <span>{tpl('automation.skills.boundCount', String(item.binding_count || 0))}</span>
              </div>
              <div className="skill-actions">
                <button
                  type="button"
                  className={`skill-install ${item.installed ? 'is-on' : ''}`}
                  disabled={Boolean(installing[item.slug])}
                  onClick={() => onToggleInstall(item)}
                >
                  {installing[item.slug]
                    ? t('automation.skills.processing')
                    : item.installed
                      ? t('automation.skills.installedUninstall')
                      : t('automation.skills.install')}
                </button>
                <label className="skill-auto">
                  <span>{t('automation.skills.autoLoad')}</span>
                  <Switch
                    checked={Boolean(activeBinding(item))}
                    disabled={!item.installed || Boolean(bindingLoading[`${item.slug}:${selectedEmployee.key}`])}
                    onCheckedChange={v => onToggleBinding(item, v)}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
