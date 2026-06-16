import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import * as React from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const toastClassNames = {
  toast: "xo-toast",
  default: "xo-toast--default",
  success: "xo-toast--success",
  error: "xo-toast--error",
  info: "xo-toast--info",
  warning: "xo-toast--warning",
  title: "xo-toast__title",
  description: "xo-toast__description",
  content: "xo-toast__content",
  icon: "xo-toast__icon",
  closeButton: "xo-toast__close",
  actionButton: "xo-toast__action",
  cancelButton: "xo-toast__cancel",
}

export const Toaster = ({ position = "top-right", toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group xo-toaster"
      position={position}
      closeButton
      gap={10}
      offset={20}
      mobileOffset={14}
      visibleToasts={4}
      toastOptions={{
        duration: 3600,
        closeButton: true,
        ...toastOptions,
        classNames: {
          ...toastClassNames,
          ...toastOptions?.classNames,
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
    if (payload.variant === 'destructive')
      return sonnerToast.error(message, toastOptions)
    if (payload.variant === 'success')
      return sonnerToast.success(message, toastOptions)
    if (payload.variant === 'warning')
      return sonnerToast.warning(message, toastOptions)
    if (payload.variant === 'info')
      return sonnerToast.info(message, toastOptions)
    return sonnerToast(message, toastOptions)
  }
  return sonnerToast(input as React.ReactNode, options)
}

export const toast = Object.assign(showToast, sonnerToast)
