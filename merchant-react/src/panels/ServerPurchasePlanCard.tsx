import { useMemo } from 'react'
import { toast } from '@xiaoone/react-ui'
import { Icon } from '../components/Icon'
import { usePreferences } from '../app/preferences'
import './ServerPurchasePlanCard.css'

interface Props {
  planId?: 'ev3' | 'starter'
  selectable?: boolean
  selected?: boolean
  showBuyButton?: boolean
  onSelect?: (planId: 'ev3' | 'starter') => void
  onBuy?: (planId: 'ev3' | 'starter') => void
}

export default function ServerPurchasePlanCard({
  planId = 'ev3',
  selectable = false,
  selected = false,
  showBuyButton = true,
  onSelect,
  onBuy,
}: Props) {
  const { isZh, t } = usePreferences()

  const title = planId === 'starter' ? 'Starter-S1' : 'Enterprise-V3'

  const specs = useMemo(() => {
    if (planId === 'starter') {
      return ['2 vCPU', '2 GiB 内存', '40 GiB SSD', '1 TiB / 200 Mbps', '1 个 IPv4', '适合联调与演示']
    }
    return [
      '4 vCPU',
      '4 GiB 内存',
      '20 GiB / RAID-10 SSD 系统盘',
      '60 GiB / RAID-10 SSD 数据盘',
      '5 TiB / 500 Mbps 峰值速率',
      '20Gbps DDoS 防御',
      '1 个 IPv4',
      '不支持 Windows',
      '任选多个地区 / 机房',
    ]
  }, [planId])

  const priceMain = planId === 'starter' ? 'HK$88.00' : 'HK$240.00'

  function onCardClick() {
    if (selectable && onSelect) {
      onSelect(planId)
    }
  }

  function onBuyDemo(e: React.MouseEvent) {
    e.stopPropagation()
    if (!showBuyButton) return
    if (onBuy) onBuy(planId)
    toast({ title: '演示环境', description: '请在「我的服务器」使用「购买服务器」完成模拟支付' })
  }

  return (
    <article
      className={`spc ${selectable ? 'spc--selectable' : ''} ${selectable && selected ? 'spc--selected' : ''}`}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCardClick()
        }
      }}
    >
      <div className="spc-glow" aria-hidden="true" />
      <header className="spc-head">
        <div className="spc-head-inner">
          {planId === 'ev3' && (
            <span className="spc-badge">{isZh ? '推荐' : 'Popular'}</span>
          )}
          <h3 className="spc-title">{title}</h3>
        </div>
      </header>
      <div className="spc-body">
        <ul className="spc-specs">
          {specs.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
        <div className="spc-buy">
          <span className="spc-from">起 / FROM</span>
          <div className="spc-price">
            {priceMain}<span className="spc-ccy">HKD</span>
          </div>
          <span className="spc-cycle">/ 月</span>
          {showBuyButton && (
            <button type="button" className="spc-btn" onClick={onBuyDemo}>
              <Icon name="cart" size={15} />
              购买
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
