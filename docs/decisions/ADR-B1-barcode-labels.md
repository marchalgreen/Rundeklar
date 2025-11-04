# ADR-B1 — Barcode Lookup & Label Printing

**Date:** 2025-10-15  
**Status:** Accepted  
**Epic:** [EPIC-Varelager](../epics/EPIC-varelager.md)

## Context

Users need quick item lookup by barcode and printable shelf/box labels.

## Decision

- **Scan:** Use the web **BarcodeDetector** API when available; provide **manual entry** fallback. Add **torch** toggle via `applyConstraints` when supported.
- **Labels:** Use **JsBarcode** to render **SVG** barcodes; print via browser with print CSS.

## Rationale

- Minimal dependencies; modern browsers support BarcodeDetector, and SVG barcodes print crisply.
- Manual input guarantees compatibility; camera UX provides speed.

## Implementation

- `BarcodeLookupDialog`: manual input + camera, detector on `<video>`, torch toggle.
- `LabelSheetDialog`: A4 grid preview (4 columns); immediate SVG render; Print action.
- Toolbar refined with compact actions + overflow.

## Alternatives Considered

- ZXing WASM: better legacy support, but larger payload; reserved as fallback if needed.

## Follow-ups

- Add ZXing fallback for non-supporting browsers if field feedback requires it.
