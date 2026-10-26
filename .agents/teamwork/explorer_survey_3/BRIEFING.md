# BRIEFING — 2026-10-20T18:38:00Z

## Mission
Frontend & UX architectural survey of Web PWA (SvelteKit, GSAP, warm luxury aesthetic, offline cart, bilingual typography, and commercial merchant/customer user flows) across reference and target repositories.

## 🔒 My Identity
- Archetype: explorer
- Roles: Frontend & UX Architect
- Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_3
- Original parent: 9017f19c-7691-438b-963f-2783eaf1e83d
- Milestone: initial_survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect reference (`/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment`) and target (`/run/media/n-a-t/Local Disk_HDD/Mm-Mp`)
- Verify warm luxury styling (espresso, amber, slate, cream/gold; NO bright yellow, NO bright blue)
- Verify offline cart persistence and state management
- Verify bilingual typography (Amharic/English) and language toggle
- Verify commercial flows (landing, merchant auth, Menu Studio draft/section/dish, atomic publish, customer view `/menu/[venueSlug]`, table QR)
- Write output to `survey_frontend.md` and `handoff.md`

## Current Parent
- Conversation ID: 9017f19c-7691-438b-963f-2783eaf1e83d
- Updated: 2026-10-20T18:38:00Z

## Investigation State
- **Explored paths**:
  - `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` (confirmed clean slate)
  - `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1`
  - `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/app`
  - `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/docs`
- **Key findings**:
  - `MenuMini_1` provides the tested SvelteKit 2 + TypeScript + Vite 8 stack with `pg` database connection, `qrcode`, and `gsap`.
  - GSAP animations must be loaded dynamically on `onMount` to prevent SSR window reference crashes.
  - Color audit revealed violations in legacy code (`#005BBB` electric blue, `#EAB308` bright yellow). The Warm Luxury system (`#0E1015` charcoal, `#151821` obsidian, `#C87D55` terracotta, `#F5F3EF` cream, `#D97706` amber) is mapped and verified.
  - Offline cart persistence uses hybrid `indexedDbStore.ts` with `localStorage` fallback and BigInt ETB cents arithmetic in `cart-draft.ts`.
  - Ethiopic font gap identified in `app.html`: `Noto Sans Ethiopic` must be imported for authentic Amharic script rendering.
  - Complete commercial flow mapped: Registration -> Menu Studio -> Atomic PostgreSQL publication (`menumini.publish_menu` -> `menumini.venue_routes`) -> Customer route `/menu/[venueSlug]` with zero-commission telebirr & CBE Birr placards -> Dynamic table QR codes.
- **Unexplored areas**: None for survey scope. Full blueprints documented in `survey_frontend.md`.

## Key Decisions Made
- Recommending `MenuMini_1`'s architectural core as the blueprint for `Mm-Mp/web`.
- Strict enforcement of warm luxury aesthetic; redesigned telebirr and CBE Birr payment placards into refined dark obsidian/wine cards with gold/amber trims.
- Elimination of external `api.qrserver.com` calls in favor of local `qrcode` generation.
- Full zero-sample-data compliance: merchant dashboards initialize with real dynamic queries and clean empty states.

## Artifact Index
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_3/survey_frontend.md` — Comprehensive frontend & UX architecture survey
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_3/handoff.md` — 5-component structured handoff report
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_3/progress.md` — Liveness and task heartbeat
- `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_3/DISPATCH.md` — Dispatch logs
