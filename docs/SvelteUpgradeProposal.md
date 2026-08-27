# Proposal: upgrading Svelte to the latest version

Date: 2026-08-27

Touches (potentially): all 94 `frontend/src/**/*.svelte` files, `frontend/package.json`, `frontend/webpack.config*.js`, `frontend/src/main.js`, `frontend/src/index.ejs`, `frontend/src/routes/*` (the router-registry layer), and every one of the 25 files that import `sveltestrap`.

## What this is, in one paragraph

The app is pinned to Svelte 3.59.2, built with webpack + a git-pinned `svelte-loader` fork (not Vite/SvelteKit), and leans on two third-party Svelte packages that did not age well: `sveltestrap` (Bootstrap components for Svelte, the unscoped npm package is archived and dead) and `svelte-spa-router` at a very old 2.2.0. Getting to current Svelte (5.56.x as of this writing, no Svelte 6 yet) is not just a `package.json` bump — both of those dependencies need real migration work of their own before or alongside the framework version, and the router migration in particular touches 53 of the app's 94 Svelte files. This proposal inventories exactly what's coupled to what, and lays out a phased path that gets the framework upgraded with minimal app-code churn first, deferring the large, low-urgency work (rewriting components to use runes) to an incremental, file-at-a-time follow-on — the same "one extraction per PR" discipline `DerbyMainRefactorProposal.md` already established for `derbyMain.js`.

## Current state, as it actually is (not as declared)

- **Svelte: `^3.59.2`** (`frontend/package.json`). Genuine Svelte 3, not 4.
- **`svelte-spa-router: ^2.2.0`**, imported in **53 of 94** `.svelte`/`.js` files under `src/` (56%) — `push` (41 call sites), `replace` (35), `pop` (27), the `location` store (8 files, incl. one aliased `spaLocation`), and `querystring` (5 files). This is the load-bearing routing layer underneath `frontend/src/routes/routeDefinitions.js` → `routeRegistry.js` → `routeComponents.js` → `routeAccess.js`.
- **`sveltestrap: ^3.14.1`**, imported in **25 of 94** files, using `Badge`, `Button`, `Card`/`CardBody`/`CardHeader`/`CardTitle`, `Form`/`FormGroup`/`FormText`, `Input`, `Label`, `Modal`/`ModalBody`/`ModalHeader`.
- **`bootstrap: ^4.6.0`** is declared as an npm dependency but appears to be dead weight: no `.scss` files exist, nothing in `webpack.config*.js` or any `src/**` file references it, and there's no `import`/`require` of it anywhere. The Bootstrap that actually renders comes from a CDN `<link>` **pinned to 4.5.2** in `frontend/src/index.ejs` (the real `HtmlWebpackPlugin` template — the `public/index_derbyTest_*.html` files are stale leftovers, not part of the live build). CSS only; no Bootstrap JS bundle, no jQuery, no Popper — confirmed by zero `data-toggle`/`data-bs-`/`data-dismiss` attributes anywhere in `src/`. Whatever interactivity Bootstrap-flavored widgets need (the `Modal` family in particular) is implemented natively by `sveltestrap`, not by Bootstrap's own JS.
- Unrelated but adjacent: `ChartDetail.svelte` and `ChartAdd.svelte` each load **jQuery from a CDN** `<script>` tag directly (a click-coordinate handler and a `jsTree` widget, respectively). This has nothing to do with Bootstrap and doesn't need to change for this upgrade, but it's worth knowing about before anyone assumes "no Bootstrap JS" means "no jQuery anywhere."
- **`createEventDispatcher`** is used in **10 files** — every one of these needs to become a callback prop under Svelte 5 idioms eventually.
- **`svelte:component`**: zero usages. **Named slots** (`slot="..."`): zero usages. A bare `<slot>` (default slot) appears in exactly **1** file. This is good news — the slots/snippets rewrite, one of the larger conceptual changes in Svelte 5, barely touches this codebase.
- **`lang="ts"`** appears in only **3** `.svelte` files — a small surface for the TypeScript-specific Svelte 5 gotchas (generics on components, `$props()` typing).
- **`frontend/src/main.js`** mounts the app with the old `new App({ target, props })` constructor API, which Svelte 5 replaces with `mount(App, { target, props })`.
- **No frontend automated tests exist at all** — no `test` script in `frontend/package.json`, no Jest/Vitest config, no `*.test.js`/`*.spec.js` files anywhere under `frontend/`. (The backend has a real Jest suite under `backend/test/`; the frontend has nothing.) Every phase of this migration will be verified by hand unless that changes first.
- The app is a **pure client-side SPA** (hash-based routing via `svelte-spa-router`, no SSR, no SvelteKit). That's a meaningful advantage for this specific migration: several of the most-cited Svelte 5 migration traps — `$effect` not running during SSR, hydration mismatches between server- and client-rendered output — simply don't apply here, because there is no server render to mismatch against.

