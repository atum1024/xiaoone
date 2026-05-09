import * as React from "react"
import { cn } from "../lib/cn"
import { Minus, Plus } from "lucide-react"

export interface InputNumberProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
}

export const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  ({ className, value = 0, min, max, step = 1, onChange, ...props }, ref) => {
    const handleMinus = () => {
      const next = value - step
      if (min === undefined || next >= min) onChange?.(next)
    }
    const handlePlus = () => {
      const next = value + step
      if (max === undefined || next <= max) onChange?.(next)
    }

    return (
      <div className={cn("inline-flex items-center rounded-md border border-[var(--xiaoone-border)]", className)}>
        <button
          type="button"
          disabled={min !== undefined && value <= min}
          onClick={handleMinus}
          className="flex h-9 w-9 items-center justify-center rounded-l-md hover:bg-[var(--xiaoone-bg-hover)] disabled:opacity-50 text-[var(--xiaoone-fg)]"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={e => onChange?.(Number(e.target.value))}
          className="flex h-9 w-12 text-center text-sm border-x border-[var(--xiaoone-border)] bg-transparent outline-none [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none text-[var(--xiaoone-fg)]"
          {...props}
        />
        <button
          type="button"
          disabled={max !== undefined && value >= max}
          onClick={handlePlus}
          className="flex h-9 w-9 items-center justify-center rounded-r-md hover:bg-[var(--xiaoone-bg-hover)] disabled:opacity-50 text-[var(--xiaoone-fg)]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    )
  }
)
InputNumber.displayName = "InputNumber"
