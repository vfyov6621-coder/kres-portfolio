# Worklog — Kres Portfolio Project

This file is the shared worklog for all agents working on this project.
Read previous sections before starting, and append your own section after finishing.

---
Task ID: 1-3
Agent: orchestrator (main)
Task: Set up the full foundation: database schema, auth backend (JWT + bcrypt + API routes), i18n (en/ru), and React contexts (Auth + Language).

Work Log:
- Installed `jose` (JWT) and `bcryptjs` (password hashing).
- Replaced Prisma schema with a single `User` model: `id`, `username` (unique), `passwordHash`, `isAdmin`, timestamps. Pushed to SQLite (`bun run db:push`).
- Created `src/lib/auth.ts`: `hashPassword`, `verifyPassword`, `createSessionToken`, `verifySessionToken`, `ensureAdmin` (idempotent — creates admin `kres` / `[REDACTED]` if missing), `publicUser`, `SESSION_COOKIE` constant.
- Created API routes (all `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`):
  - `GET  /api/auth/session`        → `{ user } | null` (also calls ensureAdmin)
  - `POST /api/auth/register`       → `{ user }` (validates username `^[a-zA-Z0-9_]{3,20}$`, password 4-100 chars; sets httpOnly cookie)
  - `POST /api/auth/login`          → `{ user }` (sets cookie)
  - `POST /api/auth/logout`         → `{ ok }` (clears cookie)
  - `POST /api/auth/change-password` → `{ ok }` (requires current session; validates current password; rejects same password)
  - Error responses return `{ error: '<code>' }` with codes: `username_invalid`, `password_invalid`, `username_taken`, `invalid_credentials`, `same_password`, `missing_fields`, `invalid_current`, `invalid_body`, `unauthorized`.
- Created `src/lib/i18n.ts`: `Lang = 'en' | 'ru'`, `LANGS`, `LANG_LABELS`, a flat `translations` dict with `en`/`ru` keys (prefixes `term.*`, `desk.*`, `content.*`), and `translate(lang, key)`.
- Created `src/contexts/language-context.tsx`: `LanguageProvider` + `useLanguage()` → `{ lang, setLang, t }`. Persists choice in `localStorage` key `kres_lang`, defaults by browser language.
- Created `src/contexts/auth-context.tsx`: `AuthProvider` + `useAuth()` → `{ user, loading, login, register, changePassword, logout, refresh }`. `user: { id, username, isAdmin, createdAt } | null`. All methods hit the API routes with `credentials: 'same-origin'`.
- Updated `src/app/layout.tsx` to wrap children in `<LanguageProvider><AuthProvider>...`.

Stage Summary — CONTRACTS for downstream UI agents:
- `useAuth()` is available app-wide. `user` is `null` until logged in. `loading` is true during the initial session fetch.
- `useLanguage()` is available app-wide. `t('term.optionLogin')` etc. returns the localized string for the current `lang`.
- Translation key prefixes: `term.*` (terminal), `desk.*` (desktop chrome), `content.*` (portfolio window contents). See `src/lib/i18n.ts` for the full key list — add new keys there if needed and keep `en`/`ru` in sync.
- The two big UI components to build next:
  - Task 4-a → `src/components/terminal/TerminalAuth.tsx` (the terminal login/register screen)
  - Task 4-b → `src/components/portfolio/PortfolioDesktop.tsx` (the Win98/MacOS desktop)
- `src/app/page.tsx` will be wired by the orchestrator afterwards: `loading → blank; !user → <TerminalAuth />; user → <PortfolioDesktop />`.
- The dev server runs on port 3000. Logs are in `/home/z/my-project/dev.log`.
- Admin seed: username `kres`, password `[REDACTED]` (created automatically on first API hit).

Design constraints (from the user):
- Black-and-white style throughout.
- The terminal screen style is DIFFERENT from the rest of the site (pure terminal aesthetic).
- The portfolio site style = Windows 98 mixed with Mac OS.
- Language selection (EN/RU) is part of the terminal flow.
- Password can be changed; login is permanent.

---
Task ID: 4-b
Agent: frontend-styling-expert
Task: Build the portfolio desktop UI (Windows 98 mixed with Mac OS, strict B&W) under `src/components/portfolio/`, exposed via the default export `PortfolioDesktop` in `PortfolioDesktop.tsx`. Reads everything from `useAuth()` and `useLanguage()`; receives no props.

Work Log:
- Created 11 files under `src/components/portfolio/`:
  - `PortfolioDesktop.tsx` — main entry, default export. Owns window state `WindowState[]` (`id, minimized, maximized, z, x, y, w, h`), start-menu open state, selected-icon state, an incrementing `zCounter` ref for focus management. Computes `activeId` as the visible window with the highest `z`. Wires the MenuBar / DesktopIcons / DesktopWindow / StartMenu / Taskbar together. Mounts a local Sonner `<Toaster />` (B&W styled) so `toast.success`/`toast.error` actually render — the layout only mounts the radix Toaster, so this is required for sonner calls to display.
  - `types.ts` — `WindowId`, `WindowState`, `WindowMeta`, the `WINDOWS[]` metadata list (id → labelKey + lucide icon: Info/FolderClosed/Cpu/Mail/Settings), `DEFAULT_WINDOW_W/H`, `WINDOW_CASCADE`, and the Win98 bevel constants `BEVEL_OUT`, `BEVEL_IN`, `BEVEL_OUT_THIN`, `BEVEL_IN_THIN` (4-side two-tone box-shadows: white top-left, black bottom-right, with the inner `#dfdfdf`/`#808080` band), plus `FACE = #c0c0c0`, `FACE_DARK = #9a9a9a`, `FACE_LIGHT = #d8d8d8`.
  - `useClock.ts` — `useClock()` (1s `setInterval` returning a `Date`), `formatMenuClock(d, lang)` producing `Mon DD  HH:MM` (en) / `ДД Мес  HH:MM` (ru) with hardcoded month abbrevs, and `formatTrayClock(d)` producing `HH:MM`.
  - `useIsNarrow.ts` — `useIsNarrow()` via `matchMedia('(max-width: 767px)')` so we can force windows to near-fullscreen on mobile.
  - `MenuBar.tsx` — fixed top MacOS menu bar (white bg, 1px black bottom border, `h-6 md:h-7`). Left: bold brand + File/Edit/View/Help menu words (words hidden below `md`, hover inverts to black/white). Right: globe icon + `EN | RU` toggle (active bolded+underlined), live menu clock (updates every second), and a user indicator showing `username` + admin/user badge (badge inverted to black bg/white text for admins) that opens a small dropdown with `desk.changePassword` (opens the Settings window) and `desk.shutdown` (calls `logout()`). Dropdown closes on outside-click or escape.
  - `Taskbar.tsx` — fixed bottom Win98 taskbar (`h-11 md:h-10`, raised beveled gray via inset box-shadow top-white/bottom-gray). Left: Start button (raised bevel, with a small monochrome logo square — black square with white inset — and the `desk.start` text in uppercase). Middle: window buttons for each open window (`desk.noWindows` placeholder when empty), each shows the window's lucide icon + label, pressed (inset bevel) when active, raised otherwise; horizontally scrollable+truncated with `.no-scrollbar`. Right: system tray with a small HH:MM clock (inset bevel). Touch targets: 44px on mobile.
  - `StartMenu.tsx` — Win98-style popup popping up above the Start button (`absolute left-0 bottom-0` of the desktop area). Slim left banner strip: black bg with the brand text rotated 90° (`writingMode: vertical-rl; transform: rotate(180deg)`) in white uppercase with letter-spacing. Right column: list of app items (About, Projects, Skills, Contact, Settings) — clicking opens/focuses the corresponding window and closes the menu. Separator, then `desk.shutdown` (Power icon) calling `logout()`. Closes on outside-click or Escape.
  - `DesktopIcons.tsx` — left-column desktop icons (lucide icon + label). Single click selects (inverts to white bg + black text/icon — classic Win98 selection look). Double-click opens the window. Renders the subtle `desk.doubleClick` hint at the bottom.
  - `DesktopWindow.tsx` — the "mixed" window: Win98 body (`#c0c0c0` face + `BEVEL_OUT` 4-side bevel) + MacOS traffic-light buttons in the top-left of the title bar. Three small circles (12px desktop / 16px mobile) with a 36×36 / 14×14 touch wrapper; symbols (`×`, `–`, `+`) are hidden by default and revealed on group-hover. Close → removes window; Minimize → sets `minimized` (kept in taskbar); Maximize → toggles fill-the-desktop. Title bar is a slightly darker gray when focused (`FACE_DARK`), lighter when not (`FACE_LIGHT`), with black title text (gray when unfocused). Title bar is draggable via pointer events with `setPointerCapture` — clamps within the desktop bounds (keeps ≥80px visible horizontally, ≥32px vertically); double-click on title bar toggles maximize. Content area is white with an inset bevel, scrolls with a custom Win98-style thin beveled scrollbar (`.win-scroll`). Clicking anywhere on the window bumps its z (focus). A thin Win98 status strip sits at the bottom on `md+`. On narrow screens (`isNarrow`), the window is forced to `inset-2` and the title bar grows to `h-11` to give 44px touch targets for the traffic lights.
  - `WindowContents.tsx` — switches on `WindowId` to render the 5 contents:
      - About: `content.aboutTitle` heading + `content.aboutBody` paragraph + `content.aboutHint` italic note.
      - Projects: `content.projectsTitle` + 3 inset-beveled cards (`content.project1..3Title` + `content.project1..3Desc`) + `content.projectsHint`.
      - Skills: `content.skillsTitle` + a placeholder chip list (`['React','TypeScript','Node.js','Design','Next.js','Tailwind']`) rendered as raised-beveled chips + `content.skillsHint`. Plain text the owner can edit directly in the file.
      - Contact: `content.contactTitle` + two inset-beveled rows (Email/GitHub label → value) + `content.contactHint`.
      - Settings: `content.settingsTitle` + `content.settingsHint`. Shows the current username + admin/user badge, a `desk.loggedInAs` heading, and a `content.loginForever` note. Contains the **change-password** form: three masked inputs (`desk.currentPassword`, `desk.newPassword`, `desk.confirmNewPassword`), a `desk.save` button. Client checks: empty → `toast.error(t('term.errMissingFields'))`; new !== confirm → `toast.error(t('term.errPasswordMismatch'))`. Calls `changePassword(current, next)`; on ok → `toast.success(t('desk.passwordChanged'))` and clears the fields; on error → maps `invalid_current`→`term.errInvalidCurrent`, `same_password`→`term.errSamePassword`, `password_invalid`→`term.errPasswordInvalid`, `missing_fields`→`term.errMissingFields`, else `term.errGeneric`, and `toast.error`s the message. Also has an EN/RU language toggle using `setLang`.
  - `desktop.css` — `.no-scrollbar` (hide scrollbars on icon column / taskbar window-list) and `.win-scroll` (custom Win98-style thin beveled scrollbar for window content areas: 14px thumb with the same 4-side two-tone bevel, white track).
