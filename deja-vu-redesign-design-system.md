# Déjà Vu — Redesign Design System
### Reference: Surfyy (surfyy.maazx.dev / github.com/somewherelostt/surfyy)
### Scope: Web app + Electron tray app · UI/UX only, zero logic changes

---

## 0. What this document is

This is the full visual redesign spec for Déjà Vu, translating Surfyy's **"dark premium operator"** aesthetic onto Déjà Vu's existing IA (landing → features → FAQ → save-a-thought → memory feed), while **keeping the mascot** as Déjà Vu's signature element.

One honest note up front: Surfyy's own `brand.md` explicitly says *"avoid... mascots."* Surfyy's identity is built around utility-icon minimalism instead. Since you want to keep the mascot, the move is: **adopt Surfyy's entire material language (color, type, spacing, motion, glass, glow) and demote the mascot from "cute illustrated hero" to "premium glowing companion."** Same creature, shot like a product render instead of an illustration — smaller, more consistently placed, sitting inside glass panels rather than floating loosely over cream backgrounds. That's what makes the mascot feel like it belongs in an operator-grade dark UI instead of clashing with it.

Everything below was extracted directly from Surfyy's shipped `styles.css` and `brand.md` — these are real production values, not guesses.

---

## 1. Design Philosophy

- **From:** cream/parchment editorial site, serif display type, soft pastel cards, light mode only.
- **To:** near-black canvas, warm orange glow accents, glass panels, tight bold sans headlines, dark-mode-first.
- Product should feel like **a quiet, fast utility that watches your clipboard** — not a SaaS marketing page. Confidence over cuteness; the mascot provides warmth, the material provides credibility.
- Avoid: purple AI gradients, generic rounded-blob illustrations, drop shadows that look like Bootstrap defaults, light-only chrome.

---

## 2. Color Palette

Use these as CSS custom properties (`:root`), exactly as Surfyy defines them:

```css
:root {
  color-scheme: dark;

  /* Surfaces */
  --bg: #080504;              /* app background, near-black */
  --panel: #111111;           /* raised panel */
  --panel-soft: #171717;      /* secondary panel */
  --surface: #121212;         /* card surface */
  --surface-raised: #191919;  /* elevated card */

  /* Lines */
  --line: rgba(255, 255, 255, 0.10);
  --line-strong: rgba(255, 255, 255, 0.18);

  /* Text */
  --text: #f8f4ee;            /* warm white, primary text */
  --muted: #a7a7a7;           /* secondary text */
  --muted-strong: #d9d0c7;    /* tertiary emphasis text */

  /* Brand accent */
  --accent: #ff6d29;          /* branding orange */
  --accent-hot: #ff4502;      /* hot orange, CTA gradients */
  --accent-soft: #ffc09e;     /* soft orange highlight, labels/tags */
  --accent-ink: #160804;      /* text-on-accent (dark ink over orange buttons) */

  /* Status */
  --danger: #ff8f8f;
  --warn: #f7c96b;
  --success: #87dd9a;          /* used for "done" states */

  --radius: 18px;              /* base corner radius */
}
```

**Light-surface variant** (only if you need a light panel inside the dark shell — e.g. a code/quote block): `#F5F5F1`.

### Usage rules
- Background is **never pure black** — always `#080504` or the radial-gradient treatments below.
- Orange is a **highlight, not a fill**. Reserve solid orange for primary CTA buttons and the mascot's own glow; everything else uses orange at low opacity (6–18%) for tints, borders, and backgrounds.
- Text hierarchy: `--text` for headings/primary copy, `--muted-strong` for secondary UI copy (card values, timestamps), `--muted` for tertiary/meta (labels, captions).

---

## 3. Typography

```css
font-family: "Geist", "Satoshi", "Neue Montreal", "Inter Variable",
             "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
font-synthesis: none;
text-rendering: optimizeLegibility;
```

Load **Geist** (or Inter Variable as the free fallback) via `@font-face`/Google Fonts/self-hosted — this replaces your current serif display font entirely. No serif anywhere in the redesign; Surfyy's whole point is tight, bold, controlled sans type.

### Type scale (from real Surfyy values)

| Role | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| Hero H1 (landing) | `clamp(44px, 5.15vw, 74px)` | 850 | -0.045em | 0.92 |
| Card/Auth H1 | 35px | 840 | -0.04em | 0.98 |
| Section heading | 24px | 750 | 0 | 1.1 |
| Body / intro paragraph | 17px | 400 | normal | 1.55 |
| Card body copy | 14px | 400 | normal | 1.5 |
| UI label (uppercase eyebrow) | 12–13px | 760–800 | 0.08–0.13em | 1.2 |
| Micro label (tags, meta) | 10–11px | 800 | 0.08em | 1.2, uppercase |
| Button label | 14px | 720–820 | normal | 1 |

