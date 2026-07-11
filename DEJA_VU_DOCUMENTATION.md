# Déjà Vu — Technical Documentation

**Tagline:** *The memory that finds you before you ask.*

A tiny desktop tray app that silently watches your clipboard and surfaces relevant memories — powered by Supermemory (local, self-hosted).

---

## 1. Table of Contents

1. Problem & Concept
2. Core Features
3. System Architecture
4. Tech Stack
5. Mascot UI — Design System
6. Frontend (Electron windows + optional web dashboard)
7. Backend / Main Process
8. Supermemory Local — Setup & Integration
9. Similarity Threshold Logic (the core "magic")
10. Clipboard Watcher
11. Notification System
12. Deployment — Vercel + Electron Distribution
13. Environment Variables
14. Folder Structure
15. Setup Instructions (for judges/testers)
16. Demo Script
17. Known Limitations & Roadmap

---

## 2. Problem & Concept

People capture good information constantly — a fix for a bug, a note about a client, a lesson from a conversation — but it dies in a notes app nobody reopens. Search requires remembering that you have something to search for in the first place. That's the real failure: **recall is passive, search is active.**

Déjà Vu flips this. You save a thought in 5 seconds. Later, whenever you copy something on your machine (a name, an error, a topic), it silently checks whether that thing connects to something you already know — and if it does, a small notification tells you. You never search. The memory finds you.

Two loops:
- **Write loop:** tray → quick-input popup → save → done.
- **Recall loop:** copy anything → background match against memory → notification if relevant.

---

## 3. Core Features

| Feature | Behavior |
|---|---|
| Quick capture | Global hotkey or tray click opens a frameless popup, type, hit Enter, gone |
| Clipboard watcher | Polls clipboard every 1–2s, detects new copy events |
| Memory match | Every new clipboard value is checked against Supermemory via semantic search |
| Threshold gating | Only fires a notification above a similarity score — silence is the default state |
| Native notification | OS-level notification with the matched memory's summary |
| Local-first | Supermemory runs fully on-device via `supermemory local` — no cloud dependency for the core loop |
| Mascot UI | A small character-driven visual identity instead of generic system-tray blandness |

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                  Electron Main Process                  │
│                                                          │
│   ┌─────────────┐        ┌────────────────────────┐   │
│   │  Tray Icon    │──────▶│ Quick-Add Popup Window │   │
│   │  + Menu       │       │ (BrowserWindow, small)  │   │
│   └─────────────┘        └───────────┬────────────┘   │
│                                        │ IPC             │
│   ┌─────────────────────┐             ▼                │
│   │ Clipboard Watcher     │    ┌──────────────┐        │
│   │ setInterval(1-2s)     │    │ Supermemory   │        │
│   │ diff vs last value    │───▶│ Client Wrapper│        │
│   └─────────────────────┘    └──────┬───────┘        │
│                                       │                 │
│                                       ▼                 │
│                          ┌────────────────────┐        │
│                          │ Similarity Filter   │        │
│                          │ (score > threshold) │        │
│                          └──────────┬─────────┘        │
│                                     ▼                   │
│                          ┌────────────────────┐        │
│                          │ OS Notification     │        │
│                          └────────────────────┘        │
└──────────────────────┬───────────────────────────────┘
                        │ HTTP (localhost:6767)
                        ▼
        ┌───────────────────────────────┐
        │  Supermemory Local (self-host) │
        │  npx supermemory local          │
        │  Memory Engine + Vector Search   │
        └───────────────────────────────┘

  Optional companion (for judges to view saved memories in a browser):
        ┌───────────────────────────────┐
        │  Web Dashboard (Next.js)        │
        │  Deployed on Vercel              │
        │  Talks to Supermemory HOSTED     │
        │  platform (not local) for demo   │
        └───────────────────────────────┘
