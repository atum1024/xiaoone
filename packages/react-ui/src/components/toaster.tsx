import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import * as React from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

export const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--xiaoone-bg-elev)] group-[.toaster]:text-[var(--xiaoone-fg)] group-[.toaster]:border-[var(--xiaoone-border)] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[var(--xiaoone-fg-mute)]",
          actionButton:
            "group-[.toast]:bg-[var(--xiaoone-accent)] group-[.toast]:text-[oklch(98.5%_0.006_265)]",
          cancelButton:
            "group-[.toast]:bg-[var(--xiaoone-bg-soft)] group-[.toast]:text-[var(--xiaoone-fg)]",
        },
      }}
      {...props}
    />
  )
}

type ToastInput =
  | React.ReactNode
  | {
      title?: React.ReactNode
      description?: React.ReactNode
      variant?: 'default' | 'destructive' | string
      action?: React.ReactNode
      duration?: number
    }

function showToast(input: ToastInput, options?: Parameters<typeof sonnerToast>[1]) {
  if (
    input
    && typeof input === 'object'
    && !React.isValidElement(input)
    && ('title' in input || 'description' in input || 'variant' in input)
  ) {
    const payload = input as Exclude<ToastInput, React.ReactNode>
    const message = payload.title ?? payload.description ?? ''
    const toastOptions = {
      ...options,
      description: payload.title ? payload.description : undefined,
      action: payload.action,
      duration: payload.duration,
    }
    return payload.variant === 'destructive'
      ? sonnerToast.error(message, toastOptions)
      : sonnerToast(message, toastOptions)
  }
  return sonnerToast(input as React.ReactNode, options)
}

export const toast = Object.assign(showToast, sonnerToast)
