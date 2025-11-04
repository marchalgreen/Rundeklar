# ADR-V2 — Varelager Scope Expansion

**Date:** 2025-10-14  
**Status:** Accepted  
**Epic:** [EPIC-Varelager](../epics/EPIC-varelager.md)

## Context

The original Varelager (inventory) feature delivered a functional grid for browsing and adjusting stock but lacked depth for real-world optical retail workflows. Teams need to view, manage, and audit items, photos, suppliers, and movements in one place.

## Decision

Evolve the Varelager from a single table window into a **multi-window module** featuring:

- Item detail views (with hero photo, variants, suppliers)
- Movements timeline (audit of all adjustments/imports/returns)
- Purchase request builder (draft POs)
- Faceted filters + saved views
- Optional dashboard for owners

## Rationale

Optical retail requires both speed (scan-adjust-print) and context (supplier, warranty, cost). A multi-view module meets both needs while preserving desktop-style UX and full offline safety.

## Consequences

- Requires additional Zustand slices for variants, suppliers, movements, and purchase requests.
- Introduces multiple window types: detail, request, dashboard.
- Shared design patterns: window chrome, glass cards, phosphor icons, keyboard shortcuts.

## Future Considerations

- Supplier integrations (EDI, CSV upload).
- Multi-store inventory sync.
- Performance telemetry for large datasets.
