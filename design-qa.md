# Homepage cover design QA

final result: passed

## Visual target and scope

- Source visual truth: `docs/hero-cover-verification/reference.png`, copied from the user's attached portfolio cover.
- Latest browser-rendered depth implementation: `docs/hero-cover-verification/depth-desktop.png` and `depth-mobile.png`. Earlier bilingual copy evidence remains in `english.png` and `chinese.png`.
- Full-view comparison: `docs/hero-cover-verification/comparison.png` (source left, implementation right).
- Focused typography comparison: `docs/hero-cover-verification/typography-comparison.png`.
- Desktop source and implementation: **1100 × 612 pixels**, **1100 × 612 CSS px**, density **1**. No density normalization or browser chrome crop was needed.
- Other checked viewports: **390 × 844** mobile and **768 × 1024** tablet; screenshots are in the same folder.
- State: homepage, opening complete, scroll at zero, live material study visible. The reference is a still photograph; the implementation preserves the user's cycling P1/P2/P3 models. Exact model silhouettes and poses are intentionally different.
- Approved substitutions: LIN ZIJING, 2026, BRAND / VISUAL and 3D / INTERACTION, fixed English title and bilingual supporting copy, existing live 3D, existing blurred video backdrop, and the bottom works link. This review matches the cover layout rather than replacing the user's models with the reference's sculpture.

## Findings and required fidelity surfaces

No actionable P0/P1/P2 findings remain within the approved scope.

- **Fonts / typography:** Compared expanded sans-serif candidates installed on this Mac. Plang Expanded TRIAL ExtraBold is the preferred local face; its width is fitted to the cover slot. The existing Liberation Sans Bold font is the portable fallback, so no trial font is redistributed. PORTFOLIO remains identical in both locales; supporting Chinese copy uses the existing site font stack. The superseded Chinese display-font subset has been removed. Title, year, labels, tracking, baseline, and no-wrap behavior were inspected in the focused comparison.
- **Spacing / layout:** Title edges are approximately x = 104.5 and 1004.3, matching the reference's x ≈ 104–1005. Visible English glyphs occupy approximately y = 264–347, compared with the reference's y ≈ 263–345. Left label rule is ~160 px; right rule is ~126 px, aligned to the same right edge. The live 3D occupies the central composition; copy is on separate pointer-transparent layers. Mobile and tablet preserve the title/identity hierarchy without horizontal overflow. Decorative frame artwork preserves its aspect ratio on tablet and is omitted on narrow mobile screens.
- **Colors / tokens:** Warm white `#f7f7f2` titles and labels, thin translucent white rules, and the established gray blurred video backdrop. The source's photographic grain and saturated sculpture colors are not substituted for the previously approved live background/materials. White-on-gray is the user's selected visual treatment; this review does not assert WCAG AA for every animation frame.
- **Image quality / assets:** Existing transparent 3D embed is retained. Fine-frame raster artwork uses edge pixels extracted from the supplied reference; obscured segments are restored using its uninterrupted top-edge strip. No replacement 3D illustration or custom SVG is added. It renders at the reference dimensions on desktop and retains its aspect ratio on tablet. The 3D iframe is scaled through CSS without increasing its WebGL render resolution or adding another scene.
- **Copy / content:** Approved option one is implemented in `content/hero.ts`. The selected-works label, discipline lines, and explore text switch between EN and 繁中; the title, name, and numeric year stay the same. There is one accessible DOM hero heading labelled PORTFOLIO in both locales. After the scene acknowledges its title texture, the DOM glyphs become transparent; their semantics and layout stay intact.

## Comparison history and fixes

1. **Initial pass — blocked.** `iteration-1.png`: [P1] fixed vertical text-mask gaps cut through letter shapes; [P2] model scaling cut off a lower satellite; [P2] right rule was too long.
   - Replaced arbitrary mask gaps with whole-letter depth layers: one O sits behind the live scene while the remaining letters stay legible in front. Narrow mobile screens use a fully legible foreground title.
   - Reduced embed scale to 1.08 and shifted its center up by 3% on desktop; mobile keeps scale 1.
   - Shortened the right rule to the reference's width while retaining the approved longer discipline text.
