import { useMemo } from 'react'
import { useSoftwareProjectStore } from '../../store/softwareProject'
import './DemoAdminConsole.css'

export default function DemoAdminConsole() {
  const proj = useSoftwareProjectStore()
  const title = useMemo(() => (proj.projectName.trim() || '项目') + ' · 运营后台', [proj.projectName])

  return (
    <div className="dac">
      <aside className="dac-side">
        <div className="dac-side-head">{title}</div>
        <ul className="dac-menu">
          <li className="is-active">仪表盘</li>
          <li>用户与权限</li>
          <li>订单与结算</li>
          <li>内容与素材</li>
          <li>系统设置</li>
        </ul>
      </aside>
      <div className="dac-main">
        <header className="dac-top">
          <span className="dac-breadcrumb">首页 / 仪表盘</span>
          <span className="dac-user">管理员 · Demo</span>
        </header>
        <div className="dac-stats">
          <div className="dac-stat">
            <span className="dac-stat-l">今日 PV</span>
            <span className="dac-stat-v">12.4k</span>
          </div>
          <div className="dac-stat">
            <span className="dac-stat-l">待处理工单</span>
            <span className="dac-stat-v">7</span>
          </div>
          <div className="dac-stat">
            <span className="dac-stat-l">订阅收入</span>
            <span className="dac-stat-v">¥ 42k</span>
          </div>
        </div>
        <section className="dac-panel">
          <h3 className="dac-panel-title">最近动态</h3>
          <table className="dac-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>事件</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>10:24</td>
                <td>新用户注册 · 华东</td>
                <td><span className="dac-tag ok">完成</span></td>
              </tr>
              <tr>
                <td>09:02</td>
                <td>导出报表 · 销售月报</td>
                <td><span className="dac-tag">处理中</span></td>
              </tr>
              <tr>
                <td>昨天</td>
                <td>策略发布 · 灰度 10%</td>
                <td><span className="dac-tag ok">已发布</span></td>
              </tr>
            </tbody>
          </table>
        </section>
        <p className="dac-note">内置演示后台 · 非真实管理端数据</p>
      </div>
    </div>
  )
}
