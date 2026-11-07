# Migrating the UI/UX from the YC demo to the original Weë app: audit and plan

Date: 2026-11-02. Read-only audit: nothing has been changed in the app or in the demo.

## 1. Locations (verified)

| | Location | Branch / commit | State |
|---|---|---|---|
| **Original app (source of truth)** | GitHub `geovetlf/wee-app` | `origin/main` = `5efbc0a7` (2026-10-06, PR #25) | What production runs. Firestore and Storage rules are deployed from this commit. |
| Local checkout `Desktop\wee` | `C:\Users\<user>\Desktop\wee` | `main` = `dad0ca2f` | **210 commits behind** GitHub and has uncommitted changes (`functions/lib`, settings). **Not used as the base.** |
| Creator web (prior step) | `wt-pro` / branch `web/version-profesional` | `6e11023d` = `origin/main` + 4 commits | Pushed, **not merged**: 237 files, +13,302 lines (Weë Creator web, version pill, guest mode). |
| **YC demo (visual reference)** | `C:\Users\<user>\wee-trabajo\wt-demo-yc` | `demo/yc` on `6e11023d` | **Nothing committed**: 270 changed entries. Excluding video, media and translations, that is 45 modified files (+1,391 / −337) and 30 new ones. |

The demo is built on top of the Creator web. Migrating it means first deciding whether that unmerged step goes along with it (see §10, decision A).

## 2. What the demo actually changed (full comparison)

The demo's changes fall into four kinds. Telling them apart is the core of this audit.

### A. Real, reusable UI built with real components (migrate as is)
- **Shared composer** `components/creator/CajaDePrompt.tsx` (+154): "vitrina" style, animated focus, `monocromo` prop. `StudioPromptComposer` passes `vitrina` through.
- **Create sheet** `components/CreateSheet.tsx`: Ionicons in gold circles and the Weë AI mark. No emojis.
- **Post composer** `screens/CreateScreen.tsx` (+68): destinations with `IconoWee`; shortcuts to Studio/Design/Photo/Writer/Music; destination General Wäll plus communities.
- **Menu and identities** `DrawerMenu` (electric purple in the Weë Profile), `Header`, `Sidebar` (WeëPages entry), `constants/weeMenu.ts`, `contexts/ThemeContext.tsx`.
- **Feed** `PostCard` (instant images with no fade, memory-disk cache) and `HowIMadeIt`.
- **Weëls** `ReelsScreen`: the next video is preloaded, paused.
- **Sections** `CabeceraDeSeccion`, `FilaDeCreaciones`, `TravelLauncher`, `TravelMark`, `ChefProyectos`, `StudioPanel`.
- **WeëPages, complete:** `screens/WeePagesScreen.tsx` (composer type → details → preview, list, discovery), `screens/WeePageScreen.tsx` (public page, follow, share, scenes with a full-screen player), `components/pages/CabeceraDePagina.tsx`, `constants/pageTypes.ts`, `services/pagesService.ts`, the `pages` module in 16 languages, and `docs/WEEPAGES.md`.
- **Buy by amount** `components/tienda/CompraPorImporte.tsx`: $5–$100 in steps of 5, 1 USD = 100 Credits. Today, in the demo, it only shows a notice.

### B. New backend the demo added (real, but new product: it needs authorization)
- `functions/src/social/pages.ts`: callables `savePage` and `followPage`, run in transactions with ownership checks, handle reservation and photo validation.
- `firestore.rules`: `pages`, `pageHandles` and `pageFollows`, with client writes denied.
- `ops/despliegue/grupos.json`: both callables are marked "not deployed".
- **Never deployed.** In the original app they would be a new deployment, behind the governed gate.

### C. Demo-only (CANNOT be copied)
- **The six Weë AI sections are crops of your reference images.** `components/demo/RecorteDeReferencia.tsx` paints sections of `l-ref-studio|design|chef|music|travel|fashion.webp` (your mockups, 1080×2640) with touchable zones drawn on top.
  - This is used in `StudioScreen`, `DesignScreen`, `ChefScreen`, `MusicScreen`, `SpecialistScreen` (Travel) and `FashionScreen`, gated by `EXPO_PUBLIC_DEMO_MEDIOS`.
  - In the demo they look exactly like the reference because they ARE the reference. **In the original app they have to be built as real components** (text through i18n, real buttons, light and dark themes, RTL, every width). This is the largest block of work.
- `EtiquetaDemo`, `EntradaDemo`, `utils/contenidoDemo.ts`, `utils/precargaDeLaDemo.ts`, `CreacionesDeLaDemo`, `ProyectosDeLaDemo`.
- `ModuloFilmmaker` (a video served from the demo's media server), `EstudioDeEjemplo` (a drawing of a music studio that makes no sound), `scripts/demo/*`, `scripts/sembrar-demo.mjs`, `demo-medios/`, `docs/WEE-DEMO.md`.
- The demo's fictional data: users, posts, Jay Reeds, pages, Credits and the `demo-wee-yc` project.

### D. Weë Fashion: a separate case
- `screens/FashionScreen.tsx` and `components/fashion/*` **do not exist in `origin/main`**. There is separate Fashion work in `fashion/renombre-visible` (wt-fashion) and `fashion/composer-v0` (wt-fase1), neither merged.
- Before migrating Fashion, we have to decide which base wins (see §10, decision D).

## 3. Screen-by-screen matrix

| Screen | Original (`origin/main`) | Demo | Visual difference | Type | Backend to preserve | Risk | Tests |
|---|---|---|---|---|---|---|---|
| Home / Wall | `WebLandingScreen`, `LandingScreen`, `PostCard` | Same base; instant images, purple Weë Profile | Small | A | `postsService`, `firestoreService` | Low | i18n, iconos, composer |
| Hamburger menu / Sidebar | `DrawerMenu`, `Sidebar` | + WeëPages, purple in the Weë Profile | Small | A | — | Low (counts fixed in tests) | `i18n-navegacion-sidebar`, `econtact` |
| Create sheet (+) | `CreateSheet` with emojis | Ionicons in gold circles, Weë AI mark | Medium | A | — | Low | iconos |
| Post composer | `CreateScreen` | Experience icons, Weë AI shortcuts, Wäll + communities | Medium | A | `postsService`, Credits not involved | Low (one ScrollView, `EspacioDeEscritura`) | composer, teclado |
| Weëls | `ReelsScreen` | Preloads the next video | Behavior | A | `getVideoPostsPaginated` | Low | — |
| Weë Brain | `BrainChatScreen` | Same screen (lighter brain image, deleted `CerebroElectrico.web`) | Small | A | `brainChat`, Core Runtime canary | Low | brain |
| Weë Studio | `StudioScreen` + `components/studio` | **Reference crop** + Filmmaker card + dark panels | **Large** | C → rebuild | `creatorRun`, engine, Seedance, `ProductionScreen` | **High** (CLAUDE.md §5 "no redesign" vs. the new reference) | cajas-weeai, productions-runtime |
| Weë Design | `DesignScreen` | **Crop** | Large | C → rebuild | engine | High | cajas-weeai |
| Weë Chef | `ChefScreen` | **Crop** + vitrina composer | Large | C → rebuild | engine | High | chef |
| Weë Music | `MusicScreen` | **Crop** (light) + example studio | Large | C → rebuild (without connecting any music engine) | none (Music not connected) | Medium | music H2 |
| Weë Travel | `SpecialistScreen` | **Crop** | Large | C → rebuild | engine, Search grounding | High | cajas-weeai |
| Weë Fashion | does not exist in main | **Crop** + new screens | Total | C + D | — | High | — |
| WeëPages (list, composer, page) | **does not exist** | Complete | New | A + B | new: `savePage`/`followPage` | Medium (new backend) | `weepages.test` (already written) |
| Boost | **does not exist** | **Only a button** that explains it will cost Credits | — | **No reference** | Credit Engine (`spendCredits`) | High (new feature) | to be written |
| Wallet / Credits | `CreditStoreScreen`, `WalletScreen` | Buy by amount ($5–$100) | Medium | A, but needs payments | `functions/src/payments` (packages today) | **High**: buying by amount needs server support | credits |
| Profile Real / Weë Profile | `UserProfileScreen`, `usersService` | Jay Reeds (data), purple, contacts | Small | A (visual), data = C | `ensureWeeProfile`, `cuentaDeIdentidad` | Low | identidad-sin-biz |
| My projects / creations | `ProjectsScreen`, `MisCreacionesScreen` | Demo rows | None (data) | C | `projectsService`, `assetsService` | — | — |
| Saved, communities | `SavedPostsScreen`, `CommunitiesManagementScreen` | Small adjustments | Small | A | — | Low | — |

## 4. Reusable components (to migrate first)
`CajaDePrompt` (vitrina/monocromo) · `StudioPromptComposer` · `CreateSheet` · the destination blocks in `CreateScreen` · `CabeceraDeSeccion` · `FilaDeCreaciones` · `StudioPanel` · `TravelLauncher`/`TravelMark` · `ChefProyectos` · `PostCard` (instant images) · `CabeceraDePagina` · `CompraPorImporte` (visual) · the purple Weë Profile theme · the WeëPages screens and service.

**Design system.** `constants/design.ts` (SPACING, FONT_SIZE, BORDER_RADIUS…) already exists and the demo uses it; there is no second token system to merge. The new pieces (the vitrina composer, sector heroes, mode cards, gold-circle icons) will live as tokens and shared components in that same system.

## 5. Demo-only items, and what replaces each one
| Demo | In the original app |
|---|---|
| `RecorteDeReferencia` (crops of the mockup) | Real components for each sector, drawn from the reference: hero, experience chips, mode cards, galleries. |
| `ModuloFilmmaker` (demo-server video) | A real Filmmaker Engine card leading to `ProductionScreen`, with an asset from the repo or the user's latest production. |
| `EstudioDeEjemplo` (Music drawing) | The real Music studio UI, with no engine connected (CLAUDE.md §5). |
| Notice on the "Buy" button | The real purchase through `functions/src/payments` (decision C). |
| Demo data, labels and preload | Nothing. Real data comes from the existing services. |

## 6. Backend that is not touched
Auth · `users`/identities (`identidadWeeDe`, `cuentaDeIdentidad`, `ensureWeeProfile`) · Credit Engine (`functions/src/credits`) · payments (`functions/src/payments`) · WEË AI ENGINE (`functions/src/engine`, router, adapters, ledger) · `functions/src/creator` (planner, brain, video) · Core Runtime and its canaries · moderation (`reportContent`) · `postsService`/`firestoreService`/`messagesService`/`communityService` · `projectsService`/`assetsService` · i18n (`i18n/`, `IdiomaContext`, `formato.ts`) · Firebase configuration (`.env`, `google-services.json`, `GoogleService-Info.plist`).
**New, with authorization only:** `savePage`/`followPage` plus rules; Boost operations; buying by amount.

## 7. Risks and dependencies
1. **Sectors without real components.** The fidelity the demo shows came from images, so replicating it with real code takes work and needs a visual review at 320/360/390/1024/1440 px in LTR and RTL (visual-gate rule).
2. **CLAUDE.md §5** says the Weë AI interfaces "are not redesigned". This migration redesigns them on the owner's order, so it should be recorded in CLAUDE.md as a new decision once approved.
3. **Boost and the vertical Wall have no demo reference.** In the demo, Boost is a button with a notice, and the Wall is the usual feed. The spec asks for both "as in the demo", but there is nothing to copy. They need a design decision, plus backend in Boost's case.
4. **Buying by amount** needs the payments backend to accept a custom amount (today it sells packages).
5. **The base is unmerged.** The demo sits on `web/version-profesional`, which is not in main.
6. **Fashion** has three divergent lines.
7. **i18n:** every new string in 16 locales, with each language's test rules (ellipsis, no Title Case in da/sv, Japanese spacing, Hindi period, Russian formal register).
8. **Tests that pin structure** (menu counts, ScrollView, `EspacioDeEscritura`, `vivo` flag, music H2, runtime map, deploy groups). The demo already passed them all (chain 100% green, tsc 0), so its fixes come along with it.
9. **Low RAM on the PC.** With Metro, the emulators and Chrome running, there is <200 MB free, and ffmpeg/tsc can hang.

## 8. Plan by phases (with dependencies)
- **Batch 0. Base.** A new worktree `wt-ui-migracion`, branch `ui/migracion-demo`, from the base we decide (A). The chain and tsc as a green baseline.
- **Batch 1. Shared pieces (A).** Composer (vitrina), Create sheet, post composer, menu/Sidebar, purple Weë Profile theme, PostCard/HowIMadeIt, Weëls preload, section headers and rows. Port, clean out any demo gating, i18n, tests.
- **Batch 2. WeëPages.** Screens, service and translations, plus `savePage`/`followPage` and rules (the code goes in; **nothing is deployed**). Tested against the emulators with test data.
- **Batch 3. Sectors, one at a time, rebuilt from the reference:** Studio (with a real Filmmaker Engine card) → Chef → Design → Travel → Music (visual only) → Fashion (after decision D). Each one gets a visual comparison against its reference and the demo at the same width.
- **Batch 4. Credits/Wallet.** The visual buy-by-amount connected to real payments, if decision C allows; otherwise the visual with the current packages.
- **Batch 5. Boost and the Wall** (once their design and backend are approved).
- **Batch 6. Full validation.** Chain, tsc, the visual gate at 5 widths, LTR and RTL, light and dark, Android (development build, Z Flip3 phone), and side-by-side screenshots against the demo.

## 9. Estimated effort (agent work, with review between batches)
| Batch | Size |
|---|---|
| 0–1 Shared pieces | ~1 session |
| 2 WeëPages | ~1 session (already built and tested in the demo) |
| 3 Six sectors rebuilt | **~3–5 sessions** (the largest) |
| 4 Credits | ~0.5 session (+ payments if approved) |
| 5 Boost + Wall | ~2–3 sessions (new design and backend) |
| 6 Validation | ~1 session |

## 11. Comparing `web/version-profesional` with `origin/main`

**Commits** (4, all after `origin/main`, with no reverse divergence: `origin/main` is an ancestor):
- `9c9d449b`: guest mode (public Search, Create without an account), wee.zone routes (`/weels`, `/weeai`, `/help`…), **Weëls with no black video** (a failed load warns and offers a retry), and Business renamed to Fashion (name only). The Vercel build fails if the Firebase configuration is missing.
- `a77ea340`: Weë Creator web (`/creator`) and the pill for switching versions. Web only: mobile gets no route and no pill.
- `f525729c`: Creator home and its sections (`useEnEspacioProfesional`; outside Creator, rendering does not change). **Weë Music composer** (interface only, Generate off, `MUSIC_GENERACION_VALIDADA = false`). The animated brain on the web.
- `6e11023d`: Creator with no social navigation. It shares session, identity, Credits, projects and assets, with no services of its own. Design goes through `CreatorFlow` inside Creator.

**Backend, auth, Credits, profiles, data.**
- **There are no changes to rules, Functions, secrets, auth, Credits, payments or the identity model.**
- The only thing under `functions/src` is `music/` (contract, provider matrix, preparatory adapters). It is not exported from `index.ts`, not registered in the engine, and calls nothing.
- `app.json`: only the iOS microphone permission text (it needs a new build).
- Client: a new Creator navigator and context, and changes in `App.tsx`/`MainStackNavigator`/`TabNavigator`/`NavegacionGlobal`/`enlaces.ts`.

**Tests.** 6 new suites (`version-profesional`, `music`, `weels-feed`, `invitado-navegacion`, `config-web-publicacion`, `_pantallas`) plus 21 updated. The demo, which sits on top of this, passed the full chain at 100% with tsc at 0.

**Gaps it declares itself** (`docs/WEE-CREATOR.md`):
- Not tested with a real account, on a phone or in RTL; translations without native review.
- The active profile is not kept across a reload.
- Wallet/Store come out of the Creator frame, and "Top up" shows while top-ups are closed.
- In App, Design simulates generation and a question without options gets stuck.
- No engine has verified real generation.
- Music is not connected.

**What the demo depends on from this branch.** The Music composer (the demo's `MusicScreen` builds on it), the guest mode and Weëls fixes, the changes to `CajaDePrompt`/`StudioPromptComposer`/`PostCard`/`ReelsScreen`, and the Fashion name. Starting from `origin/main` would mean bringing those pieces over by hand, or losing them.

**Recommendation: base = `web/version-profesional` (`6e11023d`).**
1. It is `origin/main` plus 4 commits, with no divergence: nothing from the original app is lost.
2. It does not touch backend, auth, Credits, payments or data.
3. The demo is a delta on top of it: migrating from there carries no hidden dependencies.
4. Creator only switches on at `/creator` on the web.

**Risk.** It brings in unmerged work with its declared defects. That is mitigated by merging in order: first a PR for `web/version-profesional`, then the migration branch on top of it.

**Can its useful contributions be kept without the rest?** Yes, but it is not worth it. Creator lives in its own files (`EspacioProfesional*`, `MarcoProfesional`, `ProInicioScreen`) and only activates at `/creator`. Removing it would mean reverting part of `f525729c` and `6e11023d`, which also carry the Music composer and section changes the demo uses.

## 12. Economic conflict found (needs the owner)
- The demo's purchase screen says **1 USD = 100 Credits**, with a slider from $5 to $100. The YC video narrated it that way.
- The original app's real catalog (`functions/src/credits/creditCosts.ts`) has **three packages**:
  - Basic: 40 Credits / $4.99.
  - Plus: 90 Credits / $9.99.
  - Black Pro: 200 Credits / $19.90.
- That works out to roughly 8–10 Credits per dollar.
- Rule 4 says "same screen as the demo, original packages, no price changes". That means the screen keeps the demo's look and interaction, but the selector stops at the three real packages and shows their real prices and Credits. The "1 USD = 100 Credits" line cannot appear because it would be false.

## 10. Decisions (resolved by the owner, 2026-11-02)
- **A.** The technically best base: see §11, `web/version-profesional`.
- **B.** Boost and the vertical Wall go into this migration. **Neither has a reference in the demo** (Boost is a button with a notice; the Wall is the usual feed). They will be designed in the demo's visual language, and the missing integrations will be documented.
- **C.** The purchase screen exactly like the demo's, connected to the original packages and payments, with no changes to prices or backend (see §12).
- **D.** Fashion: the demo's line, rebuilt with real components.

### Original questions (for the record)
- **A. Base branch.** (Recommended) Start from `web/version-profesional` (`6e11023d`), which the demo is built on and which is already pushed. The alternative is to start from `origin/main` and leave Creator web out, which means separating its changes by hand.
- **B. Boost and the vertical Wall.** Neither exists in the demo. Should they be designed now from scratch within the same visual system, or left for later?
- **C. Buying by amount.** Should the server-side payments be adapted, or should the current packages stay with the new look?
- **D. Fashion.** Which line should be the base: the demo's, `fashion/renombre-visible` or `fashion/composer-v0`?
