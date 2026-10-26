# Handoff Report: Frontend & UX Architecture Survey

**Agent:** Survey Explorer 3 (Frontend & UX Architect)  
**Working Directory:** `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_3`  
**Report Type:** Hard Handoff (Investigation Complete)  
**Date:** 2026-10-20  

---

## 1. Observation

### Observation 1: Target Directory State
- Directory `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` is currently an uninitialized clean slate containing only the `.agents/` orchestration directory.
- Direct tool command: `list_dir(DirectoryPath="/run/media/n-a-t/Local Disk_HDD/Mm-Mp")` returned only `[{"name":".agents", "isDir":true}]`.
- Direct confirmation: R1 clean-slate foundation is intact. No legacy code or fictional databases exist in `Mm-Mp`.

### Observation 2: SvelteKit Stack & Package Configuration in Reference Codebase
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/package.json` (lines 17–32):
  - `@sveltejs/kit: 2.70.3`
  - `svelte: 5.57.1`
  - `vite: 8.3.0`
  - `typescript: 6.0.3`
  - `gsap: ^3.15.0`
  - `pg: 8.23.1`
  - `qrcode: 1.5.4`
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/vite.config.ts` (lines 1–16):
  - Uses `@sveltejs/vite-plugin-svelte` and `@sveltejs/kit/vite` with `envDir: '../'`, port `5174`.

