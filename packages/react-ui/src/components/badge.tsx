import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

export const badgeVariants = cva('xo-badge', {
  variants: {
    variant: {
      default: 'xo-badge--default',
      secondary: 'xo-badge--muted',
      outline: 'xo-badge--outline',
      destructive: 'xo-badge--danger',
    },
    tone: {
      default: 'xo-badge--default',
      success: 'xo-badge--success',
      warning: 'xo-badge--warning',
      danger: 'xo-badge--danger',
      muted: 'xo-badge--muted',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, variant }), className)} {...props} />
}
