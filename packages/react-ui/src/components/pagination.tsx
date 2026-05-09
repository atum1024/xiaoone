import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "../lib/cn"
import { Button, type ButtonProps } from "./button"

interface PaginationProps extends Omit<React.ComponentProps<"nav">, 'onChange'> {
  page?: number
  pageSize?: number
  total?: number
  onChange?: (page: number, pageSize: number) => void
}

export const Pagination = ({ className, page, pageSize = 20, total, onChange, children, ...props }: PaginationProps) => {
  const pageCount = page && total != null ? Math.max(1, Math.ceil(total / pageSize)) : 1
  if (page && total != null && onChange) {
    return (
      <nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props}>
        <div className="flex items-center gap-2 text-sm text-[var(--xiaoone-fg-mute)]">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1, pageSize)}>上一页</Button>
          <span>{page} / {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1, pageSize)}>下一页</Button>
        </div>
      </nav>
    )
  }
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    >
      {children}
    </nav>
  )
}

export const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

export const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

export const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: ButtonProps & { isActive?: boolean }) => (
  <Button
    aria-current={isActive ? "page" : undefined}
    variant={isActive ? "secondary" : "ghost"}
    size={size}
    className={cn(className)}
    {...props}
  />
)

export const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="md"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>上一页</span>
  </PaginationLink>
)

export const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="md"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>下一页</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)

export const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
