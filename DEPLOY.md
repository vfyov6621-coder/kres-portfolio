# Deployment Guide

This portfolio ships as a **static Next.js export** (HTML/CSS/JS in `out/`)
hosted on **GitHub Pages**, with **Firebase** (Auth + Firestore) as the
backend. There is no Node server to run in production — every visitor's
browser talks directly to Firebase using the public client config.

This guide walks through the three setup pieces (Firebase, GitHub, local dev)
and lists the caveats worth knowing.

---

## Part A — Firebase setup

### 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Pick a name (e.g. `kres-portfolio`). Disable Google Analytics if you don't
   need it. Click **Create project**.

### 2. Add a Web app and copy the config

1. In the project overview, click the **Web `</>`** icon to register a web app.
2. Give it a nickname, **skip** Firebase Hosting for now, click
   **Register app**.
3. You'll see a `firebaseConfig` block like:

   ```js
   const firebaseConfig = {
     apiKey:            "AIzaSy...-XXXX",
     authDomain:        "kres-portfolio.firebaseapp.com",
     projectId:         "kres-portfolio",
     storageBucket:     "kres-portfolio.appspot.com",
     messagingSenderId: "000000000000",
     appId:             "1:000000000000:web:0000000000000000000000",
   };
   ```

4. These six values map 1:1 to the `NEXT_PUBLIC_FIREBASE_*` env vars the
   build reads:

   | `firebaseConfig` key      | env var                                 |
   | ------------------------- | --------------------------------------- |
   | `apiKey`                  | `NEXT_PUBLIC_FIREBASE_API_KEY`          |
   | `authDomain`              | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`      |
   | `projectId`               | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`       |
   | `storageBucket`           | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`   |
   | `messagingSenderId`       | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId`                   | `NEXT_PUBLIC_FIREBASE_APP_ID`           |

   Keep this tab open — you'll paste these into both your local `.env.local`
   and the GitHub repository secrets later.

### 3. Enable Email/Password Authentication

1. In the console sidebar, open **Build → Authentication → Get started**.
2. Go to the **Sign-in method** tab.
3. Click **Email/Password** → toggle **Enable** → **Save**.

   (Leave **Email link (passwordless)** off. The app synthesizes
   `<username>@portfolio.local` emails, so no email verification is needed
   and no real mailbox is ever contacted.)

### 4. Create Firestore + deploy rules

1. In the sidebar, open **Build → Firestore Database → Create database**.
2. **Start in production mode** and pick a location close to your audience.
3. Deploy the rules from this repo. You have two options:

   **Option A — Firebase CLI (recommended):**

   ```bash
   # one-time login (opens a browser)
   npx firebase login

   # deploy only the rules file (firestore.rules)
   npx firebase deploy --only firestore:rules
   ```

   `firebase.json` already points the CLI at `firestore.rules`, so no extra
   config is needed.

   **Option B — Console paste:**

   Open **Firestore → Rules** in the console, paste the contents of
   [`firestore.rules`](./firestore.rules), and click **Publish**.

The rules let anyone read the `portfolio/{doc}` content (public site) and the
`usernames/{name}` map (used for unique-username checks), require auth to
read/write user profiles, and restrict writes to the portfolio content and
admin operations to users whose profile has `isAdmin: true`.

### 5. Bootstrap the admin account

The portfolio needs one admin (`kres` / `[REDACTED]`) to edit content. Bootstrap
creates that user, sets `isAdmin: true` on their profile, and seeds the
default portfolio document.

1. In the Firebase console, open **Project settings → Service accounts**.
2. Click **Generate new private key** → confirm. A `*.json` file downloads.
3. Save it as `serviceAccount.json` **in the project root**.

   > ⚠️ **Never commit `serviceAccount.json`.** It grants full admin access to
   > your Firebase project. It is already in `.gitignore`, but double-check
   > with `git status` before pushing.

4. Run the bootstrap script with that credential:

   ```bash
   GOOGLE_APPLICATION_CREDENTIAL=./serviceAccount.json bun run bootstrap
   ```

   You should see output confirming the `kres` Auth user was created/reset,
   the `users/kres` profile was created with `isAdmin: true`, and the
   `portfolio/content` document was seeded.

5. **Delete `serviceAccount.json`** from disk when you're done, or leave it
   on a machine you trust. Either way, it is gitignored.

You can re-run `bun run bootstrap` any time to **reset the admin password
back to `[REDACTED]`** and re-seed the default content. To change it to something
else, log in as `kres` and use **Settings → Change password** in the app.

---

## Part B — GitHub repo + Pages

### 1. Push the repo to GitHub

```bash
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

The repo name matters: a project page (`https://<you>.github.io/<repo>/`)
needs `NEXT_PUBLIC_BASE_PATH=/<repo>`; a user/org root repo
(`<you>.github.io`) or a custom domain needs it empty.

### 2. Point Pages at GitHub Actions

In the repo: **Settings → Pages → Build and deployment → Source** →
select **GitHub Actions**.

(You do **not** need to pick a branch — the workflow in
`.github/workflows/deploy.yml` handles everything.)

### 3. Add the Firebase secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**
and add one secret per Firebase config value. The names must match exactly
(case-sensitive):

