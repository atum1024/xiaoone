import type { ComponentType } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  Handshake,
  Image as ImageIcon,
  LifeBuoy,
  PenLine,
  Sparkles,
  Video,
  Wrench,
} from 'lucide-react'
import { usePreferences } from '../app/preferences'
import { activeNewConversationCard, routeForModule, type NewConversationCardId } from '../app/workbenchRouteModel'
import './NewConversationCards.css'

type CardIconProps = { size?: number; className?: string }

interface NewConversationCardDef {
  id: NewConversationCardId
  route: string
  labelKey?: string
  brandLabel?: string
  icon: ComponentType<CardIconProps>
}

const NEW_CONVERSATION_CARDS: NewConversationCardDef[] = [
  { id: 'xiaoone', route: routeForModule('newChat'), brandLabel: 'XIAOONE', icon: Sparkles },
  { id: 'software', route: routeForModule('system'), labelKey: 'common.nav.software', icon: Wrench },
  { id: 'marketingImage', route: routeForModule('marketingImage'), labelKey: 'common.nav.marketingImage', icon: ImageIcon },
  { id: 'marketingVideo', route: routeForModule('marketingVideo'), labelKey: 'common.nav.marketingVideo', icon: Video },
  { id: 'marketingCopy', route: routeForModule('marketingCopy'), labelKey: 'common.nav.marketingCopy', icon: PenLine },
  { id: 'agency', route: routeForModule('agency'), labelKey: 'common.nav.agency', icon: Handshake },
  { id: 'feedback', route: routeForModule('feedback'), labelKey: 'common.nav.feedback', icon: LifeBuoy },
]

export function resolveActiveNewConversationCard(pathname: string): NewConversationCardId | null {
  return activeNewConversationCard(pathname)
}


export interface NewConversationCardsProps {
  draft?: string
  disabled?: boolean
}

export function NewConversationCards({ draft = '', disabled = false }: NewConversationCardsProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = usePreferences()
  const activeId = resolveActiveNewConversationCard(location.pathname)

  function handleSelect(card: NewConversationCardDef) {
    if (disabled || card.id === activeId)
      return
    const text = (draft || '').trim()
    navigate(card.route, { state: { draft: text } })
  }

  return (
    <div
      className="mr-new-conv-cards"
      role="tablist"
      aria-label={t('common.workbench.newConversationCards')}
    >
      {NEW_CONVERSATION_CARDS.map((card) => {
        const Icon = card.icon
        const label = card.brandLabel || t(card.labelKey || card.id)
        const isActive = card.id === activeId
        return (
          <Link
            key={card.id}
            to={card.route}
            role="tab"
            aria-selected={isActive}
            aria-disabled={disabled}
            className={`mr-new-conv-card${isActive ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
            onClick={(event) => {
              event.preventDefault()
              handleSelect(card)
            }}
            title={label}
          >
            <span className="mr-new-conv-card__icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <span className="mr-new-conv-card__label">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
