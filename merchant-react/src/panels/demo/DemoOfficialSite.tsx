import { useSoftwareProjectStore } from '../../store/softwareProject'
import { DemoOfficialSiteVisitorChat } from './DemoOfficialSiteVisitorChat'
import './DemoOfficialSite.css'

export default function DemoOfficialSite() {
  const proj = useSoftwareProjectStore()

  return (
    <div className="dos">
      <header className="dos-nav">
        <div className="dos-brand">
          {proj.logoDataUrl ? (
            <span className="dos-logo"><img src={proj.logoDataUrl} alt="" /></span>
          ) : (
            <span className="dos-logo dos-logo-ph" />
          )}
          <span className="dos-name">{proj.projectName.trim() || 'Acme 官网'}</span>
        </div>
        <nav className="dos-links">
          <span>产品</span>
          <span>方案</span>
          <span>客户</span>
          <span>定价</span>
        </nav>
        <span className="dos-cta">预约演示</span>
      </header>
      <section className="dos-hero">
        <h1>{proj.projectSlogan.trim() || '用数据驱动每一次增长'}</h1>
        <p className="dos-lead">内置演示页 · 非真实线上环境。正式交付后可替换为真实站点或 iframe 外链。</p>
        <div className="dos-hero-btns">
          <button type="button" className="dos-btn dos-btn-primary">免费试用</button>
          <button type="button" className="dos-btn dos-btn-ghost">查看文档</button>
        </div>
      </section>
      <DemoOfficialSiteVisitorChat />
      <section className="dos-grid">
        <div className="dos-card">
          <strong>极速上线</strong>
          <p>模板化部署与灰度发布，缩短从需求到上线周期。</p>
        </div>
        <div className="dos-card">
          <strong>安全合规</strong>
          <p>审计日志、权限分级与数据加密，满足企业审计要求。</p>
        </div>
        <div className="dos-card">
          <strong>全球加速</strong>
          <p>多区域 CDN 与智能路由，保障终端访问体验。</p>
        </div>
      </section>
      <footer className="dos-foot">© Demo 官网 · Xiaoone 用户端内置演示</footer>
    </div>
  )
}
