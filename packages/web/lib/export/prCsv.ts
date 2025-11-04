// src/lib/export/prCsv.ts

export interface PurchaseRequestCsvLine {
  sku: string;
  name: string;
  qty: number;
  supplierHint?: string | null;
}

export interface PurchaseRequestCsvInput {
  supplierHint?: string | null;
  lines: PurchaseRequestCsvLine[];
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function purchaseRequestToCsv(draft: PurchaseRequestCsvInput): string {
  const rows: string[] = [];
  rows.push('SKU,Name,Quantity,Supplier');

  for (const line of draft.lines) {
    const supplier = line.supplierHint ?? draft.supplierHint ?? '';
    rows.push(
      [line.sku, line.name, line.qty, supplier]
        .map((value) => escapeCsv(value))
        .join(','),
    );
  }

  return rows.join('\n');
}
