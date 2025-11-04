EPIC: Local Device Ingest Bridge v2.0
====================================

Purpose
-------
- Deliver a cross-platform companion agent that captures serial and watched-folder output from ophthalmic devices, normalizes it, and relays it to Clairity in near real-time.
- Support macOS 13+ and Windows 10+ environments running Chrome or Safari, with multiple workstations per practice.

Background Validation (2025 refresh)
------------------------------------
- **Packaging** – `@yao-pkg/pkg` (maintained fork, 2024.12 release) packages Node 20 executables for macOS/Windows/Linux, supports scripted asset inclusion, compression, and SEA mode. Guides highlight the need to avoid dynamic `require()` patterns by defining `pkg` config in `package.json`.
- **Serial I/O** – `serialport` v12+ exports parsers as top-level modules, uses promise-based `list()`, and remains compatible with Node 20. Streams are duplex with consistent error semantics, matching our back-pressure requirements.
- **File watching** – `chokidar` v4 removes direct glob watching; `ignored` filters or precomputed globs are required. It offers atomic write stabilization (`awaitWriteFinish`) and granular polling controls, ideal for network share drops.
- **Windows service wrapper** – WinSW 3.x (Nov 2024) is actively maintained; supports restart policies, environment overrides, and log rotation for Windows Services.
- **macOS launch services** – Ventura/Sonoma require notarized, signed binaries for LaunchDaemons/Agents; unsigned builds prompt users but remain installable in pilot environments, emphasizing a parallel track for acquiring signing certificates.

Scope & Goals
-------------
1. Package the device agent as single-file executables per OS with embedded configuration schema and TLS-enabled uplink client.
2. Provide modular adapters for serial-over-USB streams and watched-directory ingestion, with runtime-configurable parameters.
3. Normalize payloads into a shared JSON/protobuf schema enriched with device metadata before forwarding to Clairity ingest APIs.
4. Ship an auto-update system that consumes signed manifests, stages replacements, and restarts services without manual intervention.
5. Expose structured logging, health telemetry, retry queues, and local diagnostics so support teams can triage installations quickly.

Explicit Non-Goals
------------------
- Linux packaging (collect demand first).
- Persistent push channel in v1 (defer to Phase 3 when backend WebSocket/MQTT lands).
- GUI configuration (initial setup via CLI wizard + generated JSON; future desktop UI TBD).
- Device-specific protocol parsing beyond framing and metadata extraction (backend owns downstream normalization for now).

Architecture Overview
---------------------
- **Runtime** – Node 20 LTS, ESM modules, packaged via `@yao-pkg/pkg` using explicit `pkg` configuration (targets: `node20-macos-x64`, `node20-macos-arm64`, `node20-win-x64`).
- **Adapters**  
  - *SerialAdapter*: wraps `serialport`, supports ByteLength/Delimiter parsers, configurable baud/data bits, with back-pressure via the `readable` event.  
  - *FolderAdapter*: wraps `chokidar` v4, stabilizes atomic writes, and optionally debounces high-volume directories.
- **Pipeline** – Adapter → Parser → Validator (Zod + generated protobuf types) → resilient in-memory/file-backed queue → Transport client.
- **Transport** – HTTPS polling MVP using short-lived JWT service tokens, exponential back-off retry, disk-based dead-letter queue for outages; future dual mode adds WebSocket/MQTT.
- **Auto-update** – Agent polls signed manifest (Ed25519 signatures, SHA256 checksums). Downloads stage to a versioned directory, validates, swaps binaries, and restarts via supervisor. Previous binary retained for rollback.
- **Service wrappers**  
  - macOS LaunchDaemon (`/Library/LaunchDaemons/com.clairity.agent.plist`) or LaunchAgent for per-user installs; KeepAlive with crash throttling.  
  - Windows Service via WinSW XML; runs as `LocalService`, restarts on failure, logs to `%PROGRAMDATA%\Clairity\logs`.
- **Observability** – Structured JSON logs (pino), heartbeat endpoint with queue depth and last sync timestamp, optional telemetry beacons to Clairity.

Implementation Phases & Timeline
--------------------------------
### Phase 0 – Discovery & Spike (≈2 weeks)
- Build throwaway PoC proving packaged serial + folder ingestion on macOS and Windows.
- Validate auto-update flow locally (self-signed manifest) without service wrappers.
- Finalize ingest payload schema and authentication handshake with backend.

### Phase 1 – Polling MVP (≈4 weeks)
- Harden adapters, implement configuration system (CLI wizard + persisted JSON/YAML under app data).
- Add validation, retry queue, and HTTPS batching transport.
- Integrate with Clairity ingest API (Supertest contract tests + staging endpoint).
- Package installers: macOS `.pkg` (LaunchDaemon) and Windows PowerShell/WinSW bootstrapper (unsigned beta).
- Ship local status CLI (`agent status`, `agent logs`) and structured logging.
- QA matrix: unit tests, integration tests with mocked backend, manual runs on target OSes.