**Rule of thumb:** headlines are heavy (750–850 weight) and tight (negative tracking); everything functional (labels, tags, meta) is small, bold, and wide-tracked uppercase. Body copy sits at a relaxed 1.5–1.55 line-height so it doesn't feel cramped against all the bold UI chrome around it.

---

## 4. Spacing, Radius & Grid

- **Base corner radius:** `18px` for cards/panels; `14–16px` for buttons and inputs; `999px` (pill) for tags, badges, avatars, status chips, and small round icon buttons.
- **Large hero panels / auth cards:** `22–28px` radius.
- **Padding rhythm:** panels 16–34px depending on size; buttons min-height 44–54px; small round icon buttons 40–44px square.
- **Gaps:** 8–16px between related items in a card; 12–20px between distinct UI blocks.
- Content width: cap hero/section copy at `~570–720px` max-width so lines don't run edge-to-edge on wide screens.

---

## 5. Elevation, Glass & Glow

This is the signature Surfyy texture — reproduce it faithfully:

```css
/* Standard raised card */
.card {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.022)), #121110;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

/* Glass panel (auth card, modal, save-a-thought panel) */
.glass-panel {
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(36,32,29,0.84), rgba(22,19,22,0.78)), rgba(8,5,4,0.7);
  box-shadow: 0 34px 96px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.07);
  backdrop-filter: blur(22px);
}

/* Ambient orange glow behind hero / brand panels */
.brand-panel {
  background:
    radial-gradient(circle at 35% 100%, rgba(255,69,2,0.34), transparent 34%),
    radial-gradient(circle at 72% 20%, rgba(255,109,41,0.14), transparent 30%),
    linear-gradient(145deg, rgba(36,32,29,0.78), rgba(8,5,4,0.96));
}

/* Fine dot/grid texture on canvas backgrounds (optional, for feed/dashboard views) */
.canvas-bg {
  background:
    radial-gradient(circle at 34px 34px, rgba(255,255,255,0.18) 1.3px, transparent 1.4px),
    #201e1c;
  background-size: 48px 48px;
}
```

**Button shadow (primary CTA):**
```css
.btn-primary {
  background: linear-gradient(180deg, #ff8b4d, var(--accent-hot));
  color: var(--accent-ink);
  box-shadow: 0 18px 42px rgba(255,69,2,0.25);
  transition: transform 160ms ease, box-shadow 180ms ease;
}
.btn-primary:hover { box-shadow: 0 20px 52px rgba(255,69,2,0.34); }
.btn-primary:active { transform: scale(0.98); }
```

Rule: **every interactive surface gets a soft dark drop shadow** (`0 12–34px, rgba(0,0,0,0.22–0.42)`), and every **orange** surface additionally gets an **orange-tinted glow shadow** (`rgba(255,69,2,0.2–0.34)`). Glass surfaces always pair `backdrop-filter: blur(14–22px)` with a translucent gradient background — never a flat semi-transparent fill alone.

---

## 6. Motion

Straight from `brand.md` + real keyframes:

**Principles**
- Slow orange glow drift (ambient, background-only, never distracting).
- Subtle node/card pulse — small vertical lift + border-color shift, not scale-bounce.
- Short ease-out entrances for anything appearing (cards, modals, panels).
- Buttons **press** to `scale(0.98)` on active — never scale up on hover, only shadow intensifies.
- Always respect `prefers-reduced-motion: no-preference` — wrap all decorative motion in that media query so it's skippable.

**Reusable keyframes:**
```css
@keyframes panelEnter {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
/* apply: animation: panelEnter 460ms cubic-bezier(0.16, 1, 0.3, 1) both; */

@keyframes glowDrift {
  from { transform: translate3d(-3%, 0, 0) scale(1); }
  to   { transform: translate3d(4%, -3%, 0) scale(1.08); }
}
/* apply to ambient glow blobs, 8s ease-in-out infinite alternate */

@keyframes chipPulse {
  0%, 100% { transform: translateY(0); border-color: rgba(255,255,255,0.11); }
  50%      { transform: translateY(-3px); border-color: rgba(255,109,41,0.35); }
}
/* apply to floating tag/node chips, 3.8s ease-in-out infinite, stagger children +600-700ms */

@keyframes pulseSoft {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
/* apply to "recording/watching" live-status dots, 1.3s ease-in-out infinite */

@keyframes spin {
  to { transform: rotate(360deg); }
}
/* apply to loading spinners, 900ms linear infinite */
```

**Where to apply in Déjà Vu specifically:**
- The mascot's idle state gets a very slow (6–8s) breathing drift — same math as `glowDrift`, applied to a glow layer sitting *behind* the mascot artwork, not the mascot itself scaling.
- The "Watching" pill (currently orange with a dot) → dot uses `pulseSoft`.
- Memory cards entering the feed → `panelEnter`, staggered 40–60ms per card.
- Tag chips on the "Copy something" try-it strip → `chipPulse` on hover only, not idle.