## What "latest Svelte" actually means right now

Svelte 5 is the current major version (released October 2024; latest published release as of this writing is 5.56.10, and there is no Svelte 6 yet). The breaking changes that matter most for this app:

- **Runes replace implicit reactivity**: `export let x` → `let { x } = $props()`; `$: y = f(x)` → `let y = $derived(f(x))` or `$effect(() => {...})`; plain `let count = 0` that Svelte 3 auto-tracked becomes `let count = $state(0)` when you want the same tracking.
- **Events are plain properties**: `on:click={fn}` becomes `onclick={fn}`; `createEventDispatcher()` is gone in idiomatic Svelte 5 in favor of components accepting callback props directly.
- **Slots become snippets**: `<slot>` / `slot="name"` become `{@render children?.()}` and named snippet props. (Low-impact here, per the inventory above.)
- **Component instantiation**: `new Component({ target })` → `mount(Component, { target })`; the result no longer exposes `$set`/`$on`/`$destroy`.
- **`bind:` requires opt-in**: a child component prop is one-way by default now; two-way binding needs an explicit `$bindable()` on the child's side. This is the single most common source of silent behavior change during migration, per real-world migration reports, because plenty of existing `bind:` usage across a codebase turns out to have been binding to something that was really only ever read one-way.
- **CSS scoping changes**: the scoping hash mechanism changes, and `:is()`/`:has()`/`:where()` selectors — previously an unintentional "escape the component" trick in Svelte 4 — are now scoped by default. Any CSS relying on that old behavior needs an explicit `:global(...)`.

Crucially, Svelte 5 ships an official **legacy-compatibility mode**: existing Svelte 3/4-style components (`export let`, `$:`, `on:`, `createEventDispatcher`, slots, `svelte/store`) keep working unchanged, side by side with rune-based components, in the same app. That's the lever this proposal is built around — it decouples "get the framework and toolchain onto Svelte 5" from "rewrite 94 components to use runes," which are really two separate projects with very different urgency.

## The two dependencies that actually gate this, and why they're not optional

**`sveltestrap` is dead and must be replaced regardless of Svelte version.** The unscoped `sveltestrap` package on npm was archived in April 2025 and never had solid Svelte 4 support, let alone 5. Its maintained successor lives under a different npm scope, **`@sveltestrap/sveltestrap`** (currently v7.1.0), which targets **Bootstrap 5** and declares Svelte `^4.0.0 || ^5.0.0` as its peer range — notably, it does **not** support Svelte 3, so this alone forces at least a Svelte 3→4 step before or alongside adopting it. It's maintained but slow-moving (no release in roughly 18 months as of this writing) — stable, not actively developed. Its v7 release notes call out a breaking rename (`children` prop → `content`) as part of its own Svelte 5 work, which is exactly the kind of thing to grep for across the 25 files that use it.

**`svelte-spa-router` needs a major-version jump that is itself a breaking rewrite, independent of Svelte.** The router's own v5.x line is the one that declares Svelte 5 support (peer dep `^5.0.0` — meaning you literally cannot install this version without Svelte already at 5), but getting there means moving off the old store-based API (`location`, `querystring` as subscribable stores; `push`/`replace`/`pop` as free functions) toward whatever router-object/callback-prop model v5 replaced them with. That's not a drop-in bump — it's a rewrite of every one of the 53 files that touch this package, concentrated most heavily in the app's own `frontend/src/routes/*` registry layer. Two community forks (`@keenmate/svelte-spa-router`, built on runes from scratch; `mateothegreat/svelte5-router`) exist from the period when the original project looked abandoned, but since the original has since shipped its own Svelte-5-compatible v5, the official package should be the default choice unless a fork's extra features (nested routers, route guards) turn out to solve something this app's hand-rolled `routeAccess.js` permission layer currently does the hard way.

