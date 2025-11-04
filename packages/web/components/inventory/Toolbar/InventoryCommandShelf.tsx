'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { autoLinkOne } from '@/lib/catalog/autoLink';
import {
  Books,
  Buildings,
  ChartPieSlice,
  Check,
  Eye,
  Globe,
  MagnifyingGlass,
  Plus,
  Storefront,
  Trash,
} from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useInventoryView,
  type SourceMode,
  type StockFilter,
  type ViewDensity,
} from '@/store/inventoryView';
import { useInventory, type InventoryCategory } from '@/store/inventory';
import { useCatalogLink } from '@/store/catalogLink';

export type InventoryCommandShelfProps = {
  q: string;
  onQChange: (v: string) => void;

  category: 'Alle' | InventoryCategory;
  onCategoryChange: (c: InventoryCommandShelfProps['category']) => void;

  stockMode: StockFilter;
  lowThreshold: number;
  onStockChange: (m: StockFilter) => void;

  density?: ViewDensity;
  onDensityChange?: (d: ViewDensity) => void;

  /** NEW: hover preview toggle */
  previewEnabled?: boolean;
  onTogglePreview?: (on: boolean) => void;

  resultCount: number;
  activeFilterCount?: number;
  onClearFilters: () => void;

  columnsMenu: React.ReactNode;
  exportMenu: React.ReactNode;
  importButton: React.ReactNode;
  dashboardButton?: React.ReactNode;

  onAdjust?: () => void;
  onScan?: () => void;
  onLabels?: () => void;
  canAdjust?: boolean;
  canLabels?: boolean;

  savedViews?: Array<{ id: string; name: string; isActive?: boolean; isSeeded?: boolean }>;
  onSaveView?: () => void;
  onApplyView?: (id: string) => void;
  onDeleteView?: (id: string) => void;
};

const CATS: Array<InventoryCommandShelfProps['category']> = [
  'Alle',
  'Frames',
  'Sunglasses',
  'Lenses',
  'Accessories',
  'Contacts',
];

const STOCK: Array<{ key: StockFilter; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'in', label: 'På lager' },
  { key: 'low', label: 'Lavt' },
  { key: 'out', label: 'Udsolgt' },
];

const SOURCES = [
  { mode: 'store', label: 'Butik', Icon: Storefront },
  { mode: 'network', label: 'Kæde', Icon: Buildings },
  { mode: 'catalog', label: 'Katalog', Icon: Books },
  { mode: 'all', label: 'Alle', Icon: Globe },
] as const satisfies ReadonlyArray<{ mode: SourceMode; label: string; Icon: typeof Storefront }>;

const SOURCE_FILTERS = [
  { key: 'store', label: 'Butik' },
  { key: 'network', label: 'Kæde' },
  { key: 'catalog', label: 'Katalog' },
] as const;

// EXACT visual spec (applies to Source, Category, Stock, Density, Preview)
const segmentShell =
  'flex flex-wrap items-center gap-1 rounded-2xl border border-[hsl(var(--line))] bg-white/70 px-1.5 py-1 shadow-[0_10px_26px_hsl(var(--accent-blue)/0.05)] backdrop-blur-sm';
const pillBase =
  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))]';
const activePill =
  'bg-[hsl(var(--accent-blue))] text-white shadow-[0_12px_26px_hsl(var(--accent-blue)/0.32)]';
const inactivePill = 'bg-white/0 text-foreground/70 hover:text-foreground hover:bg-white/80';
// Active pill for SOURCE buttons when not "all": no bg here — CSS sets it via data-source
const sourceActivePillNoBg = 'text-white shadow-[0_12px_26px_rgba(0,0,0,0.12)]';

type SnapEventDetail = {
  value: string;
  fromRect?: { x: number; y: number; w?: number; h?: number };
};

