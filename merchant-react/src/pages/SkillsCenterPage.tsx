import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Package, RefreshCw } from 'lucide-react'
import { Button, Badge, Switch, toast, Empty } from '@xiaoone/react-ui'
import { APageHeader } from '../panels/account/APageHeader'
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
  label: string
  domain: string
  pluginKey: string
}

const EMPLOYEES: EmployeeTarget[] = [
  { key: 'consultant', label: '顾问', domain: 'general', pluginKey: 'consultant' },
  { key: 'automation', label: '自动化', domain: 'general', pluginKey: '' },
  { key: 'system', label: '程序员', domain: 'general', pluginKey: 'self' },
  { key: 'system-outsource', label: '程序员·外包', domain: 'general', pluginKey: 'outsource' },
  { key: 'marketing', label: '推广大师', domain: 'marketing', pluginKey: '' },
  { key: 'support', label: '渠道专员', domain: 'support', pluginKey: '' },
  { key: 'agency', label: '商务经理', domain: 'agency', pluginKey: '' },
  { key: 'kefu', label: '客服', domain: 'kefu', pluginKey: '' },
]

export function SkillsCenterPage() {
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
      toast({ title: '加载技能失败', description: err?.message || '未知错误' })
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
        toast({ title: '已卸载' })
      } else {
        await installSkill(item.slug)
        toast({ title: '已安装' })
      }
      await loadSkills()
      ws.bumpSkillBindings?.()
    } catch (err: any) {
      toast({ title: item.installed ? '卸载失败' : '安装失败', description: err?.message || '未知错误' })
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
        toast({ title: '已设置自动加载' })
      } else {
        const binding = activeBinding(item)
        if (binding) {
          await removeSkillBinding(binding.id)
          toast({ title: '已取消自动加载' })
        }
      }
      await loadSkills()
      ws.bumpSkillBindings?.()
    } catch (err: any) {
      toast({ title: '设置失败', description: err?.message || '未知错误' })
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
      <header className="skills-head">
        <div>
          <h1>技能</h1>
          <p>为不同智能员工安装并启用自动加载能力。</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSkills} disabled={loading}>刷新</Button>
      </header>

      <div className="skills-employees">
        {EMPLOYEES.map(item => (
          <button
            key={item.key}
            type="button"
            className={`skills-employee ${selectedEmployeeKey === item.key ? 'is-on' : ''}`}
            onClick={() => setSelectedEmployeeKey(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8"><Empty description="加载中..." /></div>
      ) : visibleSkills.length === 0 ? (
        <div className="py-8"><Empty description="当前员工暂无可用技能" /></div>
      ) : (
        <div className="skills-grid">
          {visibleSkills.map(item => (
            <article key={item.slug} className="skill-card">
              <div className="skill-top">
                <div className="skill-name-wrap">
                  <strong>{item.name}</strong>
                  <small>{item.vendor || 'xiaoone'}</small>
                </div>
                {item.is_official && <Badge variant="outline" className="rounded-full text-green-500 border-green-200 bg-green-50/50">官方</Badge>}
              </div>
              <p className="skill-desc">{item.description}</p>
              <div className="skill-meta">
                <span className="skill-cat"><Package size={12} /> {item.category || '通用'}</span>
                <span>已绑定 {item.binding_count || 0} 个员工</span>
              </div>
              <div className="skill-actions">
                <button
                  type="button"
                  className={`skill-install ${item.installed ? 'is-on' : ''}`}
                  disabled={Boolean(installing[item.slug])}
                  onClick={() => onToggleInstall(item)}
                >
                  {installing[item.slug] ? '处理中...' : item.installed ? '已安装（点击卸载）' : '安装技能'}
                </button>
                <label className="skill-auto">
                  <span>自动加载</span>
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