**The Bootstrap CDN pin has to move in lockstep with `@sveltestrap/sveltestrap`**, from 4.5.2 to a Bootstrap 5.3.x link in `frontend/src/index.ejs`, since the new component library renders Bootstrap-5-shaped markup/classes. Given zero `data-toggle`/`data-bs-` usage was found, there's no Bootstrap-JS-widget migration needed — this is a CSS-class-and-markup-shape risk (Bootstrap 5 renamed and dropped some utility classes), verifiable with a visual smoke pass over the 25 affected files, not a JS-behavior risk.

**The webpack toolchain itself is fine, with one real trade-off.** `svelte-preprocess` 6.x and `svelte-loader` both declare Svelte 5 support, so there's no forced migration off webpack to Vite. The one confirmed cost: **`svelte-loader` does not support Hot Module Reloading under Svelte 5** — local dev will need a full page reload after every change instead of HMR, for as long as this app stays on webpack. That's an acceptable, scoped trade-off; migrating to Vite/SvelteKit to get HMR back is a real, separate project (re-implementing the `.ejs` templating, the `workbox-webpack-plugin` PWA/service-worker setup, `mini-css-extract-plugin`, etc.) that this proposal deliberately does not bundle in, for the same "resist the urge to also fix things beyond scope" reason `DerbyMainRefactorProposal.md` already called out.

## Proposed phasing

**Phase 0 — Safety net, before touching any version number.** No frontend automated tests exist today, which means every phase below is verified by hand unless this changes. At minimum, add a handful of smoke tests (Playwright or `@testing-library/svelte` against a running dev build) covering the highest-stakes flows: login, event selection, race timing/announcing, and the walkup-track playback path this session's own recent work touched — enough to catch a real regression automatically instead of discovering it live at an event. Do all of this work on a long-lived branch, and use the existing `stage.rr1.us`/`go.rr1.us` branches as a real soak environment before anything reaches `test.rr1.us` — this app runs live in-person events, so "looks fine in a local dev build" isn't sufficient confidence on its own.

**Phase 1 — Diagnostic spike (throwaway, isolated branch).** Bump only what's required to get *something* building under Svelte 5 — `svelte` itself, `svelte-loader`, `svelte-preprocess`, `prettier-plugin-svelte` — and update `main.js` to `mount()`. Deliberately leave `sveltestrap@3.14.1` and `svelte-spa-router@2.2.0` untouched. This combination is not expected to be a valid long-term state (the router's own peer dependency says as much), but it's the cheapest possible way to find out what specifically breaks when the existing, unmodified Svelte-3-style component source runs under the Svelte 5 compiler and runtime, and to validate — before committing real effort — whether the legacy-compatibility promise actually holds for *this* app's code, separate from the two known-incompatible dependencies. Throw this branch away once it's answered that question.

**Phase 2 — Replace the two dead-weight dependencies, targeting Svelte 5 as the landing point.** These are independent of each other and can run as parallel workstreams:
- *Bootstrap/sveltestrap*: swap to `@sveltestrap/sveltestrap`, bump the CDN link in `index.ejs` to Bootstrap 5.3.x, drop the vestigial `bootstrap` npm dependency, grep the 25 affected files for the `children`→`content` rename and any other v7 breaking changes, and do a visual pass over the affected screens. Smaller and more contained than the router work — good to land first to build confidence in the pattern.
- *svelte-spa-router*: bump to the official v5.x line and rework the 53 call sites. Worth introducing a thin wrapper module inside the app's existing `frontend/src/routes/` layer (which already centralizes router-registry logic) so the new router's API is adapted in one place rather than touched at all 53 call sites individually — both for this migration and so a future router swap doesn't repeat the exercise. Spend a day up front comparing the official v5 API against the two community forks specifically against what `routeAccess.js`'s permission gating needs, rather than defaulting to the official package without checking.

**Phase 3 — Land Svelte 5 for real.** With both dependencies now Svelte-5-native, bump `svelte` itself, confirm the toolchain versions, and ship. At this point the entire app runs on Svelte 5 with every first-party component still in its original Svelte-3-style syntax via legacy-compat mode — functionally unchanged, zero user-visible difference intended. This is the actual milestone: soak on `stage.rr1.us`, then promote.