export default function InventoryCommandShelf(props: InventoryCommandShelfProps) {
  const {
    q,
    onQChange,
    category,
    onCategoryChange,
    stockMode,
    lowThreshold,
    onStockChange,
    density,
    onDensityChange,
    previewEnabled = true,
    onTogglePreview,
    resultCount,
    activeFilterCount,
    onClearFilters,
    columnsMenu,
    exportMenu,
    importButton,
    dashboardButton,
    onAdjust,
    onScan,
    onLabels,
    canAdjust = false,
    canLabels = false,
    savedViews,
    onSaveView,
    onApplyView,
    onDeleteView,
  } = props;

  const isDev = process.env.NODE_ENV !== 'production';
  const commandButtonClass =
    'inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--line))] bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/75 shadow-[0_10px_24px_hsl(var(--accent-blue)/0.05)] transition hover:text-foreground hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))]';

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const sourceMode = useInventoryView((s) => s.sourceMode);
  const sourceFilter = useInventoryView((s) => s.sourceFilter);
  const setSourceMode = useInventoryView((s) => s.setSourceMode);
  const toggleSourceFilter = useInventoryView((s) => s.toggleSourceFilter);

  // Cmd/Ctrl + Shift + 1..4 shortcuts to jump between source modes
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || !e.shiftKey) return;
      switch (e.key) {
        case '1':
          setSourceMode('store');
          e.preventDefault();
          break;
        case '2':
          setSourceMode('network');
          e.preventDefault();
          break;
        case '3':
          setSourceMode('catalog');
          e.preventDefault();
          break;
        case '4':
          setSourceMode('all');
          e.preventDefault();
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSourceMode]);

  // Fade-typewriter ghost
  const [ghost, setGhost] = React.useState<string | null>(null);
  // Focus glow pulse
  const [pulse, setPulse] = React.useState(false);

  // Snap animator state
  const [snap, setSnap] = React.useState<{
    id: number;
    text: string;
    from?: { x: number; y: number };
    running: boolean;
  } | null>(null);

  const Keyframes = (
    <style jsx>{`
      @keyframes fadeType {
        0% {
          opacity: 0;
          transform: translateY(2px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulseFocus {
        0% {
          box-shadow: 0 0 0 0 hsl(var(--accent-blue) / 0.35);
        }
        100% {
          box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .tw-char,
        .pulse-focus {
          animation: none !important;
        }
      }
    `}</style>
  );

  // Listen for fade-typewriter insert
  React.useEffect(() => {
    function onType(e: Event) {
      const text = (e as CustomEvent<{ value: string }>).detail?.value ?? '';
      if (!inputRef.current) return;
      inputRef.current.focus();
      onQChange(text);
      setGhost(text);
      setPulse(true);
      const t1 = setTimeout(() => setGhost(null), Math.min(1200, 40 * text.length + 200));
      const t2 = setTimeout(() => setPulse(false), 480);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    window.addEventListener('inventory:search-type', onType as EventListener);
    return () => window.removeEventListener('inventory:search-type', onType as EventListener);
  }, [onQChange]);

  // Listen for snap-to-search (optional)
  React.useEffect(() => {
    function onSnap(e: Event) {
      const detail = (e as CustomEvent<SnapEventDetail>).detail;
      if (!inputRef.current) return;
      setSnap({
        id: Date.now(),
        text: detail?.value ?? '',
        from: detail?.fromRect ? { x: detail.fromRect.x, y: detail.fromRect.y } : undefined,
        running: true,
      });
      const clear = setTimeout(() => setSnap(null), 520);
      return () => clearTimeout(clear);
    }
    window.addEventListener('inventory:snap-to-search', onSnap as EventListener);
    return () => window.removeEventListener('inventory:snap-to-search', onSnap as EventListener);
  }, []);

  const filtersActive =
    typeof activeFilterCount === 'number'
      ? activeFilterCount
      : (q.trim() ? 1 : 0) + (category !== 'Alle' ? 1 : 0) + (stockMode !== 'all' ? 1 : 0);

  const seededSavedViews = React.useMemo(
    () => savedViews?.filter((view) => view.isSeeded) ?? [],
    [savedViews],
  );
  const userSavedViews = React.useMemo(
    () => savedViews?.filter((view) => !view.isSeeded) ?? [],
    [savedViews],
  );

  const savedViewsMenu =
    onSaveView && (seededSavedViews.length > 0 || userSavedViews.length > 0 || onSaveView) ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              pillBase,
              'bg-white/0 text-foreground/70 hover:text-foreground hover:bg-white/80 shadow-sm hover:shadow-md',
            )}
          >
            <ChartPieSlice size={16} weight="duotone" />
            <span className="hidden xl:inline">Visninger</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl p-2 w-60 shadow-xl">
          <DropdownMenuLabel className="text-xs px-2 text-muted-foreground">
            Gem visning…
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="text-xs flex items-center gap-2 rounded-xl"
            onSelect={(e) => {
              e.preventDefault();
              onSaveView?.();
            }}
          >
            <Plus size={14} weight="bold" /> Gem nuværende visning
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs px-2 text-muted-foreground">
            Anvend visning
          </DropdownMenuLabel>
          {seededSavedViews.map((view) => (
            <DropdownMenuItem
              key={view.id}
              className="text-xs flex items-center gap-2 justify-between rounded-xl"
              onSelect={(e) => {
                e.preventDefault();
                onApplyView?.(view.id);
              }}
            >
              <span
                className={cn(
                  'truncate',
                  view.isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {view.name}
              </span>
              {view.isActive && (
                <Check size={14} weight="bold" className="text-[hsl(var(--accent-blue))]" />
              )}
            </DropdownMenuItem>
          ))}
          {seededSavedViews.length > 0 && userSavedViews.length > 0 && <DropdownMenuSeparator />}
          {userSavedViews.length > 0 ? (
            userSavedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className="text-xs flex items-center gap-2 justify-between rounded-xl"
                onSelect={(e) => {
                  e.preventDefault();
                  onApplyView?.(view.id);
                }}
              >
                <span
                  className={cn(
                    'truncate',
                    view.isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {view.name}
                </span>
                <span className="flex items-center gap-1">
                  {view.isActive && (
                    <Check size={14} weight="bold" className="text-[hsl(var(--accent-blue))]" />
                  )}
                  {onDeleteView && (
                    <button
                      type="button"
                      className="text-muted hover:text-destructive transition"
                      onClick={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        onDeleteView(view.id);
                      }}
                      aria-label={`Slet ${view.name}`}
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  )}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-3 py-2 text-[11px] text-muted">Ingen gemte visninger endnu</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const actionNodes = React.useMemo(() => {
    const items: React.ReactNode[] = [];
    if (savedViewsMenu) {
      items.push(savedViewsMenu);
    }
    if (onTogglePreview) {
      items.push(
        <button
          type="button"
          onClick={() => onTogglePreview(!previewEnabled)}
          className={cn(pillBase, previewEnabled ? activePill : inactivePill)}
          aria-pressed={previewEnabled}
          title="Forhåndsvisning"
        >
          <Eye
            size={16}
            weight={previewEnabled ? 'fill' : 'regular'}
            className={previewEnabled ? 'text-white' : 'text-foreground/70'}
          />
          <span className="hidden sm:inline">Forhåndsvisning</span>
        </button>,
      );
    }
    if (columnsMenu) {
      items.push(columnsMenu);
    }
    if (exportMenu) {
      items.push(exportMenu);
    }
    if (importButton) {
      items.push(importButton);
    }
    if (dashboardButton) {
      items.push(dashboardButton);
    }
    if (isDev) {
      items.push(
        <button
          type="button"
          className={commandButtonClass}
          onClick={async () => {
            const itemsState = useInventory.getState().items;
            const linkState = useCatalogLink.getState();
            const candidates = itemsState.filter((it) => !linkState.getLink(it.id));

            let linked = 0;
            let productOnly = 0;
            let skipped = 0;

            for (const it of candidates) {
              const res = await autoLinkOne({ itemId: it.id, sku: it.sku, name: it.name });
              if (res.kind === 'linked-variant') linked += 1;
              else if (res.kind === 'linked-product') productOnly += 1;
              else skipped += 1;
            }

            alert(
              `Auto-link summary:\nVariants: ${linked}\nProducts: ${productOnly}\nSkipped: ${skipped}`,
            );
          }}
        >
          Auto-link alle (dev)
        </button>,
      );
    }

    return items.map((node, index) => <React.Fragment key={index}>{node}</React.Fragment>);
  }, [
    savedViewsMenu,
    onTogglePreview,
    previewEnabled,
    columnsMenu,
    exportMenu,
    importButton,
    dashboardButton,
    isDev,
    commandButtonClass,
  ]);

  return (
    <div className="relative space-y-3">
      {Keyframes}

      {snap?.running && <SnapToSearch text={snap.text} from={snap.from} toRef={inputRef} />}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="relative flex-none min-w-[240px]"
            style={{ width: 'clamp(240px, 42vw, 560px)' }}
          >
            <label
              className={cn(
                'group flex items-center gap-2 rounded-2xl border border-[hsl(var(--line))] bg-white/80 px-3 py-2 text-sm shadow-[0_12px_28px_hsl(var(--accent-blue)/0.08)] transition',
                'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[hsl(var(--accent-blue))]',
                pulse && 'pulse-focus',
              )}
              style={
                pulse ? { animation: 'pulseFocus 480ms cubic-bezier(.2,.8,.2,1) both' } : undefined
              }
            >
              <MagnifyingGlass
                size={18}
                weight="bold"
                className="text-foreground/50 transition group-focus-within:text-[hsl(var(--accent-blue))]"
                aria-hidden
              />
              <input
                ref={inputRef}
                className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
                placeholder="Søg (navn, SKU, stregkode)…"
                value={q}
                onChange={(e) => onQChange(e.target.value)}
                aria-label="Søg i varelager"
              />
            </label>

            {ghost && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-11 right-3 flex items-center overflow-hidden"
                style={{ color: 'hsl(var(--accent-blue))', opacity: 0.9 }}
              >
                <div className="whitespace-pre text-sm">
                  {ghost.split('').map((ch, i) => (
                    <span
                      key={`${ch}-${i}`}
                      className="tw-char inline-block"
                      style={{
                        animation: `fadeType 240ms cubic-bezier(.2,.8,.2,1) ${i * 18}ms both`,
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className="hidden lg:flex items-center gap-2 rounded-2xl border border-[hsl(var(--line))] bg-white/70 px-3 py-1.5 text-xs shadow-[0_10px_24px_hsl(var(--accent-blue)/0.06)]"
            aria-live="polite"
          >
            <span className="font-semibold text-foreground tabular-nums">{resultCount}</span>
            <span className="text-muted">varer</span>
            {filtersActive > 0 && (
              <button
                className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent-blue)/0.12)] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--accent-blue))] transition hover:bg-[hsl(var(--accent-blue)/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent-blue))]"
                onClick={onClearFilters}
                title="Ryd søgning og filtre"
              >
                Ryd
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1">{actionNodes}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source segmented control (same style as category/stock) */}
          <div className={cn(segmentShell, 'text-xs')} role="tablist" aria-label="Kildemodus">
            {SOURCES.map(({ mode, label, Icon }) => {
              const isActive = sourceMode === mode;
              const isAll = mode === 'all';
              // For 'all' we keep your blue pill. For others we use no-bg and let CSS tokens color it.
              const pillClass = isActive
                ? isAll
                  ? activePill
                  : sourceActivePillNoBg
                : inactivePill;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  onClick={() => setSourceMode(mode)}
                  className={cn(pillBase, 'source-pill', pillClass)}
                  data-source={mode}
                  data-active={isActive}
                  aria-pressed={isActive}
                  aria-selected={isActive}
                  aria-label={label}
                >
                  <Icon
                    size={16}
                    weight={isActive ? 'fill' : 'regular'}
                    className="source-icon"
                    aria-hidden
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Legend chips only in "All" mode */}
          {sourceMode === 'all' && (
            <div className="flex items-center gap-1">
              {SOURCE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={cn(pillBase, 'source-filter-chip', 'legend-chip')}
                  data-source={key}
                  data-active={sourceFilter[key]}
                  onClick={() => toggleSourceFilter(key)}
                  aria-pressed={sourceFilter[key]}
                  title={`Vis/skjul kilde: ${label}`}
                >
                  <span className="source-dot" aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Category segmented control */}
          <div className={cn(segmentShell, 'text-xs')}>
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => onCategoryChange(c)}
                className={cn(pillBase, category === c ? activePill : inactivePill)}
                aria-pressed={category === c}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Stock segmented control */}
          <div className={cn(segmentShell, 'text-xs')}>
            {STOCK.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onStockChange(opt.key)}
                className={cn(pillBase, stockMode === opt.key ? activePill : inactivePill)}
                aria-pressed={stockMode === opt.key}
              >
                {opt.key === 'low' ? `${opt.label} (≤${lowThreshold})` : opt.label}
              </button>
            ))}
          </div>

          {onDensityChange && (
            <div className={cn(segmentShell, 'text-xs')}>
              <button
                className={cn(pillBase, density === 'comfort' ? activePill : inactivePill)}
                onClick={() => onDensityChange('comfort')}
                aria-pressed={density === 'comfort'}
              >
                Komfort
              </button>
              <button
                className={cn(pillBase, density === 'compact' ? activePill : inactivePill)}
                onClick={() => onDensityChange('compact')}
                aria-pressed={density === 'compact'}
              >
                Kompakt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** SnapToSearch unchanged… */
function SnapToSearch({
  text,
  from,
  toRef,
}: {
  text: string;
  from?: { x: number; y: number };
  toRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [style, setStyle] = React.useState<React.CSSProperties | null>(null);

  React.useEffect(() => {
    const input = toRef.current;
    if (!input) return;
    const tr = input.getBoundingClientRect();
    const to = { x: tr.left + tr.width * 0.3, y: tr.top + tr.height / 2 };
    const start = from ?? { x: to.x, y: to.y };

    const s: React.CSSProperties = {
      position: 'fixed',
      left: start.x,
      top: start.y,
      transform: 'translate(-50%, -50%) scale(0.9)',
      opacity: 0.0,
      transition:
        'transform 360ms cubic-bezier(.2,.8,.2,1), opacity 360ms cubic-bezier(.2,.8,.2,1)',
      zIndex: 9999,
      pointerEvents: 'none',
      background: 'hsl(var(--accent-blue))',
      color: 'white',
      borderRadius: 999,
      padding: '4px 10px',
      fontSize: '12px',
      boxShadow: '0 6px 20px rgba(0,0,0,.18)',
    };
    setStyle(s);
    const t = requestAnimationFrame(() => {
      setStyle({
        ...s,
        left: to.x,
        top: to.y,
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 0.95,
      });
    });
    return () => cancelAnimationFrame(t);
  }, [from, toRef]);

  if (!style) return null;
  return <div style={style}>{text}</div>;
}
