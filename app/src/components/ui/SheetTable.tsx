import { type ReactNode } from 'react'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'

export interface SheetColumn {
  key: string
  label: string
  className?: string
}

export interface SheetRow {
  id: string
  cells: Record<string, ReactNode>
}

interface SheetTableProps {
  columns: SheetColumn[]
  rows: SheetRow[]
  onEditRow?: (id: string) => void
  onDeleteRow?: (id: string) => void
}

/**
 * A read-only data-grid styled to look like a Google Sheet tab — dark header
 * bar, thick brutal border, alternating row shading. Used by the Tracker so
 * logged activities look at-a-glance like the spreadsheet they're mirrored to.
 */
export function SheetTable({ columns, rows, onEditRow, onDeleteRow }: SheetTableProps) {
  const hasActions = Boolean(onEditRow || onDeleteRow)
  return (
    <div className="border-4 border-stone-800 rounded-2xl shadow-brutal overflow-hidden overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[560px]">
        <thead>
          <tr className="bg-stone-600">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left text-cream-50 font-display font-bold text-xs uppercase tracking-wide px-3 py-2.5 whitespace-nowrap ${col.className ?? ''}`}
              >
                {col.label}
              </th>
            ))}
            {hasActions && <th className="w-16 bg-stone-600" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? 'bg-cream-50' : 'bg-cream-100'}>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 border-t-2 border-stone-200 align-middle whitespace-nowrap">
                  {row.cells[col.key]}
                </td>
              ))}
              {hasActions && (
                <td className="px-2 border-t-2 border-stone-200 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    {onEditRow && (
                      <button
                        onClick={() => onEditRow(row.id)}
                        className="text-stone-300 hover:text-periwinkle-500 transition-colors"
                        aria-label="Edit row"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDeleteRow && (
                      <button
                        onClick={() => onDeleteRow(row.id)}
                        className="text-stone-300 hover:text-blush-500 transition-colors"
                        aria-label="Delete row"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CHIP_STYLES: Record<string, string> = {
  sage: 'bg-sage-100 text-sage-700 border-sage-500',
  marigold: 'bg-marigold-100 text-marigold-600 border-marigold-400',
  blush: 'bg-blush-100 text-blush-600 border-blush-400',
}

/** A pill that mimics a Google Sheets dropdown-validated cell. */
export function SheetChip({ label, color = 'sage' }: { label: ReactNode; color?: keyof typeof CHIP_STYLES }) {
  return (
    <span className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold border-2 ${CHIP_STYLES[color]}`}>
      {label}
      <ChevronDown size={12} className="opacity-50" />
    </span>
  )
}
