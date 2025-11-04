'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Table as TableIcon } from '@phosphor-icons/react';

/** New API */
interface NewTableProps {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  caption?: string;
  className?: string;
}

/** Legacy API */
type LegacyAlign = 'left' | 'center' | 'right';
interface LegacyColumn {
  header: string;
  align?: LegacyAlign;
  widthClass?: string;
}
interface LegacyTableProps {
  columns: LegacyColumn[];
  rows: React.ReactNode[][];
  caption?: string;
  dense?: boolean;
  className?: string;
}

type TableProps = NewTableProps | LegacyTableProps;

function isLegacy(
  cols: NewTableProps['columns'] | LegacyTableProps['columns'],
): cols is LegacyTableProps['columns'] {
  return typeof (cols as any)?.[0] === 'object';
}

export function Table(props: TableProps) {
  const { caption, className } = props as any;
  const rows = (props as any).rows as Array<Array<React.ReactNode>>;
  const dense = (props as LegacyTableProps).dense ?? false;
  const legacy = isLegacy((props as any).columns);

  const columns = legacy
    ? (props as LegacyTableProps).columns.map((c) => c.header)
    : (props as NewTableProps).columns;

  const getCell = (i: number) => {
    if (!legacy) return 'px-4 py-3';
    const col = (props as LegacyTableProps).columns[i];
    const align =
      col?.align === 'center' ? 'text-center' : col?.align === 'right' ? 'text-right' : '';
    return cn(dense ? 'px-4 py-2' : 'px-4 py-3', align, col?.widthClass);
  };

  return (
    <div
      className={cn(
        // ⬇ soft ring instead of border
        'overflow-hidden rounded-xl ring-1 ring-[hsl(var(--line)/.12)]',
        'bg-gradient-to-b from-white/90 to-white/70 shadow-sm backdrop-blur',
        className,
      )}
    >
      <table className="w-full border-collapse text-left text-sm">
        {caption ? (
          <caption className="bg-white/60 px-4 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground ring-1 ring-inset ring-[hsl(var(--line)/.10)]">
            <div className="flex items-center gap-2">
              <TableIcon
                aria-hidden
                className="size-4 text-[hsl(var(--accent-blue))]"
                weight="duotone"
              />
              <span>{caption}</span>
            </div>
          </caption>
        ) : null}

        <thead className="bg-white/45">
          <tr className="ring-1 ring-inset ring-[hsl(var(--line)/.10)]">
            {columns.map((c) => (
              <th
                key={c}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, r) => (
            <tr
              key={r}
              className={cn(
                // row background stripe
                r % 2 === 0 ? 'bg-white/70' : 'bg-white/50',
                // subtle row separator
                'ring-1 ring-inset ring-[hsl(var(--line)/.08)]',
                'transition-colors duration-200 ease-in-out hover:bg-[hsl(var(--accent-blue))/0.04]',
              )}
            >
              {row.map((cell, i) => (
                <td key={i} className={cn('align-top text-sm text-foreground/80', getCell(i))}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** keep default for any lingering default imports */
export default Table;
