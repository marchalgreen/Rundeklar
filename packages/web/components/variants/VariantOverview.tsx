'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { useVariantSync } from '@/lib/variants/VariantSyncProvider';
import { normalize } from '@/lib/variants/utils';
import VariantMatrix from './VariantMatrix';
import { ProductVariant } from '@/lib/variants/types';
import { cn } from '@/lib/utils';

type ColorGroup = {
  key: string;
  color?: string;
  label: string;
  variants: ProductVariant[];
};

export default function VariantOverview() {
  const { product, activeColor, setActiveColor, setActiveVariantByColor } = useVariantSync();

  const groups = React.useMemo<ColorGroup[]>(() => {
    if (!product?.variants?.length) return [];
    const map = new Map<string, ColorGroup>();
    product.variants.forEach((variant) => {
      const normalized = normalize(variant.color);
      const key = normalized || '__no-color__';
      const entry = map.get(key);
      const label = variant.color && variant.color.trim().length > 0 ? variant.color : 'Uden farve';
      if (entry) {
        entry.variants.push(variant);
      } else {
        map.set(key, {
          key,
          color: normalized ? variant.color : undefined,
          label,
          variants: [variant],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [product]);

  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-hair bg-white/70 p-3 text-sm text-muted">
        Ingen varianter registreret i kataloget.
      </div>
    );
  }

  const normalizedActive = normalize(activeColor);

  return (
    <div className="rounded-2xl border border-hair bg-white/70 divide-y">
      {groups.map((group) => {
        const groupKey = group.key;
        const groupNormalized = normalize(group.color);
        const isOpen = groupNormalized
          ? groupNormalized === normalizedActive
          : !group.color && !normalizedActive;

        const handleClick = () => {
          setActiveColor(group.color);
          setActiveVariantByColor(group.color);
        };

        const sizePreview = group.variants
          .map((variant) => variant.size)
          .filter((value): value is string => Boolean(value));

        return (
          <div key={groupKey} className="p-3">
            <button
              type="button"
              className={cn(
                'w-full flex items-center justify-between text-left rounded-xl px-2 py-1.5 transition-colors',
                isOpen ? 'bg-[hsl(var(--surface-2))]' : 'hover:bg-[hsl(var(--surface-2))]'
              )}
              onClick={handleClick}
              aria-expanded={isOpen}
            >
              <div>
                <div className="font-medium text-sm">{group.label}</div>
                {sizePreview.length ? (
                  <div className="text-xs text-muted">
                    {sizePreview.join(', ')}
                  </div>
                ) : null}
              </div>
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div className="mt-3">
                <VariantMatrix focusColor={group.color} variants={product?.variants} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