### Observation 3: GSAP Animation Integration & SSR-Safe Pattern
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/+page.svelte` (lines 94–150):
  - GSAP and ScrollTrigger are dynamically imported within `onMount`:
    ```typescript
    const gsapModule = await import('gsap');
    const scrollTriggerModule = await import('gsap/ScrollTrigger');
    const gsap = gsapModule.gsap || gsapModule.default;
    const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
    gsap.registerPlugin(ScrollTrigger);
    ```
  - Staggered entrance animations on `.hero-badge, .hero-headline, .hero-lead, .hero-actions-cluster, .hero-metrics-strip` (lines 104–110).
  - ScrollTrigger animations on `.interactive-phone-frame` (lines 113–123) and `.tier-card` (lines 126–136).

### Observation 4: Visual Aesthetics & Color Violations
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/app/src/app.css`:
  - Line 50: `--color-info: #3B82F6;` (bright electric blue).
  - Line 54: `--telebirr: #005BBB;` (bright cobalt blue).
  - Line 57: `--cbe-gold: #EAB308;` (bright yellow).
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/[businessSlug]/[branchSlug]/+page.svelte`:
  - Line 916: `.telebirr-card { background: linear-gradient(135deg, #005CB9 0%, #00366E 100%); color: #FFFFFF; }` (bright blue).
  - Line 926: `.awash-card { background: linear-gradient(135deg, #0054A6 0%, #F7931E 180%); }` (blue).
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/+page.svelte` (lines 858–865):
  - A warm luxury palette was explicitly defined:
    ```css
    /* TASTEFUL LUXURY WARM PALETTE (STRICTLY NO BRIGHT YELLOW/BLUE)
       Base: #0E1015 Deep Charcoal / Slate
       Cards: #151821 Subtle Warm Obsidian
       Accent: #C87D55 Burnished Copper / Terracotta
       Accent Hover: #B5653C
       Text Primary: #F5F3EF Soft Cream
       Text Muted: #9E988D Muted Oatmeal */
    ```

### Observation 5: Offline Cart Persistence & State Management
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/lib/services/indexedDbStore.ts` (lines 21–59):
  - Database `MenuMini_OfflineDB` with store `dining_sessions`, indexed by `sessionKey`.
  - Fallback logic (lines 53–58 & 71–77):
    ```typescript
    catch (e) {
      console.warn('IndexedDB save failed, falling back to localStorage:', e);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`menumini_${sessionKey}`, JSON.stringify(data));
      }
    }
    ```
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/lib/menu/cart-draft.ts` (lines 109–112):
  - Calculates prices using integer cents (`moneyCents`, `centsText`) to eliminate floating-point errors.
  - Verifies cart validity against `offer.pricingFingerprint` and `offer.menu.publicationId` (lines 62–64).

### Observation 6: Typography & Language Toggle
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/app.html` (line 13):
  - `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">`
  - Font import is completely missing Ethiopic glyph support (`Noto Sans Ethiopic`).
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/+page.svelte` (lines 357–361 & 392–395):
  - Live interactive preview toggles language: `activeLanguage = activeLanguage === 'en' ? 'am' : 'en'`, switching dish and category labels between English and Amharic.

### Observation 7: Commercial User Flows & PostgreSQL Atomic Publication
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/lib/server/auth.ts`:
  - `registerMerchant` (lines 61–209): creates `app_users`, `merchants`, `merchant_memberships`, `venues`, `branch_profile_drafts`, `menu_drafts`, `staff_sessions` inside a single PostgreSQL transaction (`begin` / `commit`).
  - Passwords hashed using `scryptSync(password, salt, 64)`.
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/api/auth/[action]/+server.ts` (lines 31–37):
  - Sets cookie `menumini_session` with `httpOnly: true, sameSite: 'lax', maxAge: 2592000, secure: process.env.NODE_ENV === 'production'`.
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations/0005_menu_publication.sql`:
  - `menumini.publish_menu(p_venue, p_draft, p_profile, p_key)` (lines 296–360):
    - Archives previous items/modifiers and upserts new relational rows.
    - Inserts immutable snapshot into `menumini.menu_publications`.
    - Inserts/updates `menumini.venue_routes(slug, merchant_id, venue_id, publication_id, is_active=true)`.
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/menu/[venueSlug]/+page.server.ts` (lines 5–14):
  - Invokes `readPublishedMenu(params.venueSlug)` which calls `menumini.read_public_menu($1)` under role `menu_public`.
- In `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/admin/qr-codes/+page.svelte` (lines 38–41):
  - Generates table QR URLs pointing to `${data.origin}/menu/${data.venueSlug}?table=${i + 1}`.
  - Line 114 called `https://api.qrserver.com/...` instead of using the local `qrcode` npm library.

---

## 2. Logic Chain

1. **Clean Slate Foundation (R1)**: Observation 1 confirms `/run/media/n-a-t/Local Disk_HDD/Mm-Mp` contains zero files except `.agents`. Therefore, the frontend in `Mm-Mp/web` must be built directly into this directory without copying fictional seed data or mock dashboards.
2. **Framework & Animation Stability (R2)**: Observation 2 & 3 demonstrate that `MenuMini_1`'s combination of SvelteKit 2 + TypeScript + Vite 8 is stable, and dynamic import of GSAP on mount resolves SvelteKit SSR window reference errors while enabling smooth ScrollTrigger animations.
3. **Aesthetic Compliance**: Observation 4 reveals that legacy code had bright cobalt blue (`#005BBB`), bright yellow (`#EAB308`), and electric blue payment cards (`#005CB9`), directly violating the user's styling constraints. Meanwhile, Observation 4 highlights that `MenuMini_1/src/routes/+page.svelte` already pioneered the warm luxury palette (`#0E1015` charcoal, `#151821` obsidian, `#C87D55` burnished copper, `#F5F3EF` soft cream). Applying this palette across all customer and merchant surfaces resolves all color violations.
4. **Reliable Offline Persistence (R2)**: Observation 5 shows that `indexedDbStore.ts` provides a structured, asynchronous client store with automatic fallback to `localStorage`. Combining this with `cart-draft.ts` ensures that diners maintain their cart across disconnections without floating-point precision loss.
5. **Typographic Integrity (R2)**: Observation 6 exposes that `app.html` only imported Latin fonts. To ensure high-quality bilingual rendering in Addis Ababa, `Noto Sans Ethiopic` must be added to Google Fonts imports and CSS font family stacks with appropriate line height (`1.6`).
6. **Commercial Flow Completeness (R3)**: Observation 7 demonstrates that the full end-to-end journey exists in `MenuMini_1`:
   - Merchant registration via `scrypt` hashing and secure cookies.
   - Menu Studio section/dish editing with ETB pricing and optimistic concurrency.
   - Atomic publication via `menumini.publish_menu` activating `venue_routes`.
   - Customer view `/menu/[venueSlug]` reading via unprivileged `menu_public` role.
   - Dynamic table QR generation (replacing third-party `api.qrserver.com` with client-side `qrcode`).

---

## 3. Caveats

1. **Subagent Execution Scope**: This survey is read-only. No code modifications were committed to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/web` during this turn.
2. **Backend Service Integration**: The frontend Web PWA interacts with PostgreSQL via SvelteKit server endpoints (`+server.ts` and `+page.server.ts` using `pg`). Coordination with the Go Realtime Engine (`services/go`) for live order WebSockets will require WebSocket endpoints integrated into customer and admin pages.
3. **Network Mode**: In offline environments, Google Fonts CDN will fallback to system Ethiopic fonts (`'Noto Sans Ethiopic', 'Abyssinica SIL', Nyala`). Local font asset bundling in `static/fonts/` is recommended if full offline independence is required.

---

## 4. Conclusion

The frontend architecture for `Mm-Mp/web` is fully investigated and ready for implementation:
- **Base Architecture**: Replicate and enhance the SvelteKit 2 + TypeScript + GSAP structure of `MenuMini_1`.
- **Palette**: Enforce the Warm Luxury design system (`#0E1015` base, `#151821` surface, `#C87D55` copper, `#F5F3EF` cream, `#D97706` amber); strictly eliminate `#005BBB`, `#3B82F6`, `#EAB308`.
- **State Management**: Utilize `indexedDbStore.ts` for offline cart persistence with `localStorage` fallback, and BigInt ETB cents arithmetic in `cart-draft.ts`.
- **Typography & Localization**: Add `Noto Sans Ethiopic` to `app.html` and provide a reactive language switch (`activeLanguage: 'en' | 'am'`) on customer routes.
- **Commercial Flows**: Port `auth.ts`, `MenuStudio.svelte`, `menu/[venueSlug]/+page.svelte`, and `admin/qr-codes/+page.svelte` (replacing external QR API with local `qrcode`).

---

## 5. Verification Method

To independently verify the findings in this report:

1. **Inspect Target State**:
   ```bash
   ls -la "/run/media/n-a-t/Local Disk_HDD/Mm-Mp"
   ```
   *Expected result:* Only `.agents` exists.

2. **Verify GSAP Dynamic Import in Reference**:
   ```bash
   grep -n "import('gsap')" "/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/+page.svelte"
   ```
   *Expected result:* Line 96 dynamically imports `gsap`.

3. **Verify Color Palette in Reference**:
   ```bash
   grep -n -C 5 "STRICTLY NO BRIGHT YELLOW/BLUE" "/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/routes/+page.svelte"
   ```
   *Expected result:* Lines 858–865 define the warm luxury tokens.

4. **Verify Missing Ethiopic Font in Reference**:
   ```bash
   grep -n "Noto" "/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/src/app.html"
   ```
   *Expected result:* No matches found (confirming the font import gap).

5. **Verify Atomic Publication Function in Database**:
   ```bash
   grep -n "create function menumini.publish_menu" "/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/database/migrations/0005_menu_publication.sql"
   ```
   *Expected result:* Line 296 defines the atomic publishing transaction.

6. **Verify Comprehensive Survey Report**:
   Inspect `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_survey_3/survey_frontend.md`.
