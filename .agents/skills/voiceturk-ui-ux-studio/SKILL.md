---
name: voiceturk-ui-ux-studio
description: Design and implement polished VoiceTurk web interfaces and recording workflows. Use for VoiceTurk page maps, app shells, buyer or contributor flows, recording-studio UX, responsive styling, accessibility, empty/loading/error states, and light/dark theme work.
---

# VoiceTurk UI/UX Studio

## Preserve product truth

- Treat backend responses as authoritative for campaign, recording, review, and dataset state.
- Keep Agora limited to realtime coaching and microphone experience.
- Keep FastCheck synchronous and DeepCheck asynchronous in all progress language.
- Never imply payment, marketplace, scientific emotion detection, or production compliance.

## Build the experience

1. Identify the active role, user goal, backend state, primary action, and failure recovery.
2. Design mobile-first page hierarchy before styling individual cards.
3. Use one persistent app shell with role-aware navigation, account controls, API state, and theme control.
4. Give every remote operation explicit idle, loading, success, empty, and actionable error states.
5. Keep the recording task, coach message, meter, timer, and primary control visible without scrolling on common laptop screens.
6. Show pipeline stages honestly: local pre-check, upload, FastCheck, queued DeepCheck, and review.
7. Verify keyboard operation, focus visibility, labels, contrast, reduced-motion behavior, and narrow-screen layout.

## Visual language

- Aim for a calm premium audio workstation, not a generic admin template.
- Use deep ink surfaces with violet/cyan signal accents in dark mode and warm neutral surfaces in light mode.
- Use translucent panels sparingly; maintain opaque fallbacks and readable borders.
- Use tabular numerals for timers and metrics, compact status chips, and generous task typography.
- Prefer CSS/SVG waveform and meter visuals over decorative stock imagery.
- Reserve red for destructive actions or terminal failures, amber for retakes, green for verified/passed states, and blue/violet for active work.
- Avoid raw JSON in primary UI; place diagnostics in development-only disclosures.

## Recording studio rules

- Keep one unmistakable recording control with Space-key support when focus is outside text fields.
- Display microphone readiness before recording and a visible timer/meter while recording.
- Announce transitions and failures with an accessible live region.
- Never leave an indefinite spinner; show the stage and bounded timeout recovery.
- Retry FastCheck/pre-check failures on the same item. Advance only after backend `CONTINUE_NEXT`.
- Present session completion only from backend truth or an explicit user action confirmed by the backend.

## Completion checks

- Run frontend typecheck and production build.
- Check both themes and widths near 390px, 768px, and 1440px.
- Confirm login, buyer campaign, contributor discovery, recording, review, and dataset paths have coherent states.
- Confirm diagnostics and technical IDs do not dominate the default experience.