```

**Important architectural note on "local + Vercel":**
Vercel's serverless functions run in the cloud, not on the judge's or your laptop. They physically cannot reach `localhost:6767` on your machine unless you tunnel it. This project uses an **ngrok bridge** (see §12.3) to connect the two — this means your laptop must stay awake and both `supermemory local` and `ngrok` must stay running for the entire judging window, since the dashboard goes dark the moment either process stops.

---

## 5. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Desktop shell | Electron (Node.js + Chromium) | Native tray, clipboard, notifications, cross-platform, JS-native |
| Language | TypeScript | Type safety across main + renderer |
| Memory engine | Supermemory (self-hosted, `supermemory local`) | Zero-config vector search + memory graph, single binary |
| Web dashboard (optional) | Next.js 14 (App Router) | Matches your existing stack, deploys natively to Vercel |
| Styling | Tailwind CSS | Fast iteration for mascot UI states |
| Packaging | `electron-builder` | Produces `.exe` / `.dmg` / `.AppImage` installers |
| Deployment (web dashboard only) | Vercel | Zero-config Next.js hosting |
| Notifications | Electron `Notification` API | Native OS notifications, no extra deps |

---

## 6. Mascot UI — Design System

The mascot is the entire personality of an otherwise invisible background app. It needs to carry emotional weight in very few pixels (tray icon is ~16-32px).

**Mascot states (design these as a small sprite set, 4-6 states):**

| State | Trigger | Visual |
|---|---|---|
| Idle | Default, watching | Calm, eyes half-open, neutral |
| Listening | Clipboard just changed, checking | Ears/antennae perked, subtle pulse animation |
| Recall (match found) | Notification about to fire | Eyes wide open, little "!" or lightbulb |
| No match | Checked, nothing relevant | Quick blink back to idle — no visible change to user, this is internal only |
| Saving | Quick-add popup open | Mascot holding a pencil/notepad pose |
| Saved | Just saved a thought | Happy/wink pose, then fades to idle |

**Design tokens:**
- Keep the palette to 2-3 colors max + one accent for "match found" (this accent color is the single most important color in the whole app — it's what makes a notification feel like a small delightful surprise instead of a system alert)
- Tray icon should be a simplified, single-color (template icon) version of the mascot's idle face so it works on both light and dark OS menu bars
- Popup window (quick-add) and notification body should reuse the mascot as a small avatar (24-32px) next to the text, not as a full illustration — keep chrome minimal since this is a 5-second interaction
- Motion: a single subtle bounce/blink on state transitions is enough. Avoid looping idle animations in the tray — they're distracting and burn CPU

**Reference for building this out:** if you build the optional dashboard in React, use the `frontend-design` conventions (custom type scale, no default shadcn look, intentional color choices) rather than default Tailwind grays — the mascot deserves a backdrop that doesn't look like a generic admin panel.

---

## 7. Frontend

### 7.1 Quick-Add Popup (Electron `BrowserWindow`)
- Frameless, always-on-top, ~420×120px, appears centered or near tray
- Single `<textarea>`, autofocus, `Enter` submits, `Esc` closes
- On submit: IPC message to main process → `supermemory.add()` → close window → fire "Saved" notification with mascot avatar

```html
<!-- quickAdd.html (simplified) -->
<body>
  <img src="mascot-writing.svg" width="32" />
  <textarea id="thought" placeholder="What's on your mind?" autofocus></textarea>
  <script>
    document.getElementById('thought').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.electronAPI.saveThought(e.target.value);
      }
      if (e.key === 'Escape') window.electronAPI.closePopup();
    });
  </script>
</body>
```

### 7.2 Optional Web Dashboard (Next.js, deployed to Vercel)
Read-only view of saved memories, for demo purposes and for judges who can't run your Electron app locally.

- `app/page.tsx` — list of memories (fetched from Supermemory **hosted** API)
- `app/api/memories/route.ts` — server route that calls Supermemory's hosted REST API with your API key (never expose the key client-side)
- Simple search bar that hits `/v3/search` server-side and renders results with the mascot as empty-state art

---

## 8. Backend / Main Process

`main.js` responsibilities:
1. Create tray icon + context menu (Open quick-add, Pause watching, Quit)
2. Start clipboard watcher on app ready
3. Own the Supermemory client instance
4. Handle IPC from quick-add popup
5. Fire notifications

```js
// main.js (core skeleton)
const { app, Tray, Menu, BrowserWindow, clipboard, Notification, ipcMain } = require('electron');
const { addMemory, searchMemory } = require('./supermemory');

let lastClipboard = '';
let tray;