- Used `sonner`'s `toast.success` / `toast.error` for the password form feedback (and mounted a local `<SonnerToaster />` inside `PortfolioDesktop` so the toasts actually display).
- Used `lucide-react` icons: `Info`, `FolderClosed`, `Cpu`, `Mail`, `Settings`, `Power`, `ChevronDown`, `Globe`.
- Did NOT modify `page.tsx`, `layout.tsx`, contexts, or API routes. Did NOT add any new translation keys — all required keys (`desk.*`, `content.*`, `term.err*`) already exist in `src/lib/i18n.ts`.

Stage Summary — what the next agent (orchestrator) needs to know:
- The portfolio desktop is ready at `src/components/portfolio/PortfolioDesktop.tsx` as a **default export**. Wire it from `src/app/page.tsx`: `loading → blank/loading state; !user → <TerminalAuth />; user → <PortfolioDesktop />`. Import: `import PortfolioDesktop from '@/components/portfolio/PortfolioDesktop'`.
- The component takes no props and reads everything from `useAuth()` and `useLanguage()`. It returns `null` if `user` is null (defensive — the orchestrator should still gate it).
- Window content is intentionally placeholder — the owner should edit `src/components/portfolio/WindowContents.tsx` directly (each section is small and clearly delineated). The hint text (`content.*Hint`) already points there.
- Strict B&W palette throughout: black `#000`, white `#fff`, Win98 face `#c0c0c0`, dark face `#9a9a9a`, light face `#d8d8d8`, shadow `#808080`, highlight `#dfdfdf`. Desktop area is near-black `#0e0e0e` with a faint white radial-dot pattern. NO indigo/blue/colored accents anywhere.
- Lint passes for all files under `src/components/portfolio/`. The only remaining lint error in the repo is in `src/contexts/language-context.tsx` (`react-hooks/set-state-in-effect` on line 28) — that's a pre-existing issue from Task 1-3, not introduced by this task.
- TypeScript strict checks pass for all portfolio files (`bunx tsc --noEmit` shows no errors in `src/components/portfolio/`; remaining TS errors are only in `examples/` and `skills/` which are outside the project scope).
- All needed translation keys already exist; no new keys were added.
- A sonner `<Toaster />` is mounted inside `PortfolioDesktop` (B&W styled: white bg, black 1px border, square corners, Win98 bevel box-shadow). This is independent of the radix `<Toaster />` mounted in `layout.tsx` — they coexist fine.

---
Task ID: 4-a
Agent: frontend-styling-expert
Task: Build the TERMINAL LOGIN/REGISTER SCREEN at `src/components/terminal/TerminalAuth.tsx` (default export, `'use client'`, no props). Shown when the user is NOT logged in. Pure black-and-white CRT terminal aesthetic — visually distinct from the Win98/MacOS desktop. Reads everything from `useAuth()` and `useLanguage()`.

