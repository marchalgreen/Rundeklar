'use client';

import * as React from 'react';
import { ProductVariant } from '@/lib/variants/types';
import { normalize } from '@/lib/variants/utils';

type VariantMatrixProps = {
  focusColor?: string;
  variants?: ProductVariant[];
};

export default function VariantMatrix({ focusColor, variants }: VariantMatrixProps) {
  const rows = React.useMemo(() => {
    if (!variants?.length) return [] as ProductVariant[];
    if (!focusColor) return variants;
    const target = normalize(focusColor);
    if (!target) return variants;
    return variants.filter((variant) => {
      const color = normalize(variant.color);
      if (!color) return false;
      if (color === target) return true;
      return color.startsWith(target);
    });
  }, [variants, focusColor]);

  if (!rows.length) {
    return (
      <div className="text-sm text-muted py-2 px-1">
        Ingen varianter for denne farve.
      </div>
    );
  }

  const showColorColumn = !focusColor;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr>
            {showColorColumn ? <th className="py-1 text-left">Farve</th> : null}
            <th className="py-1 text-left">Størrelse</th>
            <th className="py-1 text-left">SKU</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((variant) => (
            <tr key={variant.id} className="border-t border-hair/60 last:border-b">
              {showColorColumn ? (
                <td className="py-2 pr-2 align-top">{variant.color ?? '—'}</td>
              ) : null}
              <td className="py-2 pr-2 align-top">{variant.size ?? '—'}</td>
              <td className="py-2 align-top">{variant.sku ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