**Phase 4 — Incremental rune migration (ongoing, no deadline).** Only after Phase 3 ships. Migrate components to runes opportunistically — when a file is already being touched for unrelated work, convert it in the same PR, exactly like the one-extraction-per-PR discipline already in use for `derbyMain.js`. Prioritize the 10 `createEventDispatcher` files and the 3 TypeScript files first, since those have the clearest Svelte 5 idioms to move to (callback props; the `Component` type). Use `npx sv migrate svelte-5`'s single-file mode as a first draft only, not an authoritative rewrite — real-world reports of this tool are consistent that it sometimes can't tell `$derived` from `$effect`, over-applies `$bindable()` to props that were only ever meant to be one-way, and that at least one team hit a real performance regression trusting the bulk migration blindly. Every generated diff needs a human read before merging.

## Running two frontends concurrently, for Phases 0–3

"Parallel migration" here actually covers two different problems, worth separating because they have different solutions:

- **Infra-level parallel** — you and testers can reach either version, but a given user session isn't switching mid-stream. This is what Phase 1's throwaway spike and Phase 3's soak need.
- **Session-level parallel** — two operators' tablets, at the *same* live event, each pinned to a different frontend version at the same time. Only needed if rollout requires specific trusted people dogfooding the new frontend across real events before a full cutover.

Both are tractable here for a reason the rest of this proposal doesn't lean on: this app is a pure client-side SPA with **hash-based routing** (`svelte-spa-router`), so there is no history-mode fallback/rewrite rule to configure anywhere — a second build hosted at a sub-path is just another set of static files, not a routing problem. The backend API also isn't changing as part of this migration, so both versions can safely share one backend the entire time.

**Option 1 — new sibling deploy target.** Add a fourth Terraform-managed environment (alongside `derbyTest`/`derbyStage`/`go-derby-prod` in `frontend/webpack.config.js`), e.g. `derbySvelte5`, with its own S3 bucket/CloudFront distribution and SSM params under `/deploy/derbySvelte5/frontend/*`. `loadDeployTargets.sh` and `s3Push.sh` need zero changes — they already key off `TF_VAR_DeployEnvironment`. Gives a real subdomain hitting the same backend. Cheapest option; right fit for Phase 1's spike and Phase 3's soak.

**Option 2 — same-origin path split (`/` vs `/next/`).** Serve both bundles from one CloudFront distribution/bucket, old at `/`, new at `/next/*`. Same-origin means `localStorage`/session state is shared automatically. Gets you session-level parallel: two tablets at one event, one on each path. Needs the service worker's scope narrowed or disabled per build during the parallel window (today it registers at scope `/`, gated on `location.hostname === 'sw.derby.rr1.us'`, in `frontend/src/index.ejs`).

**Option 3 — single-URL toggle with persistent opt-in.** Builds on Option 2's dual-build output, but adds a same-origin redirect so users only ever type one URL. Elaborated below.

**Option 4 — per-route split via the router registry.** Have `routeDefinitions.js` → `routeRegistry.js` → `routeComponents.js` choose old-vs-new implementation per route. This is module-federation territory (two webpack builds sharing one runtime) — more machinery than needed, since Svelte 5's legacy-compat mode already lets old (`export let`, `on:`) and new (runes) components coexist in **one** build, which is exactly what Phase 4 already relies on. Skip this one.

**Recommendation:** Option 1 for Phases 0–3 — it costs nothing beyond one more SSM-parameterized environment matching infra that already exists. Reach for Option 2 or 3 only if rollout specifically needs live-event operators split across versions simultaneously; otherwise it's added complexity for a capability Phase 4's legacy-compat mode makes unnecessary once Svelte 5 has actually landed.

### Option 3, elaborated: how the toggle actually works

Two Svelte runtimes can't safely coexist inside one already-mounted page (CSS-scoping collisions, service-worker scope fights), so this still needs two self-contained builds like Option 2 — the difference is a thin redirect layer on top so it feels like one URL.

**Build side.** Give the new-Svelte build its own output path and HTML file (`output.path` → `public/next`, a second `HtmlWebpackPlugin({ filename: "./next/index.html" })`), and a distinct entry/chunk name (`bundle-next` vs `bundle`) so the two builds stay obviously separate even though contenthash already prevents literal filename collisions. Because `s3Push.sh` already syncs `./public/` recursively, anything under `public/next/` ships for free.