---

## 7. Component Specifications

### 7.1 Navbar
- Fixed/sticky, height ~64–76px.
- Background: `linear-gradient(180deg, rgba(24,21,19,0.97), rgba(24,21,19,0.82)), rgba(8,5,4,0.8)` with `border-bottom: 1px solid rgba(255,255,255,0.07)`.
- Left: mascot mark in a 44–48px rounded-square badge (`border-radius: 14–17px`, dark gradient fill, orange radial glow at the bottom edge only) + "Déjà Vu" wordmark, 18px, weight 780–820.
- Right: search pill (`border-radius: 999px`, subtle border, `⌘K` kbd hint in a small rounded chip) + theme toggle icon button (44px round, dark gradient, hover → orange border).
- No large nav-link list needed (matches your current minimal navbar) — keep it sparse.

### 7.2 Hero / Landing Header
- Eyebrow label: small orange-soft uppercase pill or plain text, wide tracking, e.g. "YOUR PERSONAL MEMORY ASSISTANT."
- H1: the big bold tight headline, orange used as an inline color swap on 1-2 words (mirrors your current "finds you" orange treatment — keep that, it already matches Surfyy's pattern of coloring the key verb/phrase in copy).
- Sub-copy: 17px, `rgba(248,244,238,0.7)`, max-width ~570px.
- Mascot sits to the right, inside a soft radial glow, on a transparent or very subtle dotted-grid backdrop — not a bright cream card.
- Stat pills row (8 memories / 0 recalls / top tag / streak): convert to dark glass pills — `border-radius: 999px` or 16px, `background: rgba(255,255,255,0.035)`, icon in a small circular badge, value in `--text` bold, label in `--muted` uppercase micro-caption.

### 7.3 Save-a-Thought Card (core interaction)
- This becomes a `.glass-panel` (see §5): 24px radius, blurred glass background, orange-tinted top border accent (you can keep the thin orange top edge you currently have — it works, just move it onto the dark glass surface).
- "Watching" status pill top-right: pill, `background: rgba(255,109,41,0.14)`, text `--accent-soft`, dot with `pulseSoft`.
- Textarea: dark input field, `background: rgba(8,5,4,0.62)`, `border: 1px solid rgba(255,255,255,0.09)`, focus state → orange border + `box-shadow: 0 0 0 4px rgba(255,109,41,0.12)` (exact Surfyy focus ring, reuse everywhere text inputs appear).
- Save button: primary orange gradient CTA (§5 button spec).
- Kbd hints ("Enter to save," "Shift+Enter newline"): small muted pill-style `<kbd>` chips, `background: rgba(255,255,255,0.07)`.

### 7.4 Feature Cards (Local-first / Smart Recall / Tag System)
- 3-column grid, each card: `.card` styling from §5, 16px radius, icon in a 40–44px rounded-square badge (soft gray-orange gradient), bold 16–18px title, 14px muted body copy.
- On hover: border shifts to `rgba(255,109,41,0.3-0.4)`, subtle lift via existing hover shadow pattern — no scale transform on the whole card, just border/shadow.

### 7.5 "How it works" step blocks (01 / 02 / 03)
- Big faint numeral (`01`, `02`, `03`) in `--line-strong`/very low-opacity text, oversized serif-free bold numeral — this replaces the current thin serif numeral with a bold sans one at ~15–20% opacity of `--text`.
- Step title in the bold heading style, body copy in muted 14–15px.
- The paired preview card (e.g. "Your thought is saved locally") becomes a `.card` with two stacked pill-style memory previews inside, each a rounded rect with `--surface` background.

### 7.6 Try-It / Copy Interaction Card
- Textarea styled like §7.3.
- "TRY ONE" suggestion chips: pill buttons, `border-radius: 999px`, `background: rgba(255,255,255,0.06)`, hover → orange-tinted border + `chipPulse` on hover.
- "WATCHING" badge stays as an orange pill top-right of the mascot, same treatment as §7.3.

### 7.7 Memory Notification Toast ("Memory finds you")
- Floating card, `.glass-panel`-lite (16–20px radius, blur 14px, dark background, `box-shadow: 0 28px 80px rgba(0,0,0,0.44)`).
- Top row: mascot micro-avatar (28–32px) + "DÉJÀ VU" label + similarity score badge (`0.87`) as a small orange pill.
- Body: 1-line memory preview, bold, `--text`.
- Footer: `triggered by: "..."` in `--muted`, 12px, monospace-ish or regular — a quiet trust signal, keep it as-is stylistically but recolor to muted gray on dark.
- Animate in with `panelEnter`.

### 7.8 Memory Feed / "Your Memories" Page
- Search bar: full-width pill or 12–14px-radius input, dark background, same focus-ring treatment as §7.3.
- Tag filter row: pill buttons (`you / life / code / team / clients`), inactive = `background: rgba(255,255,255,0.055)`, `color: --muted-strong`; active = `background: rgba(255,109,41,0.14)`, `color: --accent-soft`, subtle border.
- Memory cards grid (2-column on desktop): each card is a `.card` (16px radius, gradient surface, inset top highlight), with:
  - top row: category tag pill (small, colored per category — reuse the muted/orange system, don't introduce a rainbow of tag colors; keep 1 accent + neutrals) + timestamp (`--muted`, 11–12px) + hover-revealed edit/delete icons (ghost icon buttons, 32px, appear on card hover only).
  - body: memory text, 14–15px, `--text`/`--muted-strong`.
- Card entrance: staggered `panelEnter`.

### 7.9 FAQ Accordion
- Each row: full-width, `border-bottom: 1px solid var(--line)`, question in `--text` medium weight, chevron icon rotates 180° on open (`transition: transform 200ms ease`).
- Expanded content: `--muted-strong`, 14px, generous top padding (12–16px) before the answer text, smooth height transition (`grid-template-rows: 0fr → 1fr` trick, or a simple max-height transition ~250ms ease).
- No card background needed here — keep it a flat list on the dark canvas, matches Surfyy's restraint (not everything needs to be a glass card).

### 7.10 Footer
- Simple flex row, mascot micro-mark + wordmark left, "Built with care, stored locally" + GitHub icon right, all in `--muted`, 12–13px, sitting on a `border-top: 1px solid var(--line)`.

---

## 8. Page-by-Page Notes

### Landing (Web)
1. Navbar (§7.1)
2. Hero with mascot + stat pills (§7.2)
3. Save-a-thought interactive demo card (§7.3)
4. "Two loops, zero friction" — steps 01 + 02 (§7.5) with the "Copy something" try-it card (§7.6)
5. Step 03 "Memory finds you" toast demo (§7.7) directly beside/above the live memory feed preview (§7.8, condensed — maybe 4-6 cards, "view all" CTA)
6. Features grid (§7.4)
7. FAQ (§7.9)
8. Footer (§7.10)

### All Memories Page (Web)
- Full §7.8 treatment: search + tag filters + full grid, no hero.

### Electron Tray App
- Same component language, but compressed: tray popover is small, so
  - Skip the big hero/marketing sections entirely — tray app opens directly to the **save-a-thought card** (§7.3) as the primary view, or a compact **memory feed** (§7.8) as a secondary tab/view.
  - Reduce paddings roughly 20-30% versus web (e.g. 16px card padding instead of 24-34px) since the tray window is small.
  - Keep the same dark background, glass card, orange glow, and motion — this is what makes it feel like the same product as the web app.
  - Window chrome: since Electron gives you a frameless/native-feel window, keep corners rounded (16-20px) and add the same ambient orange radial glow at one corner of the tray popover for brand continuity.

---

## 9. What NOT to touch

Purely cosmetic redesign. Do not modify:
- IndexedDB schema, storage logic, or data models
- Clipboard-watching / recall-trigger logic
- Similarity/recall scoring algorithm
- Tag filtering logic, search logic
- Electron main/preload process code, IPC bridges
- Any routing, state management, or data-fetching logic

Only touch: CSS/styling files, className structures where needed for new layout, and component JSX/TSX markup structure where a new visual layout requires reordering elements (not changing what data they render or how).

---

## 10. Implementation Checklist

- [ ] Add Geist/Inter Variable font, remove serif font entirely
- [ ] Set up CSS variables from §2 in `:root` (dark mode as default, no light mode toggle needed unless you want to keep it — if kept, invert to the "Light surface `#F5F5F1`" token as the light-mode bg)
- [ ] Rebuild navbar per §7.1
- [ ] Rebuild hero + stat pills per §7.2
- [ ] Rebuild save-a-thought card as glass panel per §7.3
- [ ] Rebuild feature cards per §7.4
- [ ] Rebuild "how it works" steps per §7.5
- [ ] Rebuild try-it copy card per §7.6
- [ ] Rebuild memory toast per §7.7
- [ ] Rebuild memory feed + tag filters + cards per §7.8
- [ ] Rebuild FAQ accordion per §7.9
- [ ] Rebuild footer per §7.10
- [ ] Add motion keyframes from §6, gated behind `prefers-reduced-motion`
- [ ] Port the same component set into Electron tray view with compressed spacing (§8)
- [ ] QA: confirm zero changes to IndexedDB/recall/clipboard/tag logic — visual diff only