### Phase 2 – Reliability & Auto-Update (≈3 weeks)
- Production-grade updater (signed manifest hosting, checksum verification, rollback on failure).
- Telemetry heartbeat + Prometheus-style JSON diagnostics endpoint.
- Log rotation, queue introspection CLI, watchdog for repeated crash detection.
- Security review of update flow and credential handling.

### Phase 3 – Push Channel & Observability (≈3 weeks)
- Add WebSocket/MQTT transport (keep polling fallback) once backend channel ready.
- Instrument latency metrics end-to-end, expose Prometheus exporter, surface metrics to Ops.
- Enhance diagnostics (`agent support-bundle`), including config snapshot and recent logs.
- Finalize rollout playbook, monitoring KPIs, and rollback procedure for GA.

Acceptance Criteria
-------------------
- Installer registers agent as service, starts automatically on macOS + Windows, and survives reboot.
- Serial and folder adapters forward sample device output with <10s latency under nominal network conditions.
- Self-update replaces binaries without manual intervention and safely rolls back on signature/checksum mismatch.
- Local logs + diagnostics available; heartbeat endpoint exposes status, queue depth, and last success timestamp.
- Backend receives normalized payload and surfaces it in Clairity UI within 15s, visible in QA dashboards.
- Automated test suite (unit + integration) passes; manual smoke with hardware loopback executed per release.

Risks & Mitigations
-------------------
- **Code-signing delays** – Launch unsigned beta with documented prompts; initiate Apple Developer ID & Azure Code Signing acquisition in parallel.
- **`pkg` static analysis gaps** – Enforce lint rule blocking dynamic `require`, maintain `pkg.assets/scripts` whitelist, add CI check for forbidden patterns.
- **Serial driver variance** – Maintain compatibility matrix, expose configurable parameters, create loopback integration tests using USB serial adapters.
- **Auto-update failure** – Stage updates, verify checksums before swap, retain previous binary, add crash watchdog and alerting.
- **Filesystem permissions** – Configuration wizard verifies target folder ACLs and falls back to user-level agents when admin rights unavailable.
- **Network instability** – Disk-backed retry queue with exponential back-off; optional alert when queue exceeds threshold.

Dependencies
------------
- Backend ingest API (authentication, schema validation, rate limiting) and UI surfacing.
- Service token issuance workflow for practices.
- Manifest hosting + signing infrastructure (S3/CloudFront or Vercel) with key rotation playbook.
- Acquisition of Apple & Microsoft code-signing certificates.
- Rollout documentation, support training, and success team enablement.

Open Questions
--------------
1. Who owns manifest signing keys and rotation cadence?
2. Do we need offline buffering beyond local filesystem (SQLite) for poor-connectivity clinics?
3. Should installers prompt for proxy configuration and certificate pinning?
4. Is there a roadmap for Linux clinics that requires early schema accommodations?
5. Can we reuse existing telemetry stack for agent heartbeats, or is a new pipeline required?

Implementation Plan Snapshot
----------------------------
- **Tooling Setup** – Extend `packages/device-agent` with build/test/package scripts, linting, and CI matrix (macOS/Windows runners).
- **Adapters & Queue** – Implement serial/folder adapters with shared event bus, Zod validation, and resilient queue (in-memory + disk spillover).
- **Transport & Auth** – Build HTTP client with token refresh, retries, and TLS verification; stub WebSocket interface for Phase 3.
- **Configuration UX** – CLI wizard for initial setup, schema migrations on startup, sample config templates bundled via `pkg`.
- **Installer Scripts** – Mac `pkgbuild` + LaunchDaemon plist; Windows PowerShell script generating WinSW XML and registering service.
- **Auto-update** – Manifest signer utility, update downloader, staging/rollback logic, service restart orchestration.
- **Observability** – Structured logging, metrics endpoint, CLI diagnostics, integration with Clairity monitoring.
- **Testing** –  
  - Unit tests for adapters, queue, updater, config loader.  
  - Integration tests with mocked backend, packaging smoke tests per OS.  
  - Manual QA: hardware loop, failure injection, service install/uninstall verification.  
  - Security tests: tampered manifest, credential misuse, permission hardening.
- **Operational Handoff** – Deployment checklist, support runbook, KPIs (delivery latency, queue depth, update success), escalation contacts.

Next Steps
----------
1. Confirm owners for manifest signing, backend ingest API, and support documentation.
2. Schedule Phase 0 spike tasks and hardware procurement for serial testing.
3. Align on schema & authentication contract with backend team before Phase 1 kickoff.
