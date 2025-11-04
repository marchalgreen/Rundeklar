'use client';

import { memo, useMemo, type ComponentType } from 'react';
import {
  CaretDown,
  MagnifyingGlass,
  Package,
  Palette,
  Ruler,
  SquaresFour,
  Tag,
  Eyeglasses,
  X,
} from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import type { FacetKey } from '@/store/inventoryView';
import { STOCK_STATUS_LABELS, type InventoryStockStatus } from '@/lib/inventoryFacets';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  active: boolean;
  disabled?: boolean;
}

export interface FacetSection {
  key: FacetKey;
  title: string;
  options: FacetOption[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  limit?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

interface FacetSidebarProps {
  sections: FacetSection[];
  onToggle: (key: FacetKey, value: string) => void;
  onClear: (key: FacetKey) => void;
  onClearAll?: () => void;
}

const SECTION_ICONS: Partial<Record<FacetKey, ComponentType<IconProps>>> = {
  brand: Tag,
  model: Eyeglasses,
  size: Ruler,
  category: SquaresFour,
  color: Palette,
  stock: Package,
};

function formatLabel(key: FacetKey, value: string): string {
  if (key === 'stock') {
    const stockValue = value as InventoryStockStatus;
    return STOCK_STATUS_LABELS[stockValue] ?? value;
  }
  return value;
}

function FacetSidebarComponent({ sections, onToggle, onClear, onClearAll }: FacetSidebarProps) {
  const activeCount = sections.reduce(
    (total, section) => total + section.options.filter((opt) => opt.active).length,
    0,
  );

  const renderedSections = useMemo(() => {
    return sections.map((section) => {
      const activeInSection = section.options.filter((opt) => opt.active).length;
      if (section.options.length === 0) return null;

      const collapsed = section.collapsed ?? false;
      const limit = section.limit ?? Number.POSITIVE_INFINITY;
      const isExpanded = section.expanded ?? false;
      const shouldLimit = Number.isFinite(limit) && !isExpanded && section.options.length > limit;
      const visibleOptions = shouldLimit ? section.options.slice(0, limit) : section.options;
      const hiddenCount = shouldLimit ? section.options.length - visibleOptions.length : 0;
      const Icon = SECTION_ICONS[section.key];

      return (
        <section
          key={section.key}
          aria-label={section.title}
          className="facet-card p-2.5 sm:p-3.5 space-y-2"
        >
          {/* Full-width clickable header for easier target + keyboard a11y */}
          <button
            type="button"
            className={cn(
              'group flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1.5',
              'text-xs font-medium text-foreground/80 transition hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[hsl(var(--accent-blue))]',
            )}
            onClick={section.onToggleCollapse ?? (() => {})}
            aria-expanded={!collapsed}
            aria-controls={`facet-${section.key}`}
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent bg-white/80 text-muted-foreground transition group-hover:bg-[hsl(var(--accent-blue)/0.1)] group-hover:text-[hsl(var(--accent-blue))]"
                aria-hidden
              >
                <CaretDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    collapsed ? '-rotate-90' : 'rotate-0',
                  )}
                  aria-hidden
                />
              </span>
              {Icon && (
                <Icon size={16} weight="duotone" className="text-[hsl(var(--accent-blue))]" />
              )}
              <span className="text-foreground/80 normal-case">{section.title}</span>
            </span>

            {activeInSection > 0 && (
              <span className="inline-flex items-center gap-2">
                <span className="text-[11px] text-muted">
                  {activeInSection} aktiv{activeInSection > 1 ? 'e' : ''}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onClear(section.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      onClear(section.key);
                    }
                  }}
                  className="text-[11px] text-muted transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[hsl(var(--accent-blue))]"
                  aria-label="Ryd"
                >
                  Ryd
                </span>
              </span>
            )}
          </button>

          <div
            id={`facet-${section.key}`}
            data-collapsed={collapsed}
            className="grid transition-[grid-template-rows] duration-300 ease-in-out data-[collapsed=true]:grid-rows-[0fr]"
          >
            <div className="overflow-visble space-y-2">
              {section.onSearchChange && (
                <div className="relative">
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={section.searchValue ?? ''}
                    onChange={(event) => section.onSearchChange?.(event.target.value)}
                    placeholder={section.searchPlaceholder ?? 'Søg'}
                    className="w-full rounded-xl border border-transparent bg-white/70 px-8 py-1.5 text-xs text-foreground shadow-inner transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))] focus-visible:ring-offset-1"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {visibleOptions.map((option) => {
                  const tone =
                    section.key === 'stock'
                      ? option.value === 'in'
                        ? 'check'
                        : option.value === 'low'
                          ? 'pickup'
                          : option.value === 'out'
                            ? 'repair'
                            : undefined
                      : undefined;

                  return (
                    <button
                      key={option.value}
                      onClick={() => onToggle(section.key, option.value)}
                      disabled={option.disabled}
                      className={cn(
                        'facet-chip group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[hsl(var(--accent-blue))]',
                        option.disabled && 'pointer-events-none opacity-40',
                        option.active
                          ? 'shadow-[0_6px_18px_rgba(37,99,235,0.18)] hover:shadow-[0_8px_22px_rgba(37,99,235,0.22)]'
                          : 'text-muted hover:text-foreground shadow-sm hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]',
                      )}
                      aria-pressed={option.active}
                      data-active={option.active}
                      data-disabled={option.disabled}
                      data-tone={tone}
                    >
                      <span className="max-w-[9rem] truncate" title={option.label}>
                        {formatLabel(section.key, option.label)}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                          option.active
                            ? 'bg-white/80 text-[hsl(var(--accent-blue))]'
                            : 'bg-[hsl(var(--foreground)/0.06)] text-muted',
                        )}
                      >
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {hiddenCount > 0 && section.onToggleExpand && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={section.onToggleExpand}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--accent-blue))] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[hsl(var(--accent-blue))]"
                    aria-expanded={isExpanded}
                  >
                    <CaretDown
                      className={cn(
                        'h-3 w-3 transition-transform',
                        isExpanded ? 'rotate-180' : 'rotate-0',
                      )}
                      aria-hidden
                    />
                    {isExpanded ? 'Vis færre' : `+ ${hiddenCount} flere`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    });
  }, [sections, onClear, onToggle]);

  return (
    <aside className="space-y-4" aria-label="Filtre">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Filtre
          </h3>
          {activeCount > 0 && (
            <p className="text-[11px] text-muted mt-0.5" aria-live="polite">
              {activeCount} aktive
            </p>
          )}
        </div>
        {activeCount > 0 && onClearAll && (
          <button
            className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))]"
            onClick={onClearAll}
          >
            <X className="h-3.5 w-3.5" weight="bold" aria-hidden /> Ryd alle
          </button>
        )}
      </header>

      <div className="space-y-3">{renderedSections}</div>
    </aside>
  );
}

const FacetSidebar = memo(FacetSidebarComponent);

FacetSidebar.displayName = 'FacetSidebar';

export default FacetSidebar;
