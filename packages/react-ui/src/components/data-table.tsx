import * as React from "react"
import { cn } from "../lib/cn"
import { Empty } from "./empty"

export interface Column<T> {
  key: string
  title: string | React.ReactNode
  dataIndex?: keyof T
  render?: (record: T, index: number) => React.ReactNode
  width?: string | number
}

export interface DataTableProps<T> extends React.HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[]
  data: T[]
  rowKey: (record: T) => string
  emptyText?: string
}

export function DataTable<T>({ columns, data, rowKey, emptyText, className, ...props }: DataTableProps<T>) {
  return (
    <div className="w-full overflow-auto border border-[var(--xiaoone-border)] rounded-[var(--xiaoone-r-md)]">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props}>
        <thead className="[&_tr]:border-b [&_tr]:border-[var(--xiaoone-border)] bg-[var(--xiaoone-bg-soft)]">
          <tr className="border-b transition-colors hover:bg-[var(--xiaoone-bg-hover)]">
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className="h-11 px-4 text-left align-middle font-medium text-[var(--xiaoone-fg-mute)]"
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0 bg-[var(--xiaoone-bg-elev)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center">
                <Empty description={emptyText} />
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[var(--xiaoone-border)] transition-colors hover:bg-[var(--xiaoone-bg-hover)]"
              >
                {columns.map(col => (
                  <td key={col.key} className="p-4 align-middle text-[var(--xiaoone-fg)]">
                    {col.render ? col.render(row, i) : col.dataIndex ? String(row[col.dataIndex] ?? '') : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
