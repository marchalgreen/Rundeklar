'use client';

import * as React from 'react';

import { useShallow } from 'zustand/react/shallow';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useInventory } from '@/store/inventory';
import { frameVariantSizeLabel, type FrameVariant, type LensVariant } from '@/types/product';

type BaseProps = {
  selectedVariantId?: string | null;
  onSelectVariant?: (variantId: string) => void;
};

type FrameProps = BaseProps & {
  category: 'Frames';
  variants: FrameVariant[];
};

type LensProps = BaseProps & {
  category: 'Lenses';
  variants: LensVariant[];
};

type VariantsTableProps = FrameProps | LensProps;

type FrameField = 'size' | 'fit' | 'color' | 'sku' | 'barcode';
type LensField = 'index' | 'coating' | 'diameter' | 'baseCurve' | 'sku' | 'barcode';

type VariantField = FrameField | LensField;

type VariantEdits = Record<string, Record<string, string>>;

function useVariantDrafts() {
  return useInventory(
    useShallow((state) => ({
      variantEdits: state.variantEdits,
      setVariantEdit: state.setVariantEdit,
    })),
  );
}

function getFrameFieldValue(variant: FrameVariant, field: FrameField): string | undefined {
  switch (field) {
    case 'size':
      return variant.sizeLabel ?? frameVariantSizeLabel(variant);
    case 'fit':
      return variant.fit ?? undefined;
    case 'color':
      return variant.color?.name ?? undefined;
    case 'sku':
      return variant.sku ?? undefined;
    case 'barcode':
      return variant.barcode ?? undefined;
    default:
      return undefined;
  }
}

function getLensFieldValue(variant: LensVariant, field: LensField): string | undefined {
  switch (field) {
    case 'index':
      return variant.index ?? undefined;
    case 'coating':
      return variant.coating ?? undefined;
    case 'diameter':
      return variant.diameter !== undefined ? String(variant.diameter) : undefined;
    case 'baseCurve':
      return variant.baseCurve !== undefined ? String(variant.baseCurve) : undefined;
    case 'sku':
      return variant.sku ?? undefined;
    case 'barcode':
      return variant.barcode ?? undefined;
    default:
      return undefined;
  }
}

function FieldInput<TField extends VariantField>({
  variantId,
  field,
  fallback,
  variantEdits,
  onChange,
  className,
}: {
  variantId: string;
  field: TField;
  fallback?: string;
  variantEdits: VariantEdits;
  onChange: (variantId: string, field: TField, value: string) => void;
  className?: string;
}) {
  const draft = variantEdits[variantId]?.[field];
  const value = draft !== undefined ? draft : fallback ?? '';
  const placeholder = fallback ? undefined : '—';
  const isDirty = draft !== undefined;

  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(variantId, field, event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onFocus={(event) => event.stopPropagation()}
      className={cn(
        'h-8 px-2 text-sm',
        isDirty
          ? 'border-[hsl(var(--accent-blue))] bg-[hsl(var(--accent-blue))]/10 focus-visible:ring-[hsl(var(--accent-blue))]'
          : 'border-hair/60 focus-visible:ring-foreground/30',
        className,
      )}
    />
  );
}

