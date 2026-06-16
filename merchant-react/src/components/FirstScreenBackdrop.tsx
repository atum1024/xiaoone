import { useId } from 'react'
import { motion } from 'motion/react'

interface FirstScreenBackdropProps {
  className?: string
}

export function FirstScreenBackdrop({ className }: FirstScreenBackdropProps) {
  const rawId = useId().replace(/:/g, '')
  const gradientId = `x1-first-screen-grad-${rawId}`

  return (
    <div className={['x1-first-screen-backdrop', className].filter(Boolean).join(' ')} aria-hidden>
      <svg viewBox="0 0 100 50" className="x1-first-screen-backdrop__glow">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 20 25 C 20 10, 40 10, 50 25 C 60 40, 80 40, 80 25 C 80 10, 60 10, 50 25 C 40 40, 20 40, 20 25 Z"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="25"
          strokeLinecap="round"
          animate={{ rotate: [0, 5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}