**Toggle side.** Ahead of `startApp()` in `frontend/src/main.js` (and the mirror-image check in the `next` build's own entry point, or a small shared module both import):

```js
function syncFrontendVersion() {
    const params = new URLSearchParams(location.search);
    if (params.has("frontend")) {
        localStorage.setItem("frontendVersion", params.get("frontend"));
    }
    const wantsNext = localStorage.getItem("frontendVersion") === "next";
    const onNext = location.pathname.startsWith("/next/");

    if (wantsNext && !onNext) {
        location.replace("/next/" + location.hash);
        return true; // redirecting — caller should not mount the app
    }
    if (!wantsNext && onNext) {
        location.replace("/" + location.hash);
        return true;
    }
    return false;
}

if (!syncFrontendVersion()) {
    startApp().catch((error) => console.error("Unable to load deployment configuration", error));
}
```

The `!onNext`/`!wantsNext` guards matter — without them this ping-pongs forever. `location.hash` survives the redirect, so a bookmarked or QR-coded deep link into a specific screen keeps working; it just costs one extra client-side hop the first time the flag changes. `https://test.rr1.us/?frontend=next` sets the flag and bounces once to `/next/`; every later visit loads `/next/` directly. `?frontend=legacy` flips it back, no redeploy needed, reversible per device.

Tradeoffs: auth carries over for free within one tab (same-origin `localStorage`/`sessionStorage` survive `location.replace()`), but a link opened in a fresh tab only carries over if the token lives in `localStorage` — worth confirming before relying on this. It's opt-in, not a traffic split — no server is involved, so there's no way to randomly assign a percentage of sessions. For a live-events tool where the goal is specific trusted people dogfooding the new frontend rather than random users landing on it, that's the right shape, not a limitation.

### Where the `next` bundle's source lives

Not a new directory alongside `frontend/src` — a second `package.json`/`node_modules` living next to the first doesn't work cleanly, since Svelte 3 and Svelte 5 (plus their incompatible `sveltestrap`/`svelte-spa-router` majors) can't share one dependency install. The right place is **the same path, `frontend/src`, on a different branch** — a `svelte5`/`next` branch, matching the existing branch-per-environment pattern (`test.rr1.us`, `stage.rr1.us`, `go.rr1.us`) that `.github/workflows/deploy.yml` already resolves to a GitHub Environment and `TF_VAR_DeployEnvironment`. This is also exactly what Phase 1's "isolated branch" already assumes.

Producing two outputs from two branches into one `public/` tree needs two separate checkouts and installs, not one checkout with two `src` folders, since `npm ci` resolves one dependency tree per directory:

- **Locally**: `git worktree add ../svelteDerby-next svelte5` gives a second working copy — its own `frontend/src`, own `node_modules`, own build — without touching the primary checkout. Build there, copy its `public/` output into the main checkout's `public/next/`, then run `s3Push.sh` once from the main tree.
- **In CI**: `deploy.yml` currently does a single `actions/checkout` of a single ref. Supporting this means adding a second checkout of the `svelte5` branch into a second path, a second `npm ci && npm run build` outputting to `public/next/`, merged in before the existing `s3Push.sh` step — a real, if small, workflow change, not something that falls out for free.

This is scaffolding for Phases 0–3, not a permanent architecture. Once Phase 3 lands — `svelte5` merges into the mainline branches, one `package.json` again — there's only one `frontend/src`, and the dual-checkout/dual-build setup gets deleted. Phase 4's rune conversions then happen file-by-file inside that single tree, since legacy-compat mode is what makes a second branch unnecessary from that point on.

## Open questions worth deciding explicitly, not by default

- Is `@sveltestrap/sveltestrap`'s slow release cadence an acceptable long-term bet, or is this the moment to drop the component-wrapper library entirely and hand-write plain Bootstrap 5 markup for the modest set of components actually in use (`Badge`, `Button`, the `Card`/`Form`/`Modal` families, `Input`, `Label`)? Only 25 files are affected — dropping the wrapper is a bigger one-time cost but removes a third-party-Svelte-compatibility dependency from the picture permanently.
- Official `svelte-spa-router` v5, or one of the two community forks — decide based on fit with `routeAccess.js`'s existing permission-gating needs, not by default.
- Confirm whether to stage the Svelte bump as 3 → 4 → 5 (a quick, low-risk 3→4 hop first to prove the toolchain, since Svelte 4 was a mostly non-breaking release relative to 3) versus one direct hop to 5. This is worth a short, cheap spike to decide rather than assuming either answer.
- Given zero frontend test coverage today, how much of Phase 0's smoke-test investment happens before this project starts versus alongside it — this is a real scoping/timeline decision, not just a nice-to-have footnote.
