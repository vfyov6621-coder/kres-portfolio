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
- Created `src/lib/auth.ts`: `hashPassword`, `verifyPassword`, `createSessionToken`, `verifySessionToken`, `ensureAdmin` (idempotent — creates admin `kres` / `190565` if missing), `publicUser`, `SESSION_COOKIE` constant.
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
- Admin seed: username `kres`, password `190565` (created automatically on first API hit).

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
- Admin login (kres / 190565) → desktop loads. Badge shows "kres ADMIN".
- Registration: created user "tester" → desktop loads with "tester USER" badge.
- Unique-login enforcement: re-registering "tester" returns 409 + terminal shows "! username already taken".
- Portfolio desktop: MacOS top menu bar (brand + File/Edit/View/Help + EN/RU toggle + live clock + user dropdown), Win98 taskbar (START + window buttons + tray clock), desktop icons (About/Projects/Skills/Contact/Settings, double-click to open), windows with Win98 beveled borders + MacOS traffic-light buttons (Close/Minimize/Maximize), draggable title bars, z-index focus management, start menu popup.
- Change password: 190565 → testpass123 (success toast "Password changed successfully") → back to 190565 (success). Wrong-current and same-password error paths mapped to localized messages.
- Logout (via user dropdown "Log out" / "Выйти") → returns to terminal boot screen; language preference persists in localStorage.
- Responsive: tested at 390×844 (mobile) — terminal and desktop both render correctly; windows open near-fullscreen with Maximize disabled on narrow screens; 44px touch targets present.

Stage Summary:
- The app is fully functional end-to-end. Admin account kres/190565 always available (self-healing via ensureAdmin). Registration open with unique usernames. Password change works. EN/RU i18n throughout. Terminal style is distinct from the Win98/MacOS desktop. Lint clean.
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
- Login as admin kres/190565 → desktop.
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
