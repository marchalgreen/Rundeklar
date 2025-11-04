// src/components/windows/ItemDetailWindow.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { autoLinkOne } from '@/lib/catalog/autoLink';
import { DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';
import { AnimatePresence, motion } from 'framer-motion';
import type { TooltipProps as ReTooltipProps } from 'recharts';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { compute30DayTrend, type TrendPoint } from '@/lib/analytics/inventory';
import { deriveSizeLabel } from '@/lib/inventoryFacets';
import { TOKENS } from '@/lib/ui/palette';
import { useInventory, type InventoryItem, type AdjustmentReason } from '@/store/inventory';
import { useInventoryMovements, type InventoryMovementEntry } from '@/store/inventoryMovements';
import { useCatalog } from '@/store/catalog';
import { useCatalogLink, type CatalogLink } from '@/store/catalogLink';
import { usePurchaseRequests } from '@/store/purchaseRequests';
import { useDesktop } from '@/store/desktop';
import CatalogLinkDialog from '@/components/inventory/CatalogLinkDialog';
import VariantGallery from '@/components/variants/VariantGallery';
import VariantOverview from '@/components/variants/VariantOverview';
import { VariantSyncProvider, useVariantSync } from '@/lib/variants/VariantSyncProvider';
import { toProductRecord } from '@/lib/variants/adapters/TemporaryCatalogAdapter';

import type { CatalogProduct, ProductCategory } from '@/types/product';
import type { GalleryPhoto, ProductRecord } from '@/lib/variants/types';
import { frameVariantSizeLabel, timeSinceISO } from '@/types/product';
import {
  RefreshCw,
  Package as PackageIcon,
  PackagePlus,
  Barcode as BarcodeIcon,
  Image as ImageIcon,
  Ellipsis,
  X,
  Link as LinkIcon,
  Unlink,
  BadgeCheck,
  Tag as TagIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import StockAdjustDialog from '@/components/inventory/StockAdjustDialog';
import LabelSheetDialog from '@/components/inventory/LabelSheetDialog';

type Props = {
  payload?: {
    id?: string;
    sku?: string;
    variantSku?: string;
    color?: string;
    sizeLabel?: string;
  };
};
type TabKey = 'overview' | 'variants' | 'movements' | 'suppliers' | 'notes';

const KNOWN_ADJUSTMENT_REASONS: AdjustmentReason[] = [
  'Stock take',
  'Received',
  'Damaged',
  'Returned',
  'Correction',
];

function normalizeAdjustmentReason(input: unknown): AdjustmentReason {
  return KNOWN_ADJUSTMENT_REASONS.includes(input as AdjustmentReason)
    ? (input as AdjustmentReason)
    : 'Correction';
}

/* ---------------------------------- */
/* Small HTML sanitizer (safe subset) */
/* ---------------------------------- */
function sanitizeHtml(input?: string): string {
  if (!input) return '';
  // Strip script/style/iframe
  const noScript = input.replace(/<\/?(script|style|iframe)[^>]*>/gi, '');
  // Drop on* handlers and javascript: urls
  const noHandlers = noScript
    .replace(/\son[a-z]+\s*=\s*"(.*?)"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'(.*?)'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
  return noHandlers;
}

export default function ItemDetailWindow({ payload }: Props) {
  const { items, adjustQty } = useInventory();
  const getCatalog = useCatalog((s) => s.getBySku);
  const refreshCatalog = useCatalog((s) => s.refresh);
  const ensureDraft = usePurchaseRequests((s) => s.ensureDraft);
  const addLineToDraft = usePurchaseRequests((s) => s.addLine);
  const selectDraft = usePurchaseRequests((s) => s.selectDraft);
  const openWindow = useDesktop((s) => s.open);

  const [tab, setTab] = React.useState<TabKey>('overview');
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [labelsOpen, setLabelsOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);

  // Transitions (scoped)
  const Motion = (
    <style jsx>{`
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes fadeSlide {
        0% {
          opacity: 0;
          transform: translateY(6px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes zoomIn {
        0% {
          opacity: 0;
          transform: scale(0.98);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      .anim-fade {
        animation: fadeIn 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      .anim-panel {
        animation: fadeSlide 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      .anim-zoom {
        animation: zoomIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      @media (prefers-reduced-motion: reduce) {
        .anim-fade,
        .anim-panel,
        .anim-zoom {
          animation: none !important;
        }
      }
    `}</style>
  );

  // Resolve local item
  const item: InventoryItem | undefined = React.useMemo(() => {
    if (!payload?.id) return undefined;
    return items.find((it) => it.id === payload.id);
  }, [items, payload?.id]);

  // Read any existing catalog link for this item
  const linkState = useCatalogLink();
  const itemLink = React.useMemo(
    () => (item ? linkState.getLink(item.id) : undefined),
    [linkState, item],
  );

  const activeVendor = itemLink?.vendor ?? DEFAULT_VENDOR_SLUG;

  // Choose catalog product (prefer link, otherwise sku)
  const catalog: CatalogProduct | undefined = React.useMemo(() => {
    if (!item) return undefined;

    if (itemLink?.variantSku) {
      const p = getCatalog(itemLink.variantSku);
      if (p) return p;
    }
    if (itemLink?.catalogId) {
      const p = getCatalog(itemLink.catalogId);
      if (p) return p;
    }
    const hint = (['Frames', 'Lenses', 'Contacts', 'Accessories'] as ProductCategory[]).includes(
      item.category as ProductCategory,
    )
      ? (item.category as ProductCategory)
      : undefined;
    return getCatalog(item.sku, hint);
  }, [item, itemLink?.variantSku, itemLink?.catalogId, getCatalog]);

  const productRecord: ProductRecord | undefined = React.useMemo(() => {
    if (!catalog) return undefined;
    return toProductRecord(catalog);
  }, [catalog]);

  const initialVariantSku = React.useMemo(() => {
    if (payload?.variantSku && payload.variantSku.length > 0) {
      return payload.variantSku;
    }
    if (payload?.sku && payload.sku.length > 0) {
      return payload.sku;
    }
    return undefined;
  }, [payload?.variantSku, payload?.sku]);

  const initialColor = React.useMemo(() => {
    if (payload?.color && payload.color.length > 0) {
      return payload.color;
    }
    return undefined;
  }, [payload?.color]);

  const initialState = React.useMemo(() => {
    if (!initialVariantSku && !initialColor) return undefined;
    return {
      variantSku: initialVariantSku,
      color: initialColor,
    };
  }, [initialVariantSku, initialColor]);

  // Variant synchronization handled via VariantSyncProvider

  // Lightbox viewer
  const [lightbox, setLightbox] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const resolvedSizeLabel = React.useMemo(() => {
    if (!item) return '—';
    const values: string[] = [];
    const addCandidate = (value?: string | null) => {
      if (!value) return;
      const trimmed = value.trim();
      if (!trimmed || trimmed === '—') return;
      if (!values.includes(trimmed)) values.push(trimmed);
    };

    addCandidate(item.sizeLabel);
    addCandidate(payload?.sizeLabel ?? undefined);

    if (catalog) {
      const skuCandidates = new Set(
        [payload?.variantSku, item.sku]
          .filter((sku): sku is string => typeof sku === 'string' && sku.length > 0)
          .map((sku) => sku.trim().toLowerCase()),
      );

      if (catalog.category === 'Frames') {
        const variants = catalog.variants ?? [];
        const match =
          variants.find((variant) => {
            const sku = variant.sku ? variant.sku.trim().toLowerCase() : '';
            return sku && skuCandidates.has(sku);
          }) ?? variants[0];
        if (match) {
          addCandidate(match.sizeLabel ?? undefined);
          addCandidate(frameVariantSizeLabel(match) ?? undefined);
        }
      } else if (catalog.category === 'Accessories') {
        const variants = catalog.variants ?? [];
        const match =
          variants.find((variant) => {
            const sku = variant.sku ? variant.sku.trim().toLowerCase() : '';
            return sku && skuCandidates.has(sku);
          }) ?? variants[0];
        if (match?.sizeLabel) addCandidate(match.sizeLabel);
      }
    }

    addCandidate(deriveSizeLabel(item));

    return values[0] ?? '—';
  }, [item, payload?.sizeLabel, payload?.variantSku, catalog]);

  if (!item) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-hair bg-white/70 backdrop-blur-sm p-6 text-sm">
          Kunne ikke finde varen. (ID: <code>{payload?.id ?? '—'}</code>)
        </div>
      </div>
    );
  }

  const handleAddToPurchaseRequest = () => {
    if (!item) return;
    const supplier = catalog?.source?.supplier ?? undefined;
    const draft = ensureDraft(supplier ? { supplierHint: supplier } : undefined);
    const updated =
      addLineToDraft(draft.id, {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        qty: 1,
        supplierHint: supplier,
      }) ?? draft;
    selectDraft(updated.id);
    openWindow({
      type: 'purchaseRequest',
      title: 'Purchase Requests',
      payload: { id: updated.id },
    });
  };

  return (
    <VariantSyncProvider product={productRecord} initial={initialState}>
      <div className="p-3 md:p-4 space-y-3">
        {Motion}

        {/* Header (title + meta left, actions right) */}
        <div className="grid grid-cols-[1fr_auto] items-start gap-2">
        <div className="min-w-0 pr-2">
          <h2 className="text-lg font-medium leading-snug line-clamp-2 text-balance">
            {catalog?.name || item.name}
          </h2>
          {/* Secondary meta line – never hides the title */}
          <div className="mt-1 text-xs text-muted truncate flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <PackageIcon className="h-3.5 w-3.5" /> {item.category}
            </span>
            <span className="opacity-50">•</span>
            <span className="inline-flex items-center gap-1">
              <BarcodeIcon className="h-3.5 w-3.5" /> {item.sku}
            </span>
            {catalog ? (
              <>
                <span className="opacity-50">•</span>
                <span className="inline-flex items-center gap-1">
                  Linked to <span className="font-medium">{catalog.source.supplier}</span>
                  <span className="opacity-60">({timeSinceISO(catalog.source.lastSyncISO)})</span>
                </span>
              </>
            ) : (
              <>
                <span className="opacity-50">•</span>
                <span className="text-amber-700">Unlinked catalog</span>
              </>
            )}
          </div>
        </div>

        {/* Actions & badges – wraps nicely on small widths */}
        <div className="shrink-0 flex items-center justify-end gap-2 gap-y-1 flex-wrap">
          {catalog?.source?.url ? (
            <a
              href={catalog.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tahoe-ghost px-2 py-1 text-xs rounded-xl border-hair hover:u-glass inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Åbn leverandørside</span>
              <span aria-hidden>↗</span>
            </a>
          ) : null}
          {catalog?.price ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-[hsl(var(--surface-2))] whitespace-nowrap">
              <TagIcon className="h-3 w-3 opacity-70" /> {catalog.price.amount}{' '}
              {catalog.price.currency}
            </span>
          ) : null}
          {catalog?.virtualTryOn ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-emerald-500/12 ring-1 ring-emerald-500/40 text-emerald-700 whitespace-nowrap">
              <BadgeCheck className="h-3.5 w-3.5" /> Virtual try-on
            </span>
          ) : null}

          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-xl border-hair hover:u-glass inline-flex items-center gap-1 whitespace-nowrap"
            onClick={handleAddToPurchaseRequest}
          >
            <PackagePlus className="h-3.5 w-3.5" /> Tilføj til PR
          </button>
          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-xl border-hair hover:u-glass whitespace-nowrap"
            onClick={() => setLabelsOpen(true)}
          >
            Print etiket
          </button>
          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-xl border-hair hover:u-glass whitespace-nowrap"
            onClick={() => setAdjustOpen(true)}
          >
            Juster
          </button>
          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-xl border-hair hover:u-glass inline-flex items-center gap-1 whitespace-nowrap"
            onClick={() => refreshCatalog(item.sku)}
            title="Force refresh from catalog"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Opdater
          </button>
          <OverflowMenu
            items={[
              { label: 'Force refresh', onClick: () => refreshCatalog(item.sku) },
              { label: 'Unlink catalog', onClick: () => linkState.unlink(item.id) },
            ]}
          />
        </div>
        </div>

        {/* Content – consistent two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(360px,2fr)_3fr] gap-3">
        {/* Left: gallery + quick info */}
        <div className="relative z-0 space-y-2 anim-fade">
          <VariantGallery
            heroAlt={catalog?.name || item.name}
            onOpenLightbox={(index) => setLightbox({ open: true, index })}
            renderHeroOverlay={<BadgeCatalog />}
          />
          {/* Relocated features (chip list) */}
          <FeaturesList features={catalog?.collections || []} />

          {/* Quick status */}
          <div className="rounded-xl border border-hair bg-white/70 p-3 text-sm anim-panel relative z-0 pointer-events-auto">
            <div className="grid grid-cols-2 gap-y-2">
              <div className="text-muted">Status</div>
              <div>
                {item.qty > 0 ? (
                  item.qty <= 5 ? (
                    <Pill color="amber">Lavt lager</Pill>
                  ) : (
                    <Pill color="emerald">På lager</Pill>
                  )
                ) : (
                  <Pill color="red">Udsolgt</Pill>
                )}
              </div>
              <div className="text-muted">Antal</div>
              <div className="tabular-nums">{item.qty}</div>
              <div className="text-muted">Størrelse</div>
              <div className="truncate">{resolvedSizeLabel}</div>
              <div className="text-muted">Stregkode</div>
              <div className="truncate">{item.barcode ?? '—'}</div>
            </div>
          </div>
        </div>

          {/* Right: tabs */}
          <div>
            <TabBar tab={tab} onChange={setTab} />
            <div key={tab} className="anim-panel">
              {tab === 'overview' && <OverviewPanel item={item} catalog={catalog} />}
              {tab === 'variants' && <VariantOverview />}
              {tab === 'movements' && (
                <MovementsPanel item={item} onQuickAdjust={(d) => adjustQty(item.id, d)} />
              )}
              {tab === 'suppliers' && (
                <SuppliersPanel
                  item={item}
                  catalog={catalog}
                  link={itemLink}
                  onOpenLinkDialog={() => setLinkOpen(true)}
                  onUnlink={() => linkState.unlink(item.id)}
                />
              )}
              {tab === 'notes' && <NotesPanel item={item} />}
            </div>
          </div>
        </div>
      </div>

      <VariantLightbox lightbox={lightbox} setLightbox={setLightbox} />

      {/* Link dialog */}
      <CatalogLinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        itemId={item.id}
        vendor={activeVendor}
        initialQuery={item.name}
      />

      {/* Existing dialogs */}
      <StockAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        itemId={item.id}
        itemName={item.name}
      />
      <LabelSheetDialog open={labelsOpen} onOpenChange={setLabelsOpen} item={item} />
    </VariantSyncProvider>
  );
}

