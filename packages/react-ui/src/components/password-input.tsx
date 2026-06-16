import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../lib/cn'

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  defaultRevealed?: boolean
  hideLabel?: string
  showLabel?: string
  toggleClassName?: string
  wrapperClassName?: string
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({
    className,
    defaultRevealed = false,
    disabled,
    hideLabel = '隐藏明文',
    showLabel = '显示明文',
    style,
    toggleClassName,
    wrapperClassName,
    ...props
  }, ref) => {
    const [revealed, setRevealed] = React.useState(defaultRevealed)
    const toggleLabel = revealed ? hideLabel : showLabel

    return (
      <span className={cn('xo-password-input', wrapperClassName)}>
        <input
          ref={ref}
          className={cn('xo-password-input__field', className || 'xo-input')}
          type={revealed ? 'text' : 'password'}
          disabled={disabled}
          style={{ ...style, paddingRight: '42px' }}
          {...props}
        />
        <button
          type="button"
          className={cn('xo-password-input__toggle', toggleClassName)}
          aria-label={toggleLabel}
          aria-pressed={revealed}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setRevealed(value => !value)}
        >
          {revealed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </span>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
