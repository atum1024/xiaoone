import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

export const buttonVariants = cva('xo-button', {
  variants: {
    variant: {
      default: 'xo-button--default',
      secondary: 'xo-button--secondary',
      ghost: 'xo-button--ghost',
      destructive: 'xo-button--destructive',
      outline: 'xo-button--outline',
    },
    size: {
      sm: 'xo-button--sm',
      md: 'xo-button--md',
      lg: 'xo-button--lg',
      icon: 'xo-button--icon',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