function FrameTable({ variants, selectedVariantId, onSelectVariant }: FrameProps) {
  const { variantEdits, setVariantEdit } = useVariantDrafts();
  const handleFieldChange = React.useCallback(
    (variantId: string, field: FrameField, value: string) => {
      setVariantEdit(variantId, field, value);
    },
    [setVariantEdit],
  );

  if (!variants.length) {
    return (
      <div className="rounded-2xl border border-hair bg-white/70 p-3 text-sm text-muted">
        Ingen varianter registreret i kataloget.
      </div>
    );
  }

  const fields: { key: FrameField; label: string; className?: string }[] = [
    { key: 'size', label: 'Størrelse', className: 'sm:w-40' },
    { key: 'fit', label: 'Fit', className: 'sm:w-28' },
    { key: 'color', label: 'Color' },
    { key: 'sku', label: 'SKU', className: 'sm:w-40' },
    { key: 'barcode', label: 'Barcode', className: 'sm:w-44' },
  ];

  const handleRowClick = (variantId: string) => {
    if (!onSelectVariant) return;
    if (selectedVariantId === variantId) return;
    onSelectVariant(variantId);
  };

  return (
    <div className="rounded-2xl border border-hair bg-white/70">
      <table className="w-full border-collapse text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-hair/60">
            {fields.map((col) => (
              <th key={col.key} className={cn('px-3 py-2 text-left font-medium', col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr
              key={variant.id}
              className={cn(
                'border-b border-hair/40 last:border-none transition-colors',
                selectedVariantId === variant.id
                  ? 'bg-[hsl(var(--accent-blue))]/10'
                  : 'hover:bg-muted/40',
              )}
              onClick={() => handleRowClick(variant.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleRowClick(variant.id);
                }
              }}
            >
              {fields.map((col) => (
                <td key={col.key} className={cn('px-3 py-2 align-middle', col.className)}>
                  <FieldInput
                    variantId={variant.id}
                    field={col.key}
                    fallback={getFrameFieldValue(variant, col.key)}
                    variantEdits={variantEdits}
                    onChange={handleFieldChange}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-hair/50 px-3 py-2 text-xs text-muted">
        Ændringer gemmes lokalt til demoformål.
      </div>
    </div>
  );
}

function LensTable({ variants, selectedVariantId, onSelectVariant }: LensProps) {
  const { variantEdits, setVariantEdit } = useVariantDrafts();
  const handleFieldChange = React.useCallback(
    (variantId: string, field: LensField, value: string) => {
      setVariantEdit(variantId, field, value);
    },
    [setVariantEdit],
  );

  if (!variants.length) {
    return (
      <div className="rounded-2xl border border-hair bg-white/70 p-3 text-sm text-muted">
        Ingen varianter registreret i kataloget.
      </div>
    );
  }

  const fields: { key: LensField; label: string; className?: string }[] = [
    { key: 'index', label: 'Index', className: 'sm:w-28' },
    { key: 'coating', label: 'Coating', className: 'sm:w-32' },
    { key: 'diameter', label: 'Diameter (mm)', className: 'sm:w-36' },
    { key: 'baseCurve', label: 'Base Curve', className: 'sm:w-32' },
    { key: 'sku', label: 'SKU', className: 'sm:w-40' },
    { key: 'barcode', label: 'Barcode', className: 'sm:w-44' },
  ];

  const handleRowClick = (variantId: string) => {
    if (!onSelectVariant) return;
    if (selectedVariantId === variantId) return;
    onSelectVariant(variantId);
  };

  return (
    <div className="rounded-2xl border border-hair bg-white/70">
      <table className="w-full border-collapse text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-hair/60">
            {fields.map((col) => (
              <th key={col.key} className={cn('px-3 py-2 text-left font-medium', col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr
              key={variant.id}
              className={cn(
                'border-b border-hair/40 last:border-none transition-colors',
                selectedVariantId === variant.id
                  ? 'bg-[hsl(var(--accent-blue))]/10'
                  : 'hover:bg-muted/40',
              )}
              onClick={() => handleRowClick(variant.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleRowClick(variant.id);
                }
              }}
            >
              {fields.map((col) => (
                <td key={col.key} className={cn('px-3 py-2 align-middle', col.className)}>
                  <FieldInput
                    variantId={variant.id}
                    field={col.key}
                    fallback={getLensFieldValue(variant, col.key)}
                    variantEdits={variantEdits}
                    onChange={handleFieldChange}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-hair/50 px-3 py-2 text-xs text-muted">
        Ændringer gemmes lokalt til demoformål.
      </div>
    </div>
  );
}

export default function VariantsTable(props: VariantsTableProps) {
  if (props.category === 'Frames') {
    return (
      <FrameTable
        category={props.category}
        variants={props.variants}
        selectedVariantId={props.selectedVariantId}
        onSelectVariant={props.onSelectVariant}
      />
    );
  }

  return (
    <LensTable
      category={props.category}
      variants={props.variants}
      selectedVariantId={props.selectedVariantId}
      onSelectVariant={props.onSelectVariant}
    />
  );
}
