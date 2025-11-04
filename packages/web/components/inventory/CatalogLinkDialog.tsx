// src/components/inventory/CatalogLinkDialog.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useCatalogLink } from '@/store/catalogLink';
import { DEFAULT_VENDOR_SLUG, vendorLabel } from '@/lib/catalog/vendorSlugs';
import type { CatalogProduct } from '@/types/product';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Link as LinkIcon, Package, Tag } from 'lucide-react';

export type CatalogLinkDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId: string;
  vendor?: string; // default vendor slug
  initialQuery?: string;
};

export default function CatalogLinkDialog({
  open,
  onOpenChange,
  itemId,
  vendor = DEFAULT_VENDOR_SLUG,
  initialQuery = '',
}: CatalogLinkDialogProps) {
  const linkTo = useCatalogLink((s) => s.linkTo);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [q, setQ] = React.useState(initialQuery);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => setHydrated(true), []);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        setError(undefined);
        const res = await fetch('/api/catalog/moscot', { cache: 'no-store' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || res.statusText);
        }
        const j = await res.json();
        const list = (j?.products || []) as CatalogProduct[];
        setProducts(Array.isArray(list) ? list : []);
      } catch (err: any) {
        setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!q.trim()) return products.slice(0, 50);
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = products.filter((p) => {
      const hay = [
        p.name,
        p.model,
        p.brand,
        ...(p.collections || []),
        ...(p.tags || []),
        ...(p.variants || []).map((v: any) => v.sku || ''),
        ...(p.variants || []).map((v: any) => v.color?.name || ''),
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    return hits.slice(0, 80);
  }, [products, q]);

  const vendorName = React.useMemo(() => vendorLabel(vendor), [vendor]);

  function doLinkProduct(p: CatalogProduct) {
    linkTo({
      itemId,
      vendor,
      catalogId: p.catalogId,
      variantSku: undefined,
      note: `Linked to ${vendorName} product`,
    });
    onOpenChange(false);
  }

  function doLinkVariant(p: CatalogProduct, variantSku: string) {
    linkTo({
      itemId,
      vendor,
      catalogId: p.catalogId,
      variantSku,
      note: `Linked to ${vendorName} variant`,
    });
    onOpenChange(false);
  }

  if (!hydrated) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          'z-[130] sm:max-w-[900px] rounded-2xl border border-hair bg-white/85 backdrop-blur-md',
          'shadow-[0_24px_120px_rgba(0,0,0,.18)] px-3 sm:px-4 pb-4',
        )}
      >
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="truncate text-[15px]">
              Link til katalog — <span className="font-medium">{vendorName}</span>
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <div className="mb-2 flex items-center gap-2">
          <label className="tahoe-input flex items-center gap-2 rounded-xl border-hair px-2 py-1.5 focus-within:ring-focus w-full">
            <Search className="h-4 w-4 opacity-70" aria-hidden="true" />
            <input
              className="bg-transparent outline-none w-full text-sm"
              placeholder="Søg model, farve, størrelse, SKU… (fx 'Lemtosh 49 Burgundy')"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </label>
        </div>

        <div className="mb-2 text-xs text-muted">
          {loading ? 'Henter katalog…' : error ? `Fejl: ${error}` : `${filtered.length} resultater`}
        </div>

        <div className="max-h-[60vh] overflow-auto pr-1">
          {filtered.map((p) => (
            <ProductResultRow
              key={p.catalogId}
              product={p}
              onLinkProduct={doLinkProduct}
              onLinkVariant={doLinkVariant}
            />
          ))}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-sm text-muted px-2 py-8 text-center">
              Ingen resultater for “{q}”.
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ProductResultRow({
  product,
  onLinkProduct,
  onLinkVariant,
}: {
  product: CatalogProduct;
  onLinkProduct: (p: CatalogProduct) => void;
  onLinkVariant: (p: CatalogProduct, sku: string) => void;
}) {
  const hero = product.photos.find((p) => p.isHero) ?? product.photos[0];
  const variants = (product.variants || []) as any[];
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="mb-2 rounded-xl border border-hair bg-white/70 p-2">
      <div className="flex items-center gap-2">
        <div className="h-14 w-20 rounded-lg overflow-hidden border border-hair bg-[hsl(var(--surface-2))] flex-shrink-0">
          {hero ? (
            <img
              src={hero.url}
              alt={hero.label || ''}
              className="block w-full h-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-muted">
              <Package className="h-5 w-5 opacity-50" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{product.name}</div>
          <div className="text-xs text-muted truncate">
            {product.brand ?? '—'} • {product.collections?.join(', ') ?? ''}
          </div>
          <div className="mt-1 flex items-center gap-1">
            {product.price ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-[hsl(var(--surface-2))]">
                <Tag className="h-3 w-3 opacity-70" /> {product.price.amount}{' '}
                {product.price.currency}
              </span>
            ) : null}
            <span className="text-[11px] text-muted">• {variants.length} varianter</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-lg border-hair hover:u-glass"
            onClick={() => onLinkProduct(product)}
            title="Link produkt (uden variant)"
          >
            <span className="inline-flex items-center gap-1">
              <LinkIcon className="h-3.5 w-3.5" /> Link
            </span>
          </button>
          <button
            className="tahoe-ghost px-2 py-1 text-xs rounded-lg border-hair hover:u-glass"
            onClick={() => setExpanded((v) => !v)}
            title="Vis varianter"
          >
            {expanded ? 'Skjul varianter' : 'Vælg variant'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 rounded-lg border border-hair/70 bg-white/70 p-2">
          {variants.length === 0 && (
            <div className="text-xs text-muted py-2">Ingen variantdata fra leverandør.</div>
          )}

          {variants.length > 0 && (
            <table className="w-full text-xs">
              <thead className="text-[11px] text-muted">
                <tr className="border-b border-hair/60">
                  <th className="py-1 text-left">SKU</th>
                  <th className="py-1 text-left">Størrelse</th>
                  <th className="py-1 text-left">Farve</th>
                  <th className="py-1 text-right w-[80px]">Handling</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v: any) => (
                  <tr key={v.id} className="border-b border-hair/40 last:border-none">
                    <td className="py-1 pr-2">{v.sku ?? '—'}</td>
                    <td className="py-1 pr-2">
                      {v.sizeLabel || (v.size ? `${v.size.lens ?? ''}` : '—')}
                    </td>
                    <td className="py-1 pr-2">{v.color?.name ?? '—'}</td>
                    <td className="py-1 text-right">
                      <button
                        className="tahoe-ghost px-2 py-0.5 rounded-lg border-hair hover:u-glass"
                        onClick={() => onLinkVariant(product, v.sku ?? '')}
                        disabled={!v.sku}
                        title={v.sku ? 'Link denne variant' : 'Variant mangler SKU'}
                      >
                        Link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