function startClipboardWatcher() {
  setInterval(async () => {
    const current = clipboard.readText().trim();
    if (!current || current === lastClipboard) return;
    lastClipboard = current;

    // skip trivial copies
    if (current.length < 4 || /^\d+$/.test(current)) return;

    const match = await searchMemory(current);
    if (match && match.score >= 0.75) { // similarity threshold
      new Notification({
        title: 'Déjà Vu',
        body: match.summary,
        icon: 'assets/mascot-recall.png',
      }).show();
    }
  }, 1500);
}

ipcMain.handle('save-thought', async (_event, text) => {
  await addMemory(text);
  new Notification({ title: 'Déjà Vu', body: 'Saved ✓' }).show();
});

app.whenReady().then(() => {
  tray = new Tray('assets/mascot-idle-template.png');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Save a thought', click: openQuickAdd },
    { label: 'Pause watching', type: 'checkbox' },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  startClipboardWatcher();
});
```

---

## 9. Supermemory Local — Setup & Integration

### 9.1 Install & run locally
```bash
npx supermemory local
```
This starts a self-hosted single-binary instance at `http://localhost:6767` and prints an API key on first boot — save it.

### 9.2 Install SDK
```bash
npm install supermemory
```

### 9.3 Client wrapper
```js
// supermemory.js
const Supermemory = require('supermemory').default;

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY,
  baseURL: process.env.SUPERMEMORY_API_URL || 'http://localhost:6767',
});

const CONTAINER_TAG = 'deja-vu-local-user';

async function addMemory(text) {
  return client.memories.add({
    content: text,
    containerTag: CONTAINER_TAG,
  });
}

async function searchMemory(query) {
  const results = await client.search.memories({
    q: query,
    containerTag: CONTAINER_TAG,
    limit: 1,
  });
  if (!results?.results?.length) return null;
  const top = results.results[0];
  return { summary: top.memory ?? top.content, score: top.score };
}

module.exports = { addMemory, searchMemory };
```

Same API shape locally and on the hosted platform — only `baseURL` changes. This is what lets you demo locally and still have a hosted dashboard without rewriting integration code.

---

## 10. Similarity Threshold Logic (the core "magic")

This is the single most important tuning knob in the whole project — get it wrong and the app is either silent (useless) or spammy (annoying, gets uninstalled).

**Two-stage filter, cheapest check first:**

1. **Pre-filter (before even calling the API):**
   - Skip copies under ~4 characters
   - Skip pure numbers, pure whitespace, and URLs you've just copied from your own app (avoid feedback loops)
   - Skip if identical to the last 1-2 clipboard values already checked

2. **Score threshold (after search call):**
   - Supermemory's `/v3/search` (or SDK `search.memories`) returns a relevance/similarity score per result
   - Start at **0.75** as a baseline threshold and tune live during testing — too low (e.g. 0.5) surfaces loosely-related noise, too high (e.g. 0.9) misses paraphrased matches
   - Log scores during your own testing (console.log the score before you gate on it) so you can pick a real number from your own data rather than guessing

```js
if (match && match.score >= 0.75) {
  // fire notification
}
```

