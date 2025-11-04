#!/usr/bin/env node

/**
 * Clairity Device Agent (WIP)
 *
 * This placeholder bootstraps the future local ingest companion described in
 * docs/epics/EPIC-local-device-ingest.md. The initial goal is to stand up a
 * background service that can watch serial streams and filesystem drops, then
 * forward normalized events to the Clairity backend.
 *
 * Subsequent iterations will introduce:
 * - secure provisioning and auth tokens
 * - robust logging + auto-update pipeline
 * - shared protocol types with the web workspace
 */

function main() {
  console.log('Clairity device agent placeholder. Implementation pending.');
}

main();