| Secret name                                | Value                                  |
| ------------------------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | `firebaseConfig.apiKey`                |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | `firebaseConfig.authDomain`            |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | `firebaseConfig.projectId`             |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | `firebaseConfig.storageBucket`         |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `firebaseConfig.messagingSenderId`     |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | `firebaseConfig.appId`                 |

> These values are **public by design** — they end up in the browser bundle
> anyway. Using secrets just keeps them out of the commit history and lets
> you swap Firebase projects later without editing code.

### 4. (Optional) Set the `BASE_PATH` variable

Go to **Settings → Secrets and variables → Actions → Variables** (the
**Variables** tab, not Secrets) → **New repository variable**:

- **Name:** `BASE_PATH`
- **Value:**
  - For a **project page** at `https://<you>.github.io/<repo>/`:
    set `/<repo>` (e.g. `/kres-portfolio`).
  - For a **user/org root** repo (`<you>.github.io`) or a **custom domain**:
    **don't create the variable at all** (or, equivalently, delete it if you
    previously created it). When `BASE_PATH` is unset, GitHub substitutes an
    empty string and the build uses root-relative asset paths.

The workflow reads this via `${{ vars.BASE_PATH }}` — variables (unlike
secrets) may be empty, which is exactly what root/custom-domain deployments
need.

### 5. Push to `main` and watch it deploy

Any push to `main` (or a manual **Run workflow** from the Actions tab)
triggers `.github/workflows/deploy.yml`, which:

1. Installs deps with `bun install --frozen-lockfile`.
2. Builds the static export to `out/` with all the `NEXT_PUBLIC_FIREBASE_*`
   env vars + `NEXT_PUBLIC_BASE_PATH` inlined.
3. Uploads `out/` as a GitHub Pages artifact.
4. Deploys it to GitHub Pages.

The site goes live at `https://<you>.github.io/<repo>/` (or your custom
domain). The deploy job prints the URL.

---

## Part C — Local dev

### Real Firebase project

```bash
cp .env.example .env.local
# then edit .env.local and paste your real Firebase config values
bun run dev
```

Open <http://localhost:3000> in your browser.

### Firebase emulators (no real project needed)

`.env.example` ships with `demo-*` placeholder values and
`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`, so you can run the whole app
locally against the Firebase emulators without a real project.

In one terminal:

```bash
bun run emulators    # auth on :9099, firestore on :8080
```

In another terminal, bootstrap the admin into the emulators (no service
account needed — the emulators accept admin calls with just a projectId):

```bash
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
FIRESTORE_EMULATOR_HOST=localhost:8080 \
bun run bootstrap
```

Then start the dev server:

```bash
bun run dev
```

> The first `bun run bootstrap` against a fresh emulator creates `kres` /
> `[REDACTED]` and seeds the default portfolio content. Re-run it any time you
> wipe the emulator data (`firebase emulators:exec --project kres-portfolio
> 'echo reset'` or simply restart the emulators with `--import`/`--export`).

> **Sandbox note:** if you're previewing this project inside the Z.ai cloud
> sandbox, use the **Preview Panel** on the right (or the **Open in New Tab**
> button above it) instead of `http://localhost:3000` — that port is internal
> to the sandbox and not reachable from your browser. On your own machine,
> `http://localhost:3000` works as usual.

---

## Part D — Notes & caveats

- **Firebase config is public.** All six `firebaseConfig` values are designed
  to be shipped in the client bundle. Your security comes from
  **Firestore rules + Auth**, **not** from hiding the config. The rules in
  `firestore.rules` enforce: only the admin can write portfolio content;
  users can only read/write their own profile; usernames are unique by doc
  id; portfolio content and the username map are publicly readable.

- **Spark (free) tier is enough.** A personal portfolio sees light traffic.
  The Firebase Spark plan covers Auth + Firestore reads/writes well within
  free quotas. Upgrade only if you start hitting daily limits.

- **Live content edits.** Portfolio content lives in the Firestore
  `portfolio/content` document. The admin edits it in-app (Settings → Edit
  Content); changes are written to Firestore and every visitor's browser
  picks them up in real time via `onSnapshot`. A `localStorage` cache
  (`kres_portfolio_content`) is kept for instant first paint before the
  Firestore snapshot resolves.

- **Resetting the admin password.** Two ways:
  1. Re-run `bun run bootstrap` — it resets the `kres` password to `[REDACTED]`
     (and re-seeds default content if the doc is missing — it does **not**
     overwrite existing content otherwise).
  2. Use the in-app **Settings → Change password** while logged in as
     `kres`.

- **`.gitignore` should include** (already added — listed here for
  reference):

  ```gitignore
  .env.local
  serviceAccount.json
  .next/
  out/
  firebase-debug.log
  firestore-debug.log
  ui-debug.log
  *.local
  ```

  If you regenerate a service account key, **delete the old JSON file** from
  the Firebase console (Project settings → Service accounts) after you're
  done — local `gitignore` only prevents committing it; it does not revoke
  the key.

- **Custom domain / HTTPS.** GitHub Pages serves HTTPS by default on
  `*.github.io`. For a custom domain, add it under
  **Settings → Pages → Custom domain** and (if you set `BASE_PATH` for a
  project-site URL earlier) **clear the `BASE_PATH` variable** so the build
  uses root-relative asset paths.
