# ADR-E1 — Import/Export Library and File Limits

**Date:** 2025-10-15  
**Status:** Accepted  
**Epic:** [EPIC-Varelager](../epics/EPIC-varelager.md)

## Context

Varelager requires local export/import of grid data without backend interaction.
Must handle CSV/XLSX formats, preserve filters/visible columns, and validate rows
client-side.

## Decision

Use **SheetJS (xlsx)** for read/write and **zod** for row validation.

- ✅ Mature, widely adopted, MIT-licensed.
- ✅ Supports both CSV and Excel formats.
- ✅ Works in browsers with ArrayBuffer I/O.
- ✅ Integrates easily with Zustand state.

## Implementation

- `InventoryExportImport.tsx` component with:
  - Export of visible columns.
  - Import with `zod` validation and merge by SKU.
- Toast feedback for success/error.
- No server I/O; all in-browser.

## Consequences

- Large files (>5 MB) might impact memory; future optimization could stream.
- Back-end sync can later reuse the same zod schema for validation.

# ADR-E1 — Import/Export Library and File Limits

**Date:** 2025-10-15  
**Status:** Accepted  
**Epic:** [EPIC-Varelager](../epics/EPIC-varelager.md)

## Context

Varelager needs local export/import without backend. CSV/XLSX formats, respect visible columns, validate rows client-side.

## Decision

Use **SheetJS (xlsx)** for read/write and **zod** for row validation.

- MIT-licensed; browser-friendly
- CSV + Excel support
- Simple integration with Zustand

## Implementation

- **Export**: current view (visible columns) via dropdown (**Eksportér**)
- **Import**: compact button; `zod` validation; merge by SKU; toasts for success/warnings
- No server I/O

## Limits / Follow-ups

- Very large files may impact memory; consider streaming/server import later
- Share the same zod schema on server when DB arrives