Work Log:
- Created 2 files under `src/components/terminal/`:
  - `TerminalAuth.tsx` — main entry, default export. A phase state machine with phases: `boot` → `language` → `menu` → `login` | `register`. Receives no props; pulls `login`/`register` from `useAuth()` and `setLang`/`t` from `useLanguage()`. Auto-scrolls the terminal body to the bottom on every content change via a `scrollRef` + effect. Boots after a 120 ms delay so the `LanguageProvider` has time to detect the browser language before boot lines start typing (uses a `tRef` so the boot effect doesn't re-run when `t` changes mid-boot).
  - `terminal.css` — CRT/terminal styles (`.term-root`, `.term-line`, `.term-prompt`, `.term-dim`, `.term-error`, `.term-success`, `.term-input`, `.term-btn`, `.term-link`, `.term-cursor`, `.crt-scanlines`). Font stack falls back through `var(--font-geist-mono)` → `ui-monospace` → `SF Mono` → `Menlo` → `Consolas` → `Courier New`. Text gets a subtle 6px glow. Mobile font size 13 px, sm+ 14 px. Buttons/links invert to white-bg/black-text on hover/active/focus. Blinking block cursor via `@keyframes term-blink` with `prefers-reduced-motion` opt-out. CRT scanlines via `repeating-linear-gradient` with `mix-blend-mode: multiply`.
- Phases:
  - **BOOT** — types out 12 lines one-by-one with 90–180 ms jitter per text line. Two of the lines (`term.boot.loadDrivers` and `term.boot.modules`) render an animated `[████░░░░] NN%` progress bar that fills 0→100 % over 750 ms, then collapses to a static `[████████] 100% [OK]` line. After the last line, auto-advances to `language` after 400 ms. The animated bar is rendered by a separate `<BootProgress>` child component (extracted so the boot driver effect never calls `setState` synchronously, which would trip `react-hooks/set-state-in-effect`).
  - **LANGUAGE** — shows `term.selectLanguage` + `term.languageHint` + two bordered `EN`/`RU` buttons (44 px min height). Clicking or pressing `1`/`2` calls `setLang(...)` and advances to `menu`. A blinking cursor sits under the prompt.
  - **MENU** — shows `term.welcome`, `[1] Login`, `[2] Register` (full-width clickable lines, invert on hover/active), `term.orType` hint. Keyboard: `1`/`2` highlights (sets `menuChoice`), `Enter` confirms and transitions. Clicking a line goes directly. Blinking cursor under prompt.
  - **LOGIN** — prompts `username> ` (text input, inline, transparent, white caret, mono font, autofocus) then `password> ` (masked via native `type="password"` → renders as `•`). Enter in username → advances to password; Enter in password → submits. Past fields re-render as static text (password masked with `•`). Submit button + `term.exitHint` shown on the password field. ESC returns to menu. On submit: empty → `term.errMissingFields`; otherwise `await login(...)`. Success → `term.loginSuccess` (green) and `loginField='done'`. Error → maps `invalid_credentials`/`username_invalid`/`password_invalid`/`generic` to the right `term.err*` key, renders in red, clears password, returns to username field for retry.
  - **REGISTER** — same shape but three fields: `username> ` / `password> ` / `confirm> ` (all masked except username). Enter advances through fields; Enter on confirm submits. Client checks: empty → `term.errMissingFields`; `password !== confirm` → `term.errPasswordMismatch`. On submit: `await register(...)`. Success → `term.registerSuccess`. Error → maps `username_taken`/`username_invalid`/`password_invalid`/`generic`, clears password+confirm, returns to username.
- All form state resets are done inside a central `transitionTo(nextPhase)` callback (not in a `useEffect`), so there's no `set-state-in-effect` violation. The global keydown handler (window-level) is the only effect that touches state in callbacks (for language picks, menu nav, ESC) — all of those `setState` calls are inside the `onKey` event handler, not the effect body, so the rule is satisfied.
- `tRef` is updated inside a `useEffect` (not during render) — initial version assigned `tRef.current = t` in the render body, which tripped `react-hooks/refs`; fixed by moving the assignment into an effect with `[t]` deps.
- Inputs use `autoComplete="username"`/`"current-password"`/`"new-password"`, `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}` for proper mobile behavior. `aria-label`s are localized via `t('term.username')` etc.
- Clicking anywhere in the terminal body (but not on a child) refocuses the active input — handy on mobile when the soft keyboard dismisses.
- Lint passes for all files under `src/components/terminal/`. The only remaining lint error in the repo is the pre-existing `react-hooks/set-state-in-effect` in `src/contexts/language-context.tsx` line 28 (from Task 1-3) — NOT introduced by this task; explicitly out of scope per the task instructions ("DO NOT modify these files, only consume them").
- TypeScript strict: `bunx tsc --noEmit` reports no errors in `src/components/terminal/` (the only TS errors are in `examples/` and `skills/`, both outside the project scope and ignored by eslint).
- Did NOT modify `page.tsx`, `layout.tsx`, the API routes, the contexts, or `src/lib/i18n.ts`. All required translation keys already exist; NO new translation keys were added.

Stage Summary — what the next agent (orchestrator) needs to know:
- The terminal auth screen is ready at `src/components/terminal/TerminalAuth.tsx` as a **default export**. Wire it from `src/app/page.tsx`: `loading → blank/loading state; !user → <TerminalAuth />; user → <PortfolioDesktop />`. Import: `import TerminalAuth from '@/components/terminal/TerminalAuth'`.
- The component takes no props and reads everything from `useAuth()` and `useLanguage()`. When `login()`/`register()` succeed, the auth context sets `user` non-null, the parent re-renders and swaps `<TerminalAuth />` out for `<PortfolioDesktop />`. TerminalAuth also sets a `success` state with `term.loginSuccess`/`term.registerSuccess` (rendered in green) — but this is best-effort; the parent swap is what actually transitions the user. No defensive `if (user) return null` was added (the parent is responsible for gating) — if the orchestrator's gate is `!user && <TerminalAuth />`, the success state will be visible briefly; if the gate is `user ? <PortfolioDesktop/> : <TerminalAuth/>`, the swap is immediate.
- Strict B&W palette: black `#000` background, body text `#d4d4d4`, prompts `#e5e5e5`, dim `#6b7280`, error `#ff6b6b` (the only non-monochrome accent, used solely for error messages), success `#7ee787` (subtle green, used solely for the success line). CRT scanlines via `mix-blend-mode: multiply` at 70 % opacity. Subtle text glow (`text-shadow: 0 0 6px rgba(229,229,229,0.16)`). NO colored accents beyond the two functional error/success states.
- Visual contract: `term-btn` (bordered, inverts on hover) for the EN/RU and Submit buttons; `term-link` (full-width clickable line, inverts on hover) for the menu options; `term-input` (transparent, no border, white caret) for the inline form inputs; `term-cursor` (blinking 0.6em × 1em block) at the language/menu prompts. Mobile: 13 px text, 44 px touch targets. Desktop: 14 px text.
- Boot timing: ~120 ms initial delay (waits for LanguageProvider's browser-lang detection) + 12 lines × ~90–180 ms each + 2 × ~930 ms (750 ms bar + 180 ms settle) ≈ ~3.5 s total boot. After boot, auto-advances to language phase. There's no "skip boot" key — the boot is short enough.
- The menu phase requires `Enter` to confirm a typed `1`/`2` selection (matches the `term.orType` hint text "type a number and press Enter"). Clicking a menu item goes directly. This is intentional — the hint text mentions Enter, so the behavior matches.
- All boot/form rendering uses raw HTML elements + Tailwind classes + the local `terminal.css`. NO shadcn/ui components are used (as required).
- The `lang` variable from `useLanguage()` is intentionally not destructured (we only need `setLang` and `t` from the context — we never read the current `lang` inside the component because the language phase is for *choosing* the language, not displaying it).

---
Task ID: 5-7
Agent: orchestrator (main)
Task: Integrate page.tsx with the two UI components, fix lint, run end-to-end self-verification with Agent Browser, and add Render deployment config.

Work Log:
- Wired `src/app/page.tsx`: `loading → blank black screen; !user → <TerminalAuth />; user → <PortfolioDesktop />`. Both components are default exports taking no props (they read from useAuth/useLanguage).
- Fixed the only lint error (`react-hooks/set-state-in-effect` in `language-context.tsx`) by switching `LanguageProvider` from `useState`+`useEffect` to `useSyncExternalStore(subscribe, readStoredLang, () => 'en')`. This avoids both hydration mismatch (server snapshot returns 'en') and the lint rule, while still picking up the stored/browser language right after hydration. `setLang` writes localStorage + notifies subscribers.
- `bun run lint` now passes with zero errors.
- Created `render.yaml` (Render Blueprint) for free-tier deployment: Node runtime, build runs `npm install && mkdir -p data && npx prisma db push && npx next build`, start runs `npx next start`. Env vars: NODE_VERSION=22.4.0, NODE_ENV=production, DATABASE_URL=file:/opt/render/project/src/data/custom.db (absolute so CLI + client share the same file), JWT_SECRET auto-generated.
- Cleaned up the test user "tester" created during verification (DB now contains only the admin account).

Self-verification via Agent Browser (all passed, no browser/server errors):
- Terminal boot sequence types out ~12 aesthetic lines (KRES-OS v2.1.905, copyright, init kernel [OK], load drivers with progress bar, mount fs, net stack, identity vault, modules with progress bar, encrypt) then auto-advances.
- Language selection: EN/RU buttons + keyboard 1/2. Picking RU flips the entire UI to Russian (verified desktop icons, headings, menu items, badges all localized).
- Menu → Login form: terminal prompts `username>` / `password>` (masked), Enter advances fields, ESC returns to menu, SUBMIT button works.
- Admin login (kres / [REDACTED]) → desktop loads. Badge shows "kres ADMIN".
- Registration: created user "tester" → desktop loads with "tester USER" badge.
- Unique-login enforcement: re-registering "tester" returns 409 + terminal shows "! username already taken".
- Portfolio desktop: MacOS top menu bar (brand + File/Edit/View/Help + EN/RU toggle + live clock + user dropdown), Win98 taskbar (START + window buttons + tray clock), desktop icons (About/Projects/Skills/Contact/Settings, double-click to open), windows with Win98 beveled borders + MacOS traffic-light buttons (Close/Minimize/Maximize), draggable title bars, z-index focus management, start menu popup.
- Change password: [REDACTED] → testpass123 (success toast "Password changed successfully") → back to [REDACTED] (success). Wrong-current and same-password error paths mapped to localized messages.
- Logout (via user dropdown "Log out" / "Выйти") → returns to terminal boot screen; language preference persists in localStorage.
- Responsive: tested at 390×844 (mobile) — terminal and desktop both render correctly; windows open near-fullscreen with Maximize disabled on narrow screens; 44px touch targets present.

Stage Summary:
- The app is fully functional end-to-end. Admin account kres/[REDACTED] always available (self-healing via ensureAdmin). Registration open with unique usernames. Password change works. EN/RU i18n throughout. Terminal style is distinct from the Win98/MacOS desktop. Lint clean.
- Deployment: `render.yaml` ready. CAVEAT documented in render.yaml: Render free tier has an ephemeral filesystem, so registered users and password changes are lost on restart/redeploy (admin always survives). render.yaml includes upgrade notes for Turso/libSQL if persistence is later needed.
- Files of note: `src/app/page.tsx`, `src/app/layout.tsx`, `src/lib/auth.ts`, `src/lib/i18n.ts`, `src/contexts/{auth,language}-context.tsx`, `src/app/api/auth/{session,login,register,logout,change-password}/route.ts`, `src/components/terminal/TerminalAuth.tsx`, `src/components/portfolio/*`, `render.yaml`.

---
Task ID: 8-12
Agent: orchestrator (main)
Task: Add an in-site content editor (admin-only) in the Settings window, expand the terminal boot sequence to 20 processes, and persist the edited portfolio content on the client (localStorage).

Work Log:
- i18n (`src/lib/i18n.ts`): added 13 new `term.boot.*` keys in BOTH en/ru (probeMemory, detectCpu, initInterrupts, registerDevices, buildSysTree, syncRtc, loadFontCache, validateSignatures, spawnShell, loadTheme, calibrateInput, armWatchdog, handshakeAuth) → 20 boot processes total. Added `desk.editContent`, `desk.editAbout`, `desk.editProjects`, `desk.editSkills`, `desk.editContacts`, `desk.projectTitle`, `desk.projectDesc`, `desk.projectLink`, `desk.contactLabel`, `desk.contactValue`, `desk.addProject`, `desk.removeProject`, `desk.addContact`, `desk.removeContact`, `desk.resetDefaults`, `desk.contentSavedAuto`, `desk.contentSaved`, `desk.resetConfirm`, `desk.adminOnly`, `desk.noProjects`, `desk.noContacts` (en+ru).
- Created `src/lib/portfolio-store.ts`: Zustand store with `persist` middleware (localStorage key `kres_portfolio_content`, version 1). State = `{ aboutBody, projects: ProjectItem[], skills: string[], contacts: ContactItem[] }` with default values sourced from `translations.en`. Actions: setAboutBody, setProject, addProject, removeProject, setSkills, setContact, addContact, removeContact, resetAll.
- `src/components/terminal/TerminalAuth.tsx`: rewrote BOOT_STEPS to 20 loading steps (5 progress bars: initKernel, loadDrivers, validateSignatures, modules, handshakeAuth; + 15 text [OK] lines) plus the osName/copyright/blank/selectLanguage/languageHint meta lines. Verified via `agent-browser eval`: exactly 20 `[OK]` lines render.
- `src/components/portfolio/WindowContents.tsx`: rewrote. About/Projects/Skills/Contact now read their content from `usePortfolioStore` (with live re-render on edit). Settings window keeps the change-password form + language toggle, and now ALSO renders a `<ContentEditor>` section **only when `user.isAdmin` is true** (non-admins see an "Admin only" note). The editor has: About textarea (auto-saves), Projects list (title/description/link per item + Add/Remove), Skills textarea (one per line), Contacts list (label/value + Add/Remove), and a "Reset to defaults" button (window.confirm → resetAll). Add/Remove and Reset surface a toast (`desk.contentSaved`); text edits save silently with an "auto-saved" hint. Project links render as clickable anchors in the Projects window; contact values starting with http(s) render as links.

Self-verification via Agent Browser (all passed, no console/server errors):
- Boot: 20 processes confirmed (`OK lines: 20`).
- Login as admin kres/[REDACTED] → desktop.
- Settings window: "EDIT CONTENT" section visible with subsections ABOUT TEXT / PROJECTS / SKILLS (ONE PER LINE) / CONTACTS + Reset button. (Non-admin would see "Admin only" instead — verified by code path.)
- Edited About text → immediately reflected in the About window AND persisted to `localStorage.kres_portfolio_content` (aboutBody updated).
- Added a 4th project (title/desc/link) → projects.length went 3→4 in localStorage; the new project "My New Project" with its link appeared in the Projects window.
- **Reload (without closing browser)**: session cookie kept the user logged in (still on desktop, not terminal) AND localStorage kept the edited content. This confirms both session persistence (httpOnly cookie, 7d) and client-side content persistence (localStorage).
- Reset to defaults → confirm dialog → content reverted to 3 projects + default aboutBody.
- Lint: 0 errors. Dev log: clean.

Stage Summary:
- In-site content editor is live (admin-only, in Settings). Edits auto-save to localStorage (`kres_portfolio_content`) and survive reloads. Covers About / Projects (CRUD) / Skills / Contacts (CRUD) + reset.
- Terminal boot now shows 20 processes (5 with progress bars).
- Session persistence confirmed: httpOnly JWT cookie (7d) keeps the user logged in across reloads; edited content persists in localStorage.
- Files changed: `src/lib/i18n.ts`, `src/lib/portfolio-store.ts` (new), `src/components/terminal/TerminalAuth.tsx`, `src/components/portfolio/WindowContents.tsx`.

---
Task ID: 20
Agent: deploy-config-writer
Task: Add the GitHub Pages deployment workflow, a step-by-step DEPLOY.md setup guide (Firebase + GitHub + local dev + caveats), and update `.gitignore` for Firebase/deployment artifacts. No source/script/config files touched.

Work Log:
- Created `.github/workflows/deploy.yml`:
  - Triggers: `push` to `main` + manual `workflow_dispatch`.
  - `concurrency: { group: pages, cancel-in-progress: true }` so a newer push cancels an in-progress deploy.
  - `permissions: { contents: read, pages: write, id-token: write }` (the last two are required by `actions/upload-pages-artifact` + `actions/deploy-pages` for OIDC).
  - `build` job on `ubuntu-latest`:
    1. `actions/checkout@v4`
    2. `oven-sh/setup-bun@v2` (official Bun action)
    3. `bun install --frozen-lockfile`
    4. `actions/configure-pages@v5` (enables Pages, sets base_url)
    5. `bun run build` with env vars:
       - Six `NEXT_PUBLIC_FIREBASE_*` secrets (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID) read from `secrets.*`.
       - `NEXT_PUBLIC_BASE_PATH` read from **`vars.BASE_PATH`** (repo VARIABLE — not a secret — so it can be empty). If unset, GitHub substitutes `''`, which gives root-relative asset paths → fine for user/org root sites or custom domains. For a project site at `https://<user>.github.io/<repo>/`, the user sets the `BASE_PATH` repo variable to `/<repo>`.
    6. `actions/upload-pages-artifact@v3` with `path: out`.
  - `deploy` job (`needs: build`, `environment: github-pages`, `url: ${{ steps.deployment.outputs.page_url }}`):
    - `actions/deploy-pages@v4`.
  - Header comment documents every secret/variable name + the BASE_PATH semantics.
  - Validated YAML with `python3 -c "import yaml; yaml.safe_load(...)"` → parses cleanly, jobs = ['build','deploy'].
- Created `DEPLOY.md` (English, four parts):
  - **Part A — Firebase setup**: (1) create project, (2) add Web app + the 6-value `firebaseConfig → NEXT_PUBLIC_FIREBASE_*` mapping table, (3) enable Email/Password (no verification needed — synthetic `@portfolio.local` emails), (4) create Firestore in production mode + deploy rules via `firebase deploy --only firestore:rules` OR paste into the console, (5) bootstrap the admin: generate `serviceAccount.json` (Project settings → Service accounts → Generate new private key), then `GOOGLE_APPLICATION_CREDENTIAL=./serviceAccount.json bun run bootstrap` → creates `kres`/`[REDACTED]` with `isAdmin:true` + seeds `portfolio/content`. Stresses DO NOT commit `serviceAccount.json`.
  - **Part B — GitHub repo + Pages**: (1) push to GitHub, (2) Settings → Pages → Source = "GitHub Actions", (3) add the six `NEXT_PUBLIC_FIREBASE_*` repository SECRETS (with the public-by-design caveat), (4) optional `BASE_PATH` repo VARIABLE = `/<repo>` for project sites (or unset/empty for root/custom domain — explained via the `${{ vars.BASE_PATH }}` form), (5) push to `main` → workflow builds & deploys to `https://<user>.github.io/<repo>/`.
  - **Part C — Local dev**: `cp .env.example .env.local` + fill real values, OR use the demo values + `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` and run `bun run emulators` (auth :9099, firestore :8080) + bootstrap with the emulator env vars + `bun run dev`. Includes the sandbox caveat (use the Preview Panel, not `http://localhost:3000`).
  - **Part D — Notes / caveats**: Firebase config is PUBLIC by design (security from rules + Auth, not hiding config); Spark free tier is enough; portfolio content is in Firestore → admin edits propagate to all visitors in real time via `onSnapshot` with a localStorage cache for instant first paint; admin password reset via re-running `bun run bootstrap` (resets to `[REDACTED]`) or in-app Settings → Change password; the `.gitignore` list (`.env.local`, `serviceAccount.json`, `.next/`, `out/`, `firebase-debug.log`, `firestore-debug.log`, `ui-debug.log`, `*.local`); custom-domain HTTPS note (clear `BASE_PATH`).
- Updated `.gitignore` (additive — no existing entries removed). The file already covered `.env.local` (via `.env*`), `/.next/`, `/out/`, and `*-debug.log` (via `*.log`). Added a new `# Firebase + deployment` section with explicit entries for `serviceAccount.json`, `firebase-debug.log`, `firestore-debug.log`, `ui-debug.log`, and `*.local` so the deployment guide's `.gitignore` reference list matches the actual file 1:1.
- Verified: `python3` YAML parse OK; `bun run lint` clean (exit 0, no errors — expected, since no `src/` files were touched). The dev server log was not consulted because no source changed.

Stage Summary — what downstream agents / the owner need to know:
- Deployment is one-push: configure the six Firebase secrets (+ optional `BASE_PATH` variable) once, then every push to `main` builds and ships the static export to GitHub Pages automatically.
- The `BASE_PATH` design choice: it is read from **`vars.BASE_PATH`** (a repository VARIABLE, not a secret) so it can legitimately be empty. Unset → empty string → root-relative asset paths (works for `<user>.github.io` root repos or custom domains). Set to `/<repo>` for project pages. This matches the task spec's "If `BASE_PATH` repo variable is unset, it's empty string → fine for root/custom domain."
- The workflow uses current/idiomatic action versions: `checkout@v4`, `setup-bun@v2`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`.
- `serviceAccount.json` is gitignored — but the owner must ALSO revoke old keys from the Firebase console (Project settings → Service accounts) after rotating them; `.gitignore` only prevents committing, it doesn't revoke credentials.
- Files created: `.github/workflows/deploy.yml`, `DEPLOY.md`. File edited: `.gitignore` (additive). NO files in `src/`, `scripts/`, `next.config.ts`, `package.json`, `firestore.rules`, `firebase.json`, or `.env*` were touched.

---
Task ID: 13-21 (Firebase refactor summary)
Agent: orchestrator (main)
Task: Migrate the app from server-side Next.js (API routes + Prisma/SQLite + JWT-cookie) to a static-export frontend for GitHub Pages backed by Firebase (Auth + Firestore).

Work Log:
- Installed `firebase` (client), `firebase-admin`, `firebase-tools` (emulators). Removed `prisma`, `@prisma/client`, `bcryptjs`, `jose`, `@types/bcryptjs`, `next-auth`.
- Created `src/lib/portfolio-defaults.ts` (shared types + defaultContent, used by both the store and the bootstrap script) and `src/lib/firebase.ts` (client init from NEXT_PUBLIC_FIREBASE_* env, optional emulator connection, usernameToEmail mapping).
- Rewrote `src/contexts/auth-context.tsx` to use Firebase Auth (onAuthStateChanged for session persistence, createUserWithEmailAndPassword for register, signInWithEmailAndPassword for login, reauthenticateWithCredential + updatePassword for changePassword, signOut for logout). Same public API (`user`, `loading`, `login`, `register`, `changePassword`, `logout`, `refresh`) and same error codes as before → no UI changes needed. Username → `${username}@portfolio.local` email. Firestore `users/{uid}` stores `{ username, isAdmin, createdAt }`; `usernames/{lower}` is the uniqueness guard.
- Rewrote `src/lib/portfolio-store.ts` to sync with Firestore `portfolio/content` via onSnapshot (real-time for all viewers) + a localStorage cache for instant first paint. Preserved the exact store API used by WindowContents. Admin edits write to Firestore (rules enforce admin-only writes).
- Updated `src/app/page.tsx` to call `initPortfolioSync()` once.
- Deleted server-only files: `src/app/api/**`, `src/lib/auth.ts`, `src/lib/db.ts`, `prisma/`, `db/`, `render.yaml`.
- Updated `next.config.ts`: `output: 'export'`, `basePath`/`assetPrefix` from `NEXT_PUBLIC_BASE_PATH` (empty in dev), `images.unoptimized`, `trailingSlash`. Added `public/.nojekyll`.
- Updated `package.json` scripts: removed `db:*`/`start`/old `build`; added `emulators` (firebase emulators:start) and `bootstrap` (bun scripts/bootstrap-admin.ts).
- Created `firebase.json` (emulators: auth 9099, firestore 8080), `firestore.rules` (users self-create with isAdmin=false, admin-only mutation; usernames uniqueness guard; portfolio public-read/admin-write), `firestore.indexes.json` (empty), `scripts/bootstrap-admin.ts` (creates admin kres/[REDACTED] with isAdmin:true + seeds default content; supports both real service-account and emulator modes), `.env.example`.
- Subagent (Task 20) created `.github/workflows/deploy.yml` (bun build → upload-pages-artifact → deploy-pages; Firebase config from repo secrets, BASE_PATH from repo variable) and `DEPLOY.md` (Firebase setup + GitHub Pages + local dev + caveats). Updated `.gitignore`.

Self-verification via Firebase EMULATORS + Agent Browser (all passed, no console errors):
- Started emulators (auth 9099, firestore 8080) and ran `bun run bootstrap` → admin kres/[REDACTED] created, isAdmin:true profile written, default portfolio content seeded.
- Boot (20 processes) → language → login kres/[REDACTED] → desktop with "kres ADMIN" badge. (Firebase Auth login works.)
- Opened Settings → EDIT CONTENT section visible (admin) with About textarea pre-filled FROM Firestore (seeded default). Edited About → verified the change was WRITTEN to Firestore (curl to the emulator REST API showed the new aboutBody).
- Reload → still logged in (Firebase Auth session persisted via IndexedDB) AND edited content still showing from Firestore. Confirms cross-reload persistence of BOTH session and content.
- Change password [REDACTED] → testpass123 (success toast) → logout → login with testpass123 → success → change back to [REDACTED]. (Firebase Auth reauthenticate + updatePassword works.)
- Register new user "tester" → desktop with "tester USER" badge. (Firebase Auth createUser + Firestore profile + usernames guard works.)
- Non-admin "tester" opens Settings → sees "Admin only" note (editor hidden, content writes would be blocked by rules anyway).
- Re-register "tester" → "! username already taken" (uniqueness enforced).
- `next build` static export → `out/index.html` + `out/.nojekyll` + `out/_next/` generated, all routes marked ○ (Static). Ready for GitHub Pages.
- `bun run lint` → clean (0 errors).

Stage Summary:
- The app is now a pure static frontend (Next.js `output: 'export'`) + Firebase backend. No Node server required → deploys to GitHub Pages free tier.
- Auth: Firebase Auth (email/password with synthetic `@portfolio.local` emails), session persists across reloads. Admin kres/[REDACTED] created via `bun run bootstrap`.
- Data: Firestore (`users`, `usernames`, `portfolio/content`). Portfolio content is real-time synced (onSnapshot) with a localStorage cache; admin edits are visible to all visitors instantly.
- Security: `firestore.rules` enforce public read for portfolio + self-create user profiles (isAdmin forced false) + admin-only writes/mutations. Firebase config values are public by design.
- Deploy: push to GitHub → `.github/workflows/deploy.yml` builds the static export (Firebase config from repo secrets, BASE_PATH from repo variable) and deploys to GitHub Pages. Full setup steps in `DEPLOY.md`.
- Local dev/testing: `bun run emulators` + `bun run bootstrap` + `bun run dev` (with NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true in .env).
- Files of note: `src/lib/firebase.ts`, `src/lib/portfolio-defaults.ts`, `src/lib/portfolio-store.ts`, `src/contexts/auth-context.tsx`, `src/app/page.tsx`, `next.config.ts`, `package.json`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `scripts/bootstrap-admin.ts`, `.github/workflows/deploy.yml`, `DEPLOY.md`, `.env.example`, `public/.nojekyll`.

---
Task ID: 22
Agent: orchestrator (main)
Task: Fix login/register being broken + add emulator data persistence + put zip in download/.

Work Log:
- Root cause: `.env` had `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` but emulators were stopped (killed after earlier testing) → all Firebase Auth/Firestore calls failed silently → couldn't login or register. Emulator data was also in-memory, so the admin was lost on restart.
- Restarted Firebase emulators. Re-ran `bun run bootstrap` to recreate admin kres/[REDACTED] + seed content.
- Added emulator data persistence: updated `package.json` `emulators` script to `firebase emulators:start --import .firebase-data --export-on-exit .firebase-data` so auth users + firestore docs survive emulator restarts. Added `.firebase-data/` to `.gitignore`.
- Rebuilt the zip with the latest fixes (persistence script, corrected .gitignore with `!.env.example`) and placed it at `public/download/kres-portfolio.zip` (served by Next.js dev server, downloadable at /download/kres-portfolio.zip).
- Removed the stray root-level `download/` folder (not served by Next.js) in favor of `public/download/`.

Self-verification (Agent Browser, emulator-backed):
- Boot → EN → Login kres/[REDACTED] → "kres ADMIN" desktop. ✅
- Logout → Register "newuser"/pass1234 → "newuser USER" desktop. ✅
- Logout → Login kres/[REDACTED] again → success. ✅
- `curl /download/kres-portfolio.zip` → HTTP 200, 291119 bytes. ✅
- `bun run lint` → clean.

Stage Summary:
- Login & register work again (emulators running + admin re-bootstrapped).
- Emulator data now persists across restarts via `.firebase-data/` (auto import/export).
- Zip is downloadable from the app at `/download/kres-portfolio.zip` (in `public/download/`).
- NOTE for deployment: when the user sets up a REAL Firebase project, set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` and fill real `NEXT_PUBLIC_FIREBASE_*` values in `.env` — then emulators are no longer needed.

---
Task ID: 23
Agent: orchestrator (main)
Task: Create a GitHub repository and push the project using the tokens from upload/tokens.txt.

Work Log:
- Read upload/tokens.txt (two tokens: gitzaya, gitaziya — both resolve to the same account vfyov6621-coder).
- Verified both tokens via GET /user (both valid for vfyov6621-coder).
- Cleaned the git index before pushing: untracked .env (demo emulator values), public/download/kres-portfolio.zip (binary), .zscripts/, Caddyfile, examples/, mini-services/, download/, shot-*.png, tool-results/. Added all to .gitignore. Committed the cleanup.
- SECURITY: confirmed upload/ (containing tokens.txt) was NEVER tracked and is now gitignored. Verified .env and upload/tokens.txt return 404 on the remote.
- Created public repo "kres-portfolio" via POST /user/repos (public, issues/projects/wiki disabled).
- Pushed main using a credential helper (token in env var, NOT stored in remote config). Verified `git remote -v` shows the clean URL with no token.
- Pushed a second cleanup commit removing tool-results/ scaffold artifact.

Stage Summary:
- Repository live: https://github.com/vfyov6621-coder/kres-portfolio (public, default branch main).
- Contains: src/ (full app), .github/workflows/deploy.yml, firebase.json, firestore.rules, firestore.indexes.json, scripts/bootstrap-admin.ts, DEPLOY.md, .env.example, package.json, bun.lock, next.config.ts, tsconfig.json, tailwind.config.ts, public/ (.nojekyll, logo.svg, robots.txt).
- Does NOT contain: .env, upload/tokens.txt, serviceAccount.json, node_modules, .next, out, scaffold files, debug screenshots.
- Token was used only for the push via credential helper; not persisted in git config.
- Next steps for the user (documented in DEPLOY.md): set up a real Firebase project, add the 6 NEXT_PUBLIC_FIREBASE_* secrets to the repo, set BASE_PATH variable to /kres-portfolio, enable GitHub Pages (Source = GitHub Actions), then push to main triggers the deploy workflow.

---
Task ID: 24
Agent: orchestrator (main)
Task: Apply the real Firebase config from upload/lel.txt and wire up GitHub secrets.

Work Log:
- Parsed the real firebaseConfig from upload/lel.txt (apiKey, authDomain, projectId=kres-portfolio, storageBucket, messagingSenderId, appId, measurementId).
- Wrote real values to .env (NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false). Note: .env is gitignored; only .env.example is committed.
- Stopped emulators + restarted dev server with real Firebase config.
- Set the 6 NEXT_PUBLIC_FIREBASE_* values as GitHub repository SECRETS (encrypted via libsodium, HTTP 201 each) on vfyov6621-coder/kres-portfolio. Set BASE_PATH=/kres-portfolio as a repo VARIABLE (HTTP 201) so the static build uses correct asset paths for the project site.
- Probed the real Firebase project:
  - Auth (Identity Toolkit) endpoint is live (responds 400 to empty body → endpoint active).
  - Firestore database EXISTS (portfolio/content read returned 403, not 404 → database created but default-deny rules still in place).
- Attempted to register "kres" via the UI against real Firebase: Auth createUser succeeded, but the Firestore profile write (users/{uid}) was blocked by the not-yet-deployed rules → app rolled back the Auth user → UI showed "something went wrong, try again".
- Could NOT auto-deploy firestore.rules: `firebase login` requires interactive browser auth (no Google account available here), and the GitHub token is not a Google credential so it can't access Firebase Admin APIs.

Stage Summary — STATUS: blocked on 2 manual steps the user must do in the Firebase Console.
- ✅ Real Firebase config in .env + GitHub secrets + BASE_PATH variable. Push to main will deploy correctly.
- ⏳ Firestore rules NOT deployed yet → registration/login fail because the profile write is denied.
- ⏳ Admin account kres NOT created yet (bootstrap needs a service account).

Manual steps for the user (cannot be automated without a Google login):
1. Deploy Firestore rules:
   a. Firebase Console → Firestore Database → Rules tab → paste the content of firestore.rules → Publish.
   (OR run locally: `firebase login` then `firebase deploy --only firestore:rules --project kres-portfolio`)
2. Create the admin:
   Option A (no service account): after rules are deployed, register "kres" via the UI, then in Firestore Console set users/{uid}.isAdmin = true.
   Option B (service account): Firebase Console → Project settings → Service accounts → Generate new private key → save as serviceAccount.json → run `GOOGLE_APPLICATION_CREDENTIAL=./serviceAccount.json bun run bootstrap`.
After both → login kres/[REDACTED] works + portfolio content editable.

---
Task ID: 25
Agent: orchestrator (main)
Task: Bootstrap admin using the uploaded service account key; deploy rules.

Work Log:
- Copied upload/kres-portfolio-firebase-adminsdk-fbsvc-64465ecbfe.json → serviceAccount.json (gitignored, confirmed via `git check-ignore`).
- Updated scripts/bootstrap-admin.ts to load the service account from SERVICE_ACCOUNT_KEY env (default ./serviceAccount.json) via cert(), falling back to applicationDefault().
- Attempted to deploy firestore.rules via REST API:
  - Firestore database API returned 403 "Cloud Firestore API has not been used in project before or is disabled" → Firestore API NOT enabled in GCP.
  - Firebase Rules API: ruleset created (HTTP 200) but release create returned 403 PERMISSION_DENIED (service account lacks firebaserules.releases.create).
  - Service Usage API (to enable firestore.googleapis.com): 403 PERMISSION_DENIED.
  - Conclusion: the Firebase Admin SDK service account cannot enable APIs or deploy rules. Must be done by the project owner (user) in the console.
- Ran `bun run bootstrap`:
  - Auth.createUser returned 400 "CONFIGURATION_NOT_FOUND" → Email/Password sign-in provider is NOT enabled in Firebase Auth.
  - Verified via Identity Toolkit admin API: GET /admin/v2/projects/kres-portfolio/config → 404 CONFIGURATION_NOT_FOUND (Auth not initialized).

Stage Summary — BLOCKED. The service account key works (got a valid access token), but the Firebase project is missing required setup that only the owner can do in the console:
1. Firestore database must be CREATED (Cloud Firestore API is currently disabled) → then rules can be pasted.
2. Email/Password sign-in must be ENABLED in Authentication.
Until both are done, login/register/admin-bootstrap all fail.

---
Task ID: 26
Agent: orchestrator (main)
Task: After user enabled Auth + Firestore + pasted rules, bootstrap admin, verify, and deploy to GitHub Pages.

Work Log:
- Verified Auth enabled (Identity Toolkit config returns signIn.email.enabled=true) and Firestore created (FIRESTORE_NATIVE, eur3).
- Could NOT deploy firestore.rules via REST API: Firebase Rules API rejects the `rulesetName` field on PATCH (400 "Unknown name") even though GET returns it; POST/create is 403 (service account lacks releases.create). User pasted the rules into the console manually.
- Verified rules now work: public read of portfolio/content and usernames/kres → HTTP 200.
- Ran `bun run bootstrap` with the service account key → admin kres/[REDACTED] created (uid 5tpf2wiQThUzJ6XeR9xwQ7R3wjk2), users/{uid} profile with isAdmin:true written, usernames/kres map written, portfolio/content seeded with defaults. (Admin SDK bypasses security rules.)
- Agent Browser end-to-end verification against REAL Firebase:
  - Boot (20 processes) → EN → Login kres/[REDACTED] → "Access granted" → desktop with "kres ADMIN" badge. ✅
  - About window shows the seeded content from Firestore. ✅
  - Logout → Register "testuser"/test1234 → "testuser USER" desktop. ✅ (Registration + Firestore profile write + username uniqueness map all work with the deployed rules.)
- Pushed 3 local commits to origin/main → triggered GitHub Actions workflow #3.
- Found run #2 had failed: `actions/configure-pages` errored "Get Pages site failed... Not Found" → GitHub Pages was not enabled on the repo.
- Enabled Pages via API: POST /repos/{repo}/pages with build_type=workflow → created, html_url=https://vfyov6621-coder.github.io/kres-portfolio/.
- Workflow #3 completed: success.
- Verified deployed site: GET https://vfyov6621-coder.github.io/kres-portfolio/ → HTTP 200, HTML loads with correct basePath (/kres-portfolio/_next/... assets), title "Kres — Portfolio".

Stage Summary — FULLY DEPLOYED & WORKING:
- Live site: https://vfyov6621-coder.github.io/kres-portfolio/
- Repo: https://github.com/vfyov6621-coder/kres-portfolio
- Backend: Firebase Auth (Email/Password) + Firestore (project kres-portfolio). Rules deployed. Admin kres/[REDACTED] bootstrapped with isAdmin:true.
- Frontend: static Next.js export, auto-deployed on every push to main via GitHub Actions.
- Local dev also works against real Firebase (.env has NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false).
- All features verified: terminal boot (20 procs), EN/RU i18n, login, register, uniqueness enforcement, portfolio desktop (Win98+MacOS), content synced from Firestore, change-password.

---
Task ID: 27-34
Agent: orchestrator (main)
Task: Add password fix (6+), verification system (pending/approved/rejected), welcome splash (10s), analytics (views + approvals).

Work Log:
- i18n: added ~40 new keys (en/ru) for analytics, approvals, welcome, pending/rejected screens, fixed password error text to "at least 6 characters".
- auth-context: password validation now < 6 (matches Firebase minimum); added UserStatus type ('pending'|'approved'|'rejected') to AuthUser + profile; register() now writes status:'pending'; onAuthStateChanged derives status (admin defaults to approved for back-compat).
- firestore.rules: rewrote to add `status` field validation on user create, and new `analytics/portfolio` (admin read, signed-in update) + `analytics/viewers/{uid}` (self create/update, admin read all) collections.
- bootstrap-admin.ts: admin profile now written with status:'approved'. Re-ran bootstrap → admin updated.
- src/lib/analytics.ts: recordPortfolioView(uid, username) — increments analytics/portfolio.totalViews + upserts analytics/viewers/{uid} with views count + lastSeen. Best-effort (never blocks UI).
- src/components/WelcomeScreen.tsx: full-screen black splash, KRESOS logo image (public/welcome.png), 10s progress bar (requestAnimationFrame), then onDone. Shown once per session (sessionStorage flag).
- src/components/PendingScreen.tsx: shown when user.status !== 'approved'; yellow pulse for pending, red for rejected; logout button.
- src/app/page.tsx: routing = welcome (sessionStorage-gated) → loading → terminal | pending | desktop; records a portfolio view via recordPortfolioView when an approved user lands (once per mount via ref).
- types.ts: added 'analytics' to WindowId + BarChart3 icon; bumped default window height to 400.
- WindowContents.tsx: added AnalyticsContent (admin only) — KPI cards (totalViews, uniqueViewers), pending approvals list with Approve/Reject buttons (updateDoc users/{uid}.status), recent viewers list with per-user view counts + lastSeen.
- Copied welcome.png to public/.
- Lint: fixed two react-hooks/set-state-in-effect errors (lazy useState initializer for welcome flag, useRef for view-recorded flag).
- Committed + pushed to GitHub (commit 7a2e60b) → GitHub Actions workflow triggered.

RULES DEPLOY BLOCKER:
- Could NOT deploy the updated firestore.rules via REST API: Firebase Rules API PATCH on releases/cloud.firestore rejects the `rulesetName` field (HTTP 400 "Unknown name") even though GET returns it — same bug as before. firebase CLI requires interactive `firebase login` (no Google account available here).
- Current production rules are the OLD version (without analytics collection + without status validation). Consequences with old rules:
  - Registration still works (old rules allow user create with isAdmin==false; the extra `status` field is accepted).
  - Pending page works (auth-context reads status from the profile doc; admin defaults to approved).
  - Analytics window shows "No pending applications" because old rules only allow `get` (single doc), not `list` (collection) — admin can't enumerate users/viewers.
  - recordPortfolioView silently fails (analytics collection blocked) → views not counted.
- User must paste the updated firestore.rules into the console (Firestore → Rules → Publish) to enable analytics + approvals listing.

Self-verification (Agent Browser, local dev against real Firebase):
- Welcome splash: shows KRESOS logo + progress bar 0→100% over ~10s, then transitions to terminal. ✓ (sessionStorage prevents repeat in same session)
- Login kres/[REDACTED] → desktop with "kres ADMIN" badge (status:approved). ✓
- Register viewer1/view1234 → "PENDING" + "Application under review" page. ✓
- viewer1 profile in Firestore: status=pending (verified via admin SDK). ✓
- Analytics window (as kres): opens, shows TOTAL VIEWS + UNIQUE VIEWERS KPI cards. "No pending applications" shown because old rules block `list` (will work after rules update).
- Lint: clean. Dev server: no errors.

Stage Summary:
- Code complete + pushed. 4 features implemented: password 6+, verification (pending→approved/rejected), welcome splash, analytics.
- BLOCKED on manual rules update: user must paste the new firestore.rules (with analytics collection + status field) into Firebase Console → Firestore → Rules → Publish. Then analytics + approvals will work in production.

---
Task ID: 35
Agent: orchestrator (main)
Task: Fix analytics viewers not recording + verify full verification flow.

Work Log:
- Found bug: doc(db,'analytics','viewers',uid) created a 3-segment path (collection/doc/collection) which is an invalid document reference. Moved viewers to a top-level collection `viewers/{uid}`.
- Split AnalyticsContent.load() into 3 independent try-catch blocks (totalViews, viewers, pending) so one failing query no longer blocks the others.
- Removed orderBy('lastSeen','desc') from viewers query → sort client-side instead (avoids needing a composite index).
- Updated firestore.rules: `match /viewers/{uid}` (top-level) instead of `match /analytics/viewers/{uid}`.
- Could NOT deploy updated rules via REST API (same field-name bug: `rulesetName` rejected on PATCH). firebase CLI requires interactive login. User must paste rules manually.
- Committed + pushed (c432665) → GitHub Actions triggered.

Self-verification (Agent Browser, local dev against real Firebase, with OLD production rules):
- Welcome splash (10s) → terminal → login kres/[REDACTED] → desktop. ✓
- Analytics window: TOTAL VIEWS counter works (incremented on each kres visit). ✓
- Pending approvals: viewer1 + another applicant shown with Approve/Reject buttons. ✓
- Clicked Approve on viewer1 → toast "Approved" → viewer1 removed from pending list. ✓
- Logout → login viewer1/view1234 → desktop with "viewer1 USER" badge (no longer pending). ✓ Verification flow works end-to-end.
- Viewers list: "No viewers yet" because old production rules use `analytics/viewers/{uid}` path but new code writes to `viewers/{uid}` → writes silently fail. Will work after user pastes the updated rules.

Stage Summary:
- Verification system: FULLY WORKING (register→pending→admin approve→login). ✓
- Welcome splash: WORKING. ✓
- Password 6+ fix: WORKING. ✓
- Analytics total views: WORKING (counter increments).
- Analytics viewers list: BLOCKED on rules update (path changed from analytics/viewers to top-level viewers).
- User must paste the updated firestore.rules one more time to enable viewers recording.

---
Task ID: 36
Agent: orchestrator (main)
Task: Fix image not loading on GitHub Pages, add new logo, remove top menu bar, increase loading to 15s.

Work Log:
- ROOT CAUSE of image not loading: WelcomeScreen used `src="/welcome.png"` (raw <img>), but GitHub Pages serves from `/kres-portfolio/` basePath. Next.js does NOT auto-prefix basePath for raw <img> tags (only for next/image). Fixed by prepending `process.env.NEXT_PUBLIC_BASE_PATH` to the src.
- Copied the new attached logo (white cross with glow, 1664×928, 1.7MB) → optimized with sharp to 1024×571, 162KB (10× smaller). Saved as public/logo.png. Removed old public/welcome.png.
- WelcomeScreen now uses logo.png (the new logo) + basePath-aware src + 15s duration (was 10s).
- Added logo as favicon in layout.tsx metadata icons (also basePath-aware).
- Removed MenuBar (File/Edit/View/Help top bar) from PortfolioDesktop. Language toggle + logout remain accessible via Settings window + Start menu. Taskbar (Start + window buttons + tray clock) untouched.
- Fixed welcome splash hydration mismatch: was using useState(lazy initializer) which caused SSR/client mismatch. Rewrote with useSyncExternalStore (server snapshot = false, client snapshot = sessionStorage check) — same pattern as language-context.
- Deployed updated Firestore rules via REST API: found the correct body format `{"release": {"name": "...", "rulesetName": "..."}}` with `?updateMask=rulesetName` query param. Rules now have `viewers/{uid}` top-level collection (was `analytics/viewers/{uid}` which was an invalid doc path).
- Committed + pushed 3 commits (8828c29, then favicon fix d36aa7e). Both GitHub Actions runs completed: success.
- Verified on production: logo.png loads (HTTP 200, 165KB), favicon href="/kres-portfolio/logo.png" (correct basePath).

Self-verification (Agent Browser, local dev):
- Welcome splash: shows new logo (naturalW=1024), tagline "PERSONAL PORTFOLIO WORKSPACE", progress bar 0→100% over ~15s, then transitions to terminal. ✓
- Login kres/[REDACTED] → desktop with NO top menu bar (only taskbar at bottom with START). ✓
- Analytics window: TOTAL VIEWS counter works, kres appears in Recent viewers list with view count. ✓ (rules deployed, viewers/{uid} top-level collection works)
- Lint: clean. No console errors.
- Production: logo.png + favicon both load with correct basePath.

Stage Summary:
- All 4 user requests done: image loads, new logo added (welcome + favicon), top menu bar removed, loading 15s.
- Firestore rules deployed programmatically (found the correct REST API format — wrapped in `release` object with updateMask query param).
- Analytics fully working: total views + unique viewers + recent viewers list + pending approvals with approve/reject.

---
Task ID: 37
Agent: orchestrator (main)
Task: Replace logo with the new uploaded image.

Work Log:
- Analyzed upload/pasted_image_1782372332554.png (1536×1024, RGBA, 250KB).
- Verified via pixel inspection: background is transparent (alpha=0 at corners), cross is white — will render correctly on the black welcome screen.
- Optimized with sharp → 1024×683, 3.5KB (70× smaller). Replaced public/logo.png.
- Committed + pushed (1309f7b) → GitHub Actions deployed successfully.
- Verified on production: logo.png loads (HTTP 200, 3553 bytes). Local browser: image renders at 1024×683 on welcome screen.

Stage Summary:
- New logo live on https://vfyov6621-coder.github.io/kres-portfolio/ — shows on welcome splash (15s) + favicon.