2. **Chinese / mobile pass — blocked.** [P2] Chinese title touched the caption rule; [P2] mobile first O could disappear completely; [P2] frame extraction retained holes caused by the reference's original sculpture.
   - Reduced Chinese title size and adjusted its vertical position; added full foreground title on mobile; restored frame segments from the supplied edge pixels.
3. **Tablet pass — blocked.** [P2] full-height frame raster stretched the fine rectangles in portrait view.
   - Added `object-fit: contain` to preserve artwork proportions. Post-fix evidence: `tablet-chinese.png`.
4. **Reference-layout pass — passed.** Reopened full-view and focused side-by-side comparisons after the fixes; desktop title placement, label alignment, fonts, image quality and approved copy match the intended composition. Added a minimum 44 px height to the works link. Latest desktop evidence: `english.png`, `chinese.png`; mobile evidence: `mobile-english.png`, `mobile-chinese.png`.

5. **Latest user steering — passed.** User requested that PORTFOLIO remain in English in both locales. Removed the Chinese display-title variant and its unused font asset. Verified both language choices produce the exact same title bounds: x = 104.5, y = 248.46875, width = 900.53949, height = 116.60156 CSS px. Only supporting text changes. Latest English/Chinese screenshots and comparison images are updated.

## Interactions and verification

- Language switch updates supporting hero copy, keeps PORTFOLIO and its bounds unchanged, and retains the 3D iframe.
- Native pointer drag over the visible model remains available; DOM hit-testing at the title center returns IFRAME, so typography does not intercept interaction.
- Scroll test at y = 337.5 px on a viewport 844 px high: hero top = −337.5 px, hero opacity ≈ 0.657, copy opacity ≈ 0.394. The model moves with the document and copy fades earlier.
- Works link navigates to `#selected-works`; section top = 0 after activation.
- Desktop body width = 1100 at viewport 1100; mobile body width = 390 at viewport 390; tablet body width = 768 at viewport 768.
- Works link measured 44 px high. Keyboard focus treatment is present; decorative assets and duplicate title are hidden from assistive technology.
- Console errors were checked. A MutationObserver startup diagnostic was already present before the cover edits and also appeared on reload; its source is unresolved. No matching observer exists in the changed component. Core cover interactions pass; this is not a claim that the whole site's console is error-free.
- Reduced-motion handling was inspected in the existing scroll effect; forced system-preference testing was not performed.
- TypeScript check passed; existing automated suite passed **15 / 15**; production Vinext build passed.
- No second WebGL canvas, full-scene pass, or project dependency was added. The existing scene draws one title quad; its off-screen refraction draws suppress that quad’s color output. Frame-rate benchmarking was not repeated; title sharpness follows the scene’s adaptive DPR.
- Local preview remains running at http://localhost:3001/; browser viewport override was reset. This iteration has **not** been deployed.

## Follow-up polish

- The preferred Plang face uses `local()`; visitors without this trial face use the fitted Liberation Sans fallback. A licensed portable expanded face can replace that fallback if identical cross-device glyph shapes are required.
- Investigate the pre-existing MutationObserver startup diagnostic separately.

## Implementation checklist

- [x] Approved bilingual hero copy and reference title/label placement.
- [x] Local-font comparison, portable Latin fallback, fixed English title across locales.
- [x] Real 3D retained, depth layers, unobstructed interaction, natural upward scrolling.
- [x] Desktop/mobile/tablet comparison and fixes.
- [x] Typecheck, 15 tests, production build, saved visual evidence.

## Object foreground follow-up — passed