Consider a short debounce/cooldown too (e.g. don't notify more than once per 10 seconds) so rapid successive copies don't trigger a notification storm.

---

## 11. Notification System

- Use Electron's native `Notification` API — cross-platform, no extra dependency
- Keep the body text to one line: the memory's summary, not the full saved content
- Icon = mascot "recall" state avatar, so even the OS notification carries the mascot identity
- Clicking the notification (optional, nice touch) can open the quick-add popup pre-filled with "related to: …" so the user can add more context on the spot

---

## 12. Deployment

### 12.1 The Electron app itself (the actual product)
This is **not** deployed to Vercel — it's packaged into an installer and distributed as a download.

```bash
npm install --save-dev electron-builder
```

`package.json`:
```json
{
  "build": {
    "appId": "com.anurag.dejavu",
    "mac": { "target": "dmg" },
    "win": { "target": "nsis" },
    "linux": { "target": "AppImage" }
  },
  "scripts": {
    "dist": "electron-builder"
  }
}
```
```bash
npm run dist
```
Output lands in `dist/` — upload the installer(s) to your hackathon submission (GitHub release, or a direct link) since Vercel cannot host desktop binaries as a "deployment" in the traditional sense — at most it can host a download link/landing page.

### 12.2 Web dashboard (optional, deploy to Vercel)
```bash
npx create-next-app@latest deja-vu-web
cd deja-vu-web
vercel
```
- Set environment variables in the Vercel project settings (not `.env` committed to git):
  - `SUPERMEMORY_API_KEY` — your **hosted platform** key (from console.supermemory.ai), not the local one
  - `SUPERMEMORY_API_URL` — leave unset to default to the hosted platform's base URL
- Server route (`app/api/memories/route.ts`) calls Supermemory hosted API server-side, so the API key never reaches the browser
- This dashboard exists purely so judges without your installer can see the concept working — it is not required for the core product to function

### 12.3 Why local Supermemory and Vercel don't talk directly
Reiterating clearly since this trips people up: `supermemory local` binds to `localhost:6767` on whichever machine runs it. Vercel's servers are remote and have no route to your laptop's localhost unless you explicitly tunnel it (ngrok/cloudflared) — and that tunnel is only alive while your machine + the tunnel process are running. For a hackathon submission that needs to work after you've gone to sleep, use the hosted API key for anything deployed on Vercel, and keep local mode as the live/demo-video part of the story.

---

## 13. Environment Variables

**Electron app (`.env`, not committed):**
```
SUPERMEMORY_API_KEY=sm_local_xxxxxxxx
SUPERMEMORY_API_URL=http://localhost:6767
```

**Vercel project (dashboard, set in Vercel settings UI):**
```
SUPERMEMORY_API_KEY=sm_xxxxxxxx     # hosted platform key, from console.supermemory.ai
```

---

## 14. Folder Structure

```
deja-vu/
├── electron-app/
│   ├── main.js              # tray, clipboard watcher, IPC, notifications
│   ├── preload.js           # exposes safe IPC bridge to popup window
│   ├── quickAdd.html        # quick-capture popup UI
│   ├── supermemory.js       # Supermemory client wrapper (add/search)
│   ├── assets/
│   │   ├── mascot-idle-template.png
│   │   ├── mascot-listening.png
│   │   ├── mascot-recall.png
│   │   └── mascot-writing.png
│   ├── package.json
│   └── .env
│
└── web-dashboard/            # optional, deployed to Vercel
    ├── app/
    │   ├── page.tsx
    │   └── api/memories/route.ts
    ├── tailwind.config.ts
    └── package.json
```

---

## 15. Setup Instructions (for judges/testers)

**Running the desktop app locally:**
```bash
git clone <your-repo>
cd deja-vu/electron-app
npm install
npx supermemory local          # run this once, keep terminal open, copy printed API key
# paste the API key into .env as SUPERMEMORY_API_KEY
npm start
```
The mascot appears in the system tray. Click it to save a thought. Copy any text on your machine to trigger a recall check.

**Viewing the web dashboard:**
Just visit the deployed Vercel URL — no setup needed on the judge's end.

---

## 16. Demo Script (for the hackathon pitch)

1. Open with the problem: "You've told your AI/notes app something useful once, then never see it again."
2. Show the tray icon — mascot idle.
3. Save a thought: "This client hates the color blue." — 5 seconds, done.
4. Copy the client's name from an unrelated window (email, doc, anywhere).
5. Notification pops: mascot recall pose + "This client hates blue colors."
6. Second beat: copy an old error message → notification surfaces the fix from 2 months ago.
7. Close with the line: "You don't search. You don't ask. The memory finds you." — then briefly show the Vercel dashboard as the "here's what it looks like under the hood" view.

---

## 17. Known Limitations & Roadmap

**Current limitations:**
- Polling-based clipboard watch (1-2s delay, not instant)
- Similarity threshold is a static number — no per-user calibration yet
- Local mode is single-device; no sync across machines without the hosted platform
- No image/screenshot clipboard support yet (text only)

**Roadmap ideas (good for a "future work" slide):**
- Let the user thumbs-down a bad match to auto-tune their personal threshold over time
- Support pasting screenshots/images into memory (Supermemory supports OCR on images)
- Add a "context" mode: right-click a saved memory to see everything related to it (memory graph view)
- Optional sync between local instance and hosted platform for multi-device users