type VariantLightboxState = { open: boolean; index: number };

function VariantLightbox({
  lightbox,
  setLightbox,
}: {
  lightbox: VariantLightboxState;
  setLightbox: React.Dispatch<React.SetStateAction<VariantLightboxState>>;
}) {
  const { photos, setPhotoIndex, photoIndex } = useVariantSync();

  React.useEffect(() => {
    if (!lightbox.open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightbox({ open: false, index: 0 });
      } else if (event.key === 'ArrowRight') {
        setLightbox((prev) => {
          const length = Math.max(1, photos.length);
          const nextIndex = (prev.index + 1) % length;
          return { ...prev, index: nextIndex };
        });
      } else if (event.key === 'ArrowLeft') {
        setLightbox((prev) => {
          const length = Math.max(1, photos.length);
          const nextIndex = (prev.index - 1 + length) % length;
          return { ...prev, index: nextIndex };
        });
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightbox.open, photos.length, setLightbox]);

  React.useEffect(() => {
    if (!lightbox.open) return;
    if (!photos.length) return;
    const maxIndex = photos.length - 1;
    const safeIndex = Math.max(0, Math.min(lightbox.index, maxIndex));
    setPhotoIndex(safeIndex);
  }, [lightbox.index, lightbox.open, photos.length, setPhotoIndex]);

  React.useEffect(() => {
    if (!lightbox.open) return;
    if (photoIndex === lightbox.index) return;
    setLightbox((prev) => ({ ...prev, index: photoIndex }));
  }, [photoIndex, lightbox.index, lightbox.open, setLightbox]);

  if (!lightbox.open) return null;
  if (!photos.length) return null;

  const length = photos.length;
  const maxIndex = length - 1;
  const index = Math.max(0, Math.min(lightbox.index, maxIndex));

  return (
    <Lightbox
      images={photos}
      index={index}
      onClose={() => setLightbox({ open: false, index: 0 })}
      onNavigate={(step) =>
        setLightbox((prev) => {
          const safeLength = Math.max(1, length);
          const nextIndex = (prev.index + step + safeLength) % safeLength;
          return { ...prev, index: nextIndex };
        })
      }
    />
  );
}

/* -------------------- Small UI bits -------------------- */

/** Scrollable feature chips with fades (keeps header clean) */
function FeaturesList({ features }: { features: string[] }) {
  if (!features?.length) return null;
  return (
    <div className="relative z-0 overflow-hidden">
      <div
        className="flex items-center gap-1.5 overflow-x-auto pr-2 py-0.5"
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)',
          maskImage:
            'linear-gradient(90deg, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)',
        }}
      >
        {features.slice(0, 20).map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-[hsl(var(--surface-2))] max-w-[240px] truncate"
            title={c}
          >
            <TagIcon className="h-3 w-3 opacity-70 shrink-0" />
            <span className="truncate">{c}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Pill({
  children,
  color,
}: {
  children: React.ReactNode;
  color: 'emerald' | 'amber' | 'red';
}) {
  const map = {
    emerald: 'bg-emerald-500/12 ring-emerald-500/40 text-emerald-700',
    amber: 'bg-amber-500/12 ring-amber-500/40 text-amber-700',
    red: 'bg-red-500/12 ring-red-500/30 text-red-700',
  }[color];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1',
        map,
      )}
    >
      {children}
    </span>
  );
}