- Replaced letter-based DOM layering with a cached title texture in the existing scene. Only designated opaque satellites render after the title; the physical models, positions, materials, and physics are preserved. Texture rasterization runs on layout/font changes, not every animation frame.
- Final foreground selection: P1 cross; P2 cross/cube and sphere; P3 Stone_02 and the ring assembly. Per the latest user correction, P1_Sphere_01 remains in its original rear layer and its original position. The foreground selection test explicitly excludes it.
- Foreground depth testing preserves complete mesh contours, and picking prioritizes the same foreground meshes. Native drag gestures were exercised; automatic cycling changed parts during the captured gestures, so no screenshot is presented as proof of a specific dragged displacement.
- Browser evidence at 1100×612: `depth-desktop.png`. Reopened source plus implementation in `depth-comparison.png`; title bounds and caption/rule placement remain unchanged. Ring/letter overlap verifies the new silhouette relationship. P1 sphere was initially included, then removed following the user correction.
- Responsive inspection found [P1] stale texture pixels when resizing an existing texture. Fixed by disposing and replacing fixed-size WebGL texture storage on each layout version. Retested resizing between 390×844 and 1100×612: no duplicate title remains. Final mobile evidence is `depth-mobile.png` (390×844).
- EN/繁中 keep PORTFOLIO and the same title bounds (x104.5, y248.46875, width899.796875, height116.6015625 at desktop). Only supporting copy changes. Title-center hit testing returns IFRAME.
- Mobile scroll: hero top −371.5px, hero opacity ≈0.708, cover opacity ≈0.450 during easing. Normal document movement and earlier copy fade remain intact.
- Typecheck and site tests passed (15/15); 3D tests passed (7/7, including three foreground/channel checks); rebuilt 3D embed and production site successfully. Latest captured browser error list was empty; the previously recorded observer diagnostic remains historical context.
- Local preview only; this follow-up is not deployed. No FPS guarantee or new frame-rate measurement is asserted.

## Language switch visual follow-up — passed

- User requested that the top-right language toggle match the portfolio and have no rounded container. Scope is shared switch styling in `styles/globals.css`; locale logic is unchanged.
- Removed pill background, enclosing border, padding, and all corner rounding. Uses the site's charcoal text, small tracked typography, muted slash, and a 1px underline for the selected language. Right offset aligns to the hero caption edge (8.7vw).
- Browser evidence: `language-switch-desktop.png` at 1100×612, and `language-switch-mobile.png` at 390×844 (scrolled works state). Inspected homepage and footer as well: no enclosing box in normal pointer state, selected language is clear, labels fit. A rectangular focus outline appears only for keyboard navigation.
- Both button targets measure 44×44 CSS px. Mobile body width and viewport both measure 390px. CSS computed values confirm transparent nav background, no border, and 0px radius.
- Pointer switching to 繁中 updates copy and moves the underline; Shift+Tab and Enter switch back to EN, with a visible 1px focus outline. No translation or model behavior changed.
- CSS hot reload and browser interaction checks passed; `git diff --check` passed. No new automated tests or repeat full build were needed for this styling-only change. Local preview remains running; not deployed.

## Production deployment — 2026-10-10

- Deployed to existing Cloudflare Worker `cv01-portfolio` at https://cv01-portfolio.0zjcszwsmqs.workers.dev/. Version: `03ec9305-c685-4860-bd74-916de0f4c297`. The local-only notes above describe earlier iterations; this release supersedes them.
- Fresh release verification: site typecheck, 15 site tests, 7 scene tests, scene rebuild, Vinext production build and Wrangler dry run all passed. Scene rebuild from the newly versioned `hero-scene` produces the same `index-Bv2KevAt.js` as the reviewed sibling source.
- Live browser checks confirmed hero rendering acknowledgement, the matching embedded script, fixed PORTFOLIO title, transparent/borderless/square language switch, and EN/繁中 copy changes. `/works/project-02` opens and changes its introduction, approach and navigation copy correctly in both languages.
- Existing D1 and R2 bindings are retained; deployment does not import local placeholder data. Production continues to show Celestial Delights and the existing published projects. No database migrations or writes were performed for this release.
- Production screenshot: `docs/hero-cover-verification/deployed-homepage.png`. Complete scene source, lockfile, models, rebuild command and verification history are included for GitHub synchronization on `codex/cloudflare-workers`. Local `.claude` launcher configuration is excluded.
