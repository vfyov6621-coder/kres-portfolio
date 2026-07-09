# Telegram Group Chat Integration

This document explains how to connect the portfolio chat to a Telegram group via a bot, so messages from the website appear in Telegram and vice versa.

## Architecture

```
[Website chat] → Firestore (messages/{id})
                        ↑↓
              [Telegram Bot Service]  ← runs 24/7 (Render free tier / Railway / fly.io)
                        ↑↓
                 [Telegram Group]
```

The website chat already stores messages in Firestore (`messages` collection). A small Node.js service (a "bridge") listens to Firestore changes and forwards them to Telegram, and listens to Telegram updates and writes them back to Firestore.

## Why a separate service?

GitHub Pages only hosts **static** files — it cannot run a long-lived process. The Telegram bot needs to be always-on to receive webhook updates from Telegram and to mirror Firestore changes. So the bridge runs on a free hosting provider.

## Step-by-step setup

### 1. Create a Telegram Bot

1. Open Telegram, search for **@BotFather**.
2. Send `/newbot`, choose a name and username (e.g. `KresPortfolioBot`).
3. BotFather gives you an **HTTP API token** — save it (keep secret).
4. Send `/setprivacy`, choose your bot, select **Disable** (so the bot can read all group messages).

### 2. Create a Telegram group and add the bot

1. Create a new Telegram group (or use an existing one).
2. Add the bot to the group as a **member**.
3. Make the bot an **admin** of the group (so it can post messages).

### 3. Get the group chat ID

1. Post any message in the group.
2. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser (replace `<TOKEN>`).
3. Find `"chat":{"id": -100xxxxxxxxxx}` in the response — that's your **group chat ID** (a negative number starting with `-100`).

### 4. Deploy the bridge service

The bridge code is in `mini-services/tg-bridge/`. Deploy it to a free host:

**Option A — Render (free tier):**
1. Push the `mini-services/tg-bridge/` folder to a separate GitHub repo (or a subfolder of this repo).
2. On Render: New → Web Service → connect the repo.
3. Set environment variables:
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `TELEGRAM_CHAT_ID` = the group chat ID (e.g. `-1001234567890`)
   - `FIREBASE_PROJECT_ID` = `kres-portfolio`
   - `FIREBASE_CLIENT_EMAIL` = the service account email (from `serviceAccount.json`)
   - `FIREBASE_PRIVATE_KEY` = the private key (from `serviceAccount.json`, keep the `\n` as literal)
4. Deploy. The service stays alive on Render free tier (sleeps after 15 min idle — upgrade to paid for always-on).

**Option B — fly.io / Railway:** similar process, set the same env vars.

### 5. Test

1. Send a message in the website chat → it should appear in the Telegram group within ~1 second.
2. Send a message in the Telegram group → it should appear in the website chat (as a message from "Telegram: <username>").

## Notes

- The bridge only mirrors **new** messages (it doesn't sync history).
- Messages in the website chat auto-clear at 00:00 MSK; Telegram messages stay forever (by design).
- The 30-second cooldown applies only to the website chat, not to Telegram.
- If the bridge goes offline, messages sent during the downtime are NOT backfilled (only new writes are forwarded). For reliability, upgrade the bridge host to a paid tier.

## Bridge service code

See `mini-services/tg-bridge/` for the full implementation (Node.js + firebase-admin + node-telegram-bot-api).