function BadgeCatalog({ small }: { small?: boolean }) {
  return (
    <div
      className={cn(
        'absolute top-2 left-2 rounded-full bg-white/85 dark:bg-[hsl(var(--surface))]/85 backdrop-blur-sm border border-hair text-[11px] px-2 py-0.5',
        small && 'top-1 left-1',
      )}
    >
      Catalog
    </div>
  );
}

function OverflowMenu({ items }: { items: { label: string; onClick: () => void }[] }) {
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="tahoe-ghost px-2 py-1 text-xs rounded-xl border-hair hover:u-glass"
        title="More"
        onClick={() => setOpen((v) => !v)}
      >
        <Ellipsis className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 rounded-xl border border-hair bg-white/95 backdrop-blur-md shadow-lg p-1 text-xs z-50 w-40 anim-zoom">
          {items.map((it) => (
            <button
              key={it.label}
              className="w-full text-left px-2 py-1 rounded-md hover:bg-[hsl(var(--surface-2))]"
              onClick={() => {
                it.onClick();
                setOpen(false);
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Tabs -------------------- */

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const order: TabKey[] = ['overview', 'variants', 'movements', 'suppliers', 'notes'];

  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = order.indexOf(tab);
    if (currentIndex < 0) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        onChange(order[(currentIndex + 1) % order.length]);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        onChange(order[(currentIndex - 1 + order.length) % order.length]);
        break;
      }
      case 'Home': {
        event.preventDefault();
        onChange(order[0]);
        break;
      }
      case 'End': {
        event.preventDefault();
        onChange(order[order.length - 1]);
        break;
      }
      default:
        break;
    }
  };

  const Button = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      role="tab"
      aria-selected={tab === k}
      tabIndex={tab === k ? 0 : -1}
      className={cn(
        'tahoe-ghost h-8 px-3 text-[12px] rounded-lg mr-1 transition relative',
        tab === k && 'bg-white ring-1 ring-[hsl(var(--accent-blue))]',
      )}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onChange(k);
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      role="tablist"
      aria-label="Vare-faner"
      onKeyDown={handleKey}
      className="mb-2 flex items-center sticky top-0 relative z-[999] bg-[hsl(var(--surface)/0.85)] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--surface)/0.6)] border-b border-hair/70 pointer-events-auto"
      style={{ WebkitBackdropFilter: 'blur(6px)' }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <Button k="overview" label="Oversigt" />
      <Button k="variants" label="Varianter" />
      <Button k="movements" label="Bevægelser" />
      <Button k="suppliers" label="Leverandører" />
      <Button k="notes" label="Noter" />
    </div>
  );
}

/* -------------------- Panels -------------------- */

function OverviewPanel({ item, catalog }: { item: InventoryItem; catalog?: CatalogProduct }) {
  const hasStory = !!catalog?.storyHtml;
  return (
    <div className="rounded-2xl border border-hair bg-white/70 p-3 space-y-3">
      <div className="rounded-xl border border-hair/60 bg-white/70 p-3 anim-panel">
        <div className="text-xs text-muted mb-2">Dine data</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <Field label="SKU" value={item.sku} />
          <Field label="Kategori" value={item.category} />
          <Field label="Antal" value={String(item.qty)} />
          <Field label="Stregkode" value={item.barcode ?? '—'} />
          <Field label="Opdateret" value={new Date(item.updatedAt).toLocaleString()} />
          {catalog?.price && (
            <Field
              label="Katalogpris"
              value={`${catalog.price.amount} ${catalog.price.currency}`}
            />
          )}
          {catalog?.virtualTryOn && <Field label="Virtual try-on" value="Tilgængelig" />}
        </div>
      </div>

      <div className="rounded-xl border border-hair/60 bg-white/70 p-3 anim-panel">
        <div className="text-xs text-muted mb-2">Katalog (read-only)</div>
        {catalog ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <Field label="Brand" value={catalog.brand ?? '—'} />
              <Field label="Model" value={catalog.model ?? '—'} />
              {catalog.specs &&
                Object.entries(catalog.specs).map(([k, v]) => (
                  <Field key={k} label={k} value={String(v ?? '—')} />
                ))}
            </div>

            {hasStory && (
              <div className="mt-3">
                <div className="text-xs text-muted mb-1">Story</div>
                <div
                  className="prose prose-sm max-w-none text-[13px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(catalog?.storyHtml) }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted">Ingen katalogdata knyttet.</div>
        )}
      </div>
    </div>
  );
}

function MovementsPanel({
  item,
  onQuickAdjust,
}: {
  item: InventoryItem;
  onQuickAdjust: (delta: number) => void;
}) {
  const appendMany = useInventoryMovements((s) => s.appendMany);
  // Subscribe to the flattened list so we can derive and sort per-item history here
  const allEntries = useInventoryMovements((s) => s.entries);
  const movements = React.useMemo(() => {
    return allEntries
      .filter((entry) => entry.itemId === item.id)
      .sort((a, b) => {
        if (a.atISO === b.atISO) {
          if (a.id === b.id) return 0;
          return a.id > b.id ? -1 : 1;
        }
        return a.atISO > b.atISO ? -1 : 1;
      });
  }, [allEntries, item.id]);

  // English → Danish labels for movement reasons (UI only)
  const reasonDa = (id?: string) =>
    id === 'Stock take'
      ? 'Lageroptælling'
      : id === 'Received'
        ? 'Modtaget'
        : id === 'Damaged'
          ? 'Beskadiget'
          : id === 'Returned'
            ? 'Returneret'
            : id === 'Sale'
              ? 'Solgt'
              : 'Korrigering';

  const [days, setDays] = React.useState<30 | 60 | 90>(30);
  const numberFormatter = React.useMemo(() => new Intl.NumberFormat('da-DK'), []);
  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: 'short' }),
    [],
  );

  const trend: TrendPoint[] = React.useMemo(
    () => compute30DayTrend(movements, { days }),
    [movements, days],
  );

  const yDomain = React.useMemo(() => {
    if (!trend.length) return [-5, 5];
    const values = trend.map((point) => point.net);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const padding = Math.max(2, Math.round((max - min) * 0.15));
    return [min - padding, max + padding];
  }, [trend]);

  const chartData = React.useMemo(
    () =>
      trend.map((point) => ({
        ...point,
        label: dateFormatter.format(new Date(`${point.date}T00:00:00`)),
        volume: point.inbound + point.outbound,
        outboundNeg: -point.outbound,
      })),
    [trend, dateFormatter],
  );

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch(
          `/api/inventory/movements?storeStockId=${encodeURIComponent(item.id)}`,
          { cache: 'no-store' },
        );
        if (!response.ok) return;

        const payload = await response.json();
        if (!active || !Array.isArray(payload?.entries)) return;

        const normalized: InventoryMovementEntry[] = payload.entries
          .filter(
            (entry: unknown): entry is Record<string, unknown> =>
              entry !== null && typeof entry === 'object',
          )
          .map(
            (entry: {
              id?: any;
              atISO?: any;
              itemId?: any;
              reason?: any;
              note?: any;
              qtyBefore?: unknown;
              qtyAfter?: unknown;
              delta?: unknown;
            }) => {
              const id = typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID();
              const atISO =
                typeof entry.atISO === 'string' && entry.atISO
                  ? entry.atISO
                  : new Date().toISOString();
              const rawQtyBefore = Number((entry as { qtyBefore?: unknown }).qtyBefore);
              const qtyBefore = Number.isFinite(rawQtyBefore)
                ? Math.trunc(rawQtyBefore)
                : undefined;
              const rawQtyAfter = Number((entry as { qtyAfter?: unknown }).qtyAfter);
              const qtyAfter = Number.isFinite(rawQtyAfter) ? Math.trunc(rawQtyAfter) : undefined;
              const rawDelta = Number((entry as { delta?: unknown }).delta);
              const delta = Number.isFinite(rawDelta) ? Math.trunc(rawDelta) : 0;

              return {
                id,
                itemId: typeof entry.itemId === 'string' && entry.itemId ? entry.itemId : item.id,
                qtyBefore,
                qtyAfter,
                delta,
                reason: normalizeAdjustmentReason(entry.reason),
                note: typeof entry.note === 'string' && entry.note ? entry.note : undefined,
                atISO,
              };
            },
          );

        if (normalized.length) {
          appendMany(normalized);
        }
      } catch {
        // Ignore network errors; user may be offline or API unavailable
      }
    })();

    return () => {
      active = false;
    };
  }, [item.id, appendMany]);

  return (
    <div className="rounded-2xl border border-hair bg-white/70 p-3 space-y-3 anim-panel">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Hurtig justering</span>
        <div className="flex items-center gap-1">
          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-lg border-hair hover:u-glass"
            onClick={() => onQuickAdjust(+1)}
          >
            +1
          </button>
          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-lg border-hair hover:u-glass"
            onClick={() => onQuickAdjust(-1)}
          >
            −1
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[30, 60, 90].map((range) => {
            const isActive = days === range;
            return (
              <button
                key={range}
                type="button"
                onClick={() => {
                  setDays(range as 30 | 60 | 90);
                }}
                aria-pressed={isActive}
                className={cn(
                  'px-3 py-1 text-[11px] rounded-xl border border-[hsl(var(--line))] font-medium transition',
                  isActive
                    ? 'bg-[hsl(var(--accent-blue))] text-white shadow-[0_4px_12px_hsl(var(--accent-blue)/0.35)]'
                    : 'bg-white/70 text-foreground/70 hover:text-foreground hover:bg-white/90',
                )}
              >
                {range} dage
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-48 rounded-xl border border-hair/60 bg-white/60 overflow-hidden">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            Ingen bevægelser i perioden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--line)/0.55)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                domain={yDomain as [number, number]}
                tickFormatter={(value) => numberFormatter.format(Math.round(value))}
                allowDecimals={false}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" />
              <ReTooltip
                content={({ active, payload }: ReTooltipProps<number, string>) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as TrendPoint & {
                    label?: string;
                    volume?: number;
                  };
                  if (!point) return null;
                  return (
                    <div className="rounded-lg border border-white/30 bg-white/85 px-2 py-1 text-xs shadow-lg backdrop-blur-md">
                      <div className="font-medium text-foreground">{point.label}</div>
                      <div className="mt-1 grid gap-0.5">
                        <div className="flex justify-between">
                          <span>Ind</span>
                          <span>+{numberFormatter.format(point.inbound)} stk.</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ud</span>
                          <span>-{numberFormatter.format(point.outbound)} stk.</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Netto</span>
                          <span
                            className={
                              point.net >= 0
                                ? 'text-[hsl(var(--success))]'
                                : 'text-[hsl(var(--destructive))]'
                            }
                          >
                            {point.net >= 0 ? '+' : ''}
                            {numberFormatter.format(point.net)} stk.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="inbound"
                stackId="flow"
                stroke={`hsl(var(${TOKENS.ok}))`}
                fill={`hsl(var(${TOKENS.ok}) / 0.25)`}
                activeDot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="outboundNeg"
                stackId="flow"
                stroke={`hsl(var(${TOKENS.danger}))`}
                fill={`hsl(var(${TOKENS.danger}) / 0.25)`}
                activeDot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="net"
                stroke={`hsl(var(${TOKENS.accentBlue}))`}
                fill="transparent"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {movements.length > 0 ? (
        <motion.ul
          layout
          className="space-y-3 transform-gpu"
          style={{ willChange: 'transform, opacity' }}
        >
          <AnimatePresence initial={false}>
            {movements.map((movement) => {
              const deltaSign = movement.delta > 0 ? '+' : '';
              const parts = [
                `${deltaSign}${movement.delta}`,
                reasonDa(movement.reason),
                movement.note,
              ].filter((part): part is string => Boolean(part));

              return (
                <motion.li
                  key={movement.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-[hsl(var(--accent-blue))]" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted">{timeSinceISO(movement.atISO)}</div>
                    <div className="text-sm truncate">{parts.join(' • ')}</div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <div className="text-xs text-muted">
          Ingen bevægelser registreret endnu. Brug hurtigjustering eller dialogen for at logge
          ændringer.
        </div>
      )}
    </div>
  );
}

function SuppliersPanel({
  item,
  catalog,
  link,
  onOpenLinkDialog,
  onUnlink,
}: {
  item: InventoryItem;
  catalog?: CatalogProduct;
  link?: CatalogLink;
  onOpenLinkDialog: () => void;
  onUnlink: () => void;
}) {
  const linkStore = useCatalogLink();
  const currentLink = link ?? linkStore.getLink(item.id);

  async function handleAutoLink() {
    const res = await autoLinkOne({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
    });
    switch (res.kind) {
      case 'linked-variant':
        alert(`Linked variant: ${res.variantSku}`);
        break;
      case 'linked-product':
        alert(`Linked product: ${res.catalogId}`);
        break;
      default:
        alert(`Skipped: ${res.reason}`);
        break;
    }
  }

  return (
    <div className="rounded-2xl border border-hair bg-white/70 p-3 text-sm anim-panel">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted">Foretrukken leverandør</div>
        <div className="flex items-center gap-1">
          {currentLink ? (
            <button
              className="tahoe-ghost px-2 py-1 text-xs rounded-lg border-hair hover:u-glass inline-flex items-center gap-1"
              onClick={onUnlink}
              title="Fjern link"
            >
              <Unlink className="h-3.5 w-3.5" /> Unlink
            </button>
          ) : (
            <>
              <button
                className="tahoe-ghost px-2 py-1 text-xs rounded-lg border-hair hover:u-glass inline-flex items-center gap-1"
                onClick={onOpenLinkDialog}
              >
                <LinkIcon className="h-3.5 w-3.5" /> Link til katalog…
              </button>
              <button
                className="tahoe-ghost px-2 py-1 text-xs rounded-lg border-hair hover:u-glass inline-flex items-center gap-1"
                onClick={handleAutoLink}
                title="Prøv at gætte variant ud fra handle/size/color"
              >
                Forsøg auto-link
              </button>
            </>
          )}
        </div>
      </div>

      {catalog ? (
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-[hsl(var(--surface-2))] grid place-items-center">
            <ImageIcon className="h-4 w-4 opacity-60" />
          </div>
          <div>
            <div className="font-medium">{catalog.source.supplier}</div>
            <div className="text-xs text-muted">
              Sidst synk: {new Date(catalog.source.lastSyncISO ?? Date.now()).toLocaleDateString()}
              {currentLink?.variantSku
                ? ` • Variant: ${currentLink.variantSku}`
                : currentLink?.catalogId
                  ? ` • Produkt: ${currentLink.catalogId}`
                  : ''}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-muted">Ikke knyttet til katalog.</div>
      )}

      <div className="mt-3 text-xs text-muted">
        PR (purchase request) kommer i næste milepæl: tilføj flere linjer og eksportér til
        leverandør.
      </div>
    </div>
  );
}

function NotesPanel({ item }: { item: InventoryItem }) {
  const [val, setVal] = React.useState('');
  return (
    <div className="rounded-2xl border border-hair bg-white/70 p-3 anim-panel">
      <textarea
        className="tahoe-input w-full h-40"
        placeholder="Interne noter…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <div className="mt-2 text-xs text-muted">
        Noter er lokale i v2; senere flyttes de til bevægelses-/auditsystemet.
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-0.5">{label}</div>
      <div className="text-sm truncate">{value}</div>
    </div>
  );
}

/* -------------------- Lightbox -------------------- */

function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (step: number) => void;
}) {
  if (!images.length) return null;
  const current = images[index] ?? images[0];

  return (
    <div
      className={cn(
        'fixed inset-0 z-[120] bg-white/5 dark:bg-black/5 backdrop-blur-sm pointer-events-auto',
        'grid place-items-center anim-fade',
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Billedgalleri"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 rounded-full bg-white/90 dark:bg-[hsl(var(--surface))]/90 border border-hair h-9 w-9 grid place-items-center shadow-sm transition-transform duration-150 hover:scale-[1.03]"
        onClick={onClose}
        aria-label="Luk"
      >
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/90 dark:bg-[hsl(var(--surface))]/90 border border-hair h-10 w-10 grid place-items-center shadow-sm backdrop-blur transition-transform duration-150 hover:scale-[1.03]"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(-1);
            }}
            aria-label="Forrige billede"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/90 dark:bg-[hsl(var(--surface))]/90 border border-hair h-10 w-10 grid place-items-center shadow-sm backdrop-blur transition-transform duration-150 hover:scale-[1.03]"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate(1);
            }}
            aria-label="Næste billede"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}
      <div className="max-w-5xl w-[92vw] anim-zoom" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.url}
          alt={current.label || ''}
          className="block w-full h-auto rounded-xl shadow-xl"
        />
      </div>
    </div>
  );
}
