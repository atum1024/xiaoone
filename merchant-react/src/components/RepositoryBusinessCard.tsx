import type { CSSProperties } from 'react'
import { Icon, type IconName } from './Icon'
import './repository-business-card.css'

export type RepositoryImageKey = 'servers' | 'sms' | 'acceleration' | 'adCard' | 'app' | 'miniProgram' | 'icp'
export type RepositoryCardAction =
  | 'buy'
  | 'chat'
  | 'download'
  | 'configure'
  | 'numbers'
  | 'sms'
  | 'cards'
  | 'transactions'

export const REPOSITORY_CARD_IMAGES: Record<RepositoryImageKey, string> = {
  servers: '/repository-card-images/generated/server-gpt2.png',
  sms: '/repository-card-images/generated/sms-gpt2.png',
  acceleration: '/repository-card-images/generated/acceleration-gpt2.png',
  adCard: '/repository-card-images/generated/icp-payment-gpt2.png',
  app: '/repository-card-images/generated/app-gpt2.png',
  miniProgram: '/repository-card-images/generated/mini-program-gpt2.png',
  icp: '/repository-card-images/generated/icp-payment-gpt2.png',
}

export interface RepositoryBusinessCardData {
  title: string
  subtitle: string
  price: string
  badge: string
  tone: string
  color?: string
  icon: IconName
  imageKey?: RepositoryImageKey
  flag?: {
    src: string
    alt: string
  }
  specs: string[]
  actions: RepositoryCardAction[]
  bannerImageUrl?: string
  isComingSoon?: boolean
}

interface RepositoryBusinessCardProps {
  card: RepositoryBusinessCardData
  imageKey?: RepositoryImageKey
  onAction: (action: RepositoryCardAction) => void
}

function resolveImageKey(card: RepositoryBusinessCardData, imageKey?: RepositoryImageKey): RepositoryImageKey {
  if (card.imageKey) return card.imageKey
  if (imageKey) return imageKey
  return 'servers'
}

function actionMeta(action: RepositoryCardAction): { icon: IconName; label: string } {
  if (action === 'configure') return { icon: 'gear', label: '智能配置加速器' }
  if (action === 'numbers') return { icon: 'grid', label: '我的号码' }
  if (action === 'sms') return { icon: 'message-square', label: '短信列表' }
  if (action === 'cards') return { icon: 'brand-visa', label: '我的卡' }
  if (action === 'transactions') return { icon: 'wallet', label: '开卡' }
  if (action === 'buy') return { icon: 'cart', label: '开通' }
  if (action === 'download') return { icon: 'file', label: '下载' }
  return { icon: 'message', label: '对话' }
}

export function RepositoryBusinessCard({ card, imageKey, onAction }: RepositoryBusinessCardProps) {
  const resolvedImageKey = resolveImageKey(card, imageKey)
  const coverImage = card.bannerImageUrl || REPOSITORY_CARD_IMAGES[resolvedImageKey]

  return (
    <article
      className="repo-resource-card"
      style={{
        '--repo-card-hue': card.tone,
        '--repo-card-brand': card.color || `oklch(42% 0.17 ${card.tone})`,
        '--repo-card-image': `url(${coverImage})`,
      } as CSSProperties}
    >
      <div className="repo-card-cover" aria-hidden="true" />
      <div className="repo-card-content">
        <div className="repo-card-top">
          <span className="repo-card-icon">
            {card.flag ? (
              <img className="repo-card-flag" src={card.flag.src} alt={card.flag.alt} loading="lazy" />
            ) : (
              <Icon name={card.icon} size={18} />
            )}
          </span>
          <span className="repo-card-badge">{card.badge}</span>
        </div>
        <div className="repo-card-copy">
          <strong className="repo-card-title-row">
            <span>{card.title}</span>
            {card.isComingSoon ? <em className="repo-card-soon">即将上线</em> : null}
          </strong>
          <span>{card.subtitle}</span>
        </div>
        <div className="repo-card-price">{card.price}</div>
        <div className="repo-card-actions">
          {card.actions.map((action) => {
            const meta = actionMeta(action)
            return (
              <button
                key={action}
                type="button"
                className={`repo-card-button repo-card-button--${action}`}
                onClick={() => onAction(action)}
              >
                <Icon name={meta.icon} size={14} />
                {meta.label}
              </button>
            )
          })}
        </div>
        <div className="repo-card-specs">
          {card.specs.map(spec => (
            <span key={spec}>{spec}</span>
          ))}
        </div>
      </div>
    </article>
  )
}
