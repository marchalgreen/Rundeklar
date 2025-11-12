Playwright Test Plan — Coach Landing Start Flow

- Coach lands on page with no active session
  - Navigate to route that mounts `LandingPage`
  - Expect header text “Velkommen” and group cards rendered
- Select group, start session, verify redirection to checkin
  - Click a group card (e.g., “Senior A”)
  - Assert “Start session” becomes enabled
  - Click “Start session”
  - Expect navigation to CheckIn route (assert URL or heading from that view)
- Add cross-group player and verify payload contains extra player id
  - Revisit landing
  - Open “Søg spillere på tværs”
  - Type into search, pick one player
  - Start session
  - Intercept `POST /api/sessions/start` (or service call) and assert `allowedCrossGroupPlayerIds` contains the selected player id

Notes
- If backend endpoints differ, the service adapter mocks the interface; use network interception or a spy channel to assert payload.
- Respect prefers-reduced-motion for screenshots; consider forcing `prefers-reduced-motion: reduce` in browser context.

