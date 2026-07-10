import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import mascotSrc from "../assets/mascot.png";
import {
  SEED_MEMORIES,
  searchTop,
  type Memory,
} from "../lib/memory-store";

export const Route = createFileRoute("/")({
  component: Index,
});

const RECALL_THRESHOLD = 0.18;

type MascotState = "idle" | "listening" | "recall" | "saving" | "saved";

type Toast = {
  id: number;
  memory: Memory;
  score: number;
  query: string;
};

const SAMPLE_COPIES = [
  "Acme brand guidelines v3",
  "useEffect keeps re-running my fetch",
  "flowers for mom",
  "FATAL: sorry, too many clients already",
  "coffee shop wifi",
  "standup with Sam tomorrow?",
];

function Index() {
  const [memories, setMemories] = useState<Memory[]>(SEED_MEMORIES);
  const [thought, setThought] = useState("");
  const [clipboard, setClipboard] = useState("");
  const [mascot, setMascot] = useState<MascotState>("idle");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastCheck, setLastCheck] = useState<{ query: string; score: number; matched: boolean } | null>(null);
  const [watching, setWatching] = useState(true);
  const debounceRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  // Simulated clipboard watcher — debounces user input, then runs a match.
  useEffect(() => {
    if (!watching) return;
    const value = clipboard.trim();
    if (value.length < 4) {
      setMascot("idle");
      return;
    }
    setMascot("listening");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const best = searchTop(memories, value);
      if (best && best.score >= RECALL_THRESHOLD) {
        setMascot("recall");
        setLastCheck({ query: value, score: best.score, matched: true });
        const id = ++toastIdRef.current;
        setToasts((t) => [...t, { id, memory: best.memory, score: best.score, query: value }]);
        window.setTimeout(() => {
          setToasts((t) => t.filter((x) => x.id !== id));
        }, 6500);
        window.setTimeout(() => setMascot("idle"), 1800);
      } else {
        setLastCheck({ query: value, score: best?.score ?? 0, matched: false });
        setMascot("idle");
      }
    }, 700);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [clipboard, memories, watching]);

  const saveThought = () => {
    const content = thought.trim();
    if (content.length < 3) return;
    setMascot("saving");
    window.setTimeout(() => {
      const m: Memory = {
        id: `m${Date.now()}`,
        content,
        createdAt: Date.now(),
        tag: "you",
      };
      setMemories((prev) => [m, ...prev]);
      setThought("");
      setMascot("saved");
      window.setTimeout(() => setMascot("idle"), 1200);
    }, 250);
  };

  const stats = useMemo(
    () => ({
      count: memories.length,
      recalls: toastIdRef.current,
    }),
    [memories, toasts],
  );

  return (
    <div className="min-h-screen">
      {/* Ambient background wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 15% -10%, oklch(0.9 0.05 300 / 0.7), transparent 60%), radial-gradient(900px 500px at 100% 10%, oklch(0.92 0.08 70 / 0.5), transparent 60%)",
        }}
      />

      <Header count={stats.count} recalls={stats.recalls} watching={watching} onToggle={() => setWatching((w) => !w)} />

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        {/* Hero */}
        <section className="mb-14 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-recall" />
              Live demo · simulated tray
            </p>
            <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
              The memory that <em className="not-italic text-recall-foreground/80" style={{ color: "oklch(0.55 0.14 60)" }}>finds you</em> before you ask.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Save a thought in 5 seconds. Later, when you copy something related — anywhere on
              your machine — Déjà Vu quietly surfaces it. No search bar. No prompt.
            </p>
          </div>
          <Mascot state={mascot} size={160} />
        </section>

        {/* Workspace */}
        <section className="grid gap-6 lg:grid-cols-2">
          <QuickAdd
            value={thought}
            onChange={setThought}
            onSubmit={saveThought}
            mascotState={mascot}
          />
          <ClipboardSimulator
            value={clipboard}
            onChange={setClipboard}
            mascotState={mascot}
            lastCheck={lastCheck}
            onSample={(s) => setClipboard(s)}
          />
        </section>

        {/* Memory list */}
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Your memories</h2>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {memories.length} saved · container <span className="font-mono lowercase">deja-vu-local-user</span>
            </span>
          </div>
          <MemoryList memories={memories} />
        </section>

        <Footer />
      </main>

      {/* Toast stack */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,360px)] flex-col gap-3">
        {toasts.map((t) => (
          <RecallToast key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );

}

/* ─────────────────────────────────────────────────────────── */

function Header({ count, recalls, watching, onToggle }: { count: number; recalls: number; watching: boolean; onToggle: () => void }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-3">
        <img src={mascotSrc} alt="" width={40} height={40} className="drop-shadow-sm" />
        <div className="leading-tight">
          <div className="font-display text-2xl">Déjà Vu</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">memory · local-first</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatChip label="saved" value={count} />
        <StatChip label="recalls" value={recalls} tone="recall" />
        <button
          onClick={onToggle}
          className="ml-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
        >
          <span
            className={`h-2 w-2 rounded-full ${watching ? "bg-recall" : "bg-muted-foreground/50"}`}
            style={watching ? { animation: "pulse-soft 2.4s ease-in-out infinite" } : undefined}
          />
          {watching ? "Watching" : "Paused"}
        </button>
      </div>
    </header>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone?: "recall" }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs sm:inline-flex">
      <span className={`font-mono tabular-nums font-semibold ${tone === "recall" ? "text-[oklch(0.55_0.14_60)]" : "text-foreground"}`}>
        {value}
      </span>
      <span className="uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Mascot({ state, size = 96 }: { state: MascotState; size?: number }) {
  const bubble: Record<MascotState, string> = {
    idle: "watching",
    listening: "listening…",
    recall: "déjà vu!",
    saving: "noting…",
    saved: "saved ✓",
  };
  const glow = state === "recall";
  const bounce = state === "saved" || state === "recall";

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background:
            state === "recall"
              ? "radial-gradient(circle, oklch(0.95 0.12 75 / 0.9), transparent 70%)"
              : "radial-gradient(circle, oklch(0.94 0.03 300 / 0.6), transparent 70%)",
          transition: "background 400ms ease",
        }}
      >
        <img
          src={mascotSrc}
          alt="Déjà Vu mascot"
          width={size}
          height={size}
          style={{
            width: size * 0.92,
            height: size * 0.92,
            transform: bounce ? "translateY(-4px) scale(1.03)" : "translateY(0) scale(1)",
            transition: "transform 400ms cubic-bezier(0.2,0.9,0.3,1.3)",
            filter: glow ? "drop-shadow(0 0 18px oklch(0.85 0.15 70 / 0.75))" : "drop-shadow(0 4px 12px oklch(0.3 0.06 300 / 0.15))",
          }}
        />
        {state === "listening" && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary"
            style={{ animation: "pulse-soft 1.2s ease-in-out infinite" }}
          />
        )}
        {state === "recall" && (
          <span
            aria-hidden
            className="absolute -right-2 -top-2 rounded-full bg-recall px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-recall-foreground"
            style={{ animation: "rise 0.4s cubic-bezier(0.2,0.9,0.3,1.3)" }}
          >
            !
          </span>
        )}
      </div>
      <div className="mt-2 rounded-full bg-card/80 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground shadow-sm backdrop-blur">
        {bubble[state]}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function QuickAdd({
  value,
  onChange,
  onSubmit,
  mascotState,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  mascotState: MascotState;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tray · quick-add</div>
          <h3 className="font-display text-xl">Save a thought</h3>
        </div>
        <Mascot state={mascotState === "saving" || mascotState === "saved" ? mascotState : "saving"} size={56} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="What's on your mind? Anything useful — a fix, a fact, a preference…"
        rows={4}
        className="w-full resize-none rounded-lg border border-input bg-background/60 px-4 py-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⏎</kbd> to save ·{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⇧⏎</kbd> newline
        </span>
        <button
          onClick={onSubmit}
          disabled={value.trim().length < 3}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-30"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function ClipboardSimulator({
  value,
  onChange,
  mascotState,
  lastCheck,
  onSample,
}: {
  value: string;
  onChange: (v: string) => void;
  mascotState: MascotState;
  lastCheck: { query: string; score: number; matched: boolean } | null;
  onSample: (s: string) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Clipboard · simulator</div>
          <h3 className="font-display text-xl">Copy something</h3>
        </div>
        <Mascot state={mascotState === "recall" || mascotState === "listening" ? mascotState : "idle"} size={56} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type what you'd copy on your machine…"
        rows={4}
        className="w-full resize-none rounded-lg border border-input bg-background/60 px-4 py-3 font-mono text-[13px] leading-relaxed placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      <div className="mt-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Try one</div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_COPIES.map((s) => (
            <button
              key={s}
              onClick={() => onSample(s)}
              className="rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-foreground/80 transition hover:border-ring hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {lastCheck && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-border bg-background/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {lastCheck.matched ? "Match" : "No match"} · score{" "}
            <span className="font-mono tabular-nums text-foreground">
              {lastCheck.score.toFixed(2)}
            </span>{" "}
            · threshold <span className="font-mono tabular-nums">{RECALL_THRESHOLD}</span>
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
              lastCheck.matched
                ? "bg-recall/20 text-[oklch(0.4_0.12_60)]"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {lastCheck.matched ? "recall" : "silent"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function MemoryList({ memories }: { memories: Memory[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {memories.map((m) => (
        <li
          key={m.id}
          className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-ring/50 hover:shadow-[var(--shadow-soft)]"
        >
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5">{m.tag ?? "note"}</span>
            <span>{relTime(m.createdAt)}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{m.content}</p>
        </li>
      ))}
    </ul>
  );
}

function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ─────────────────────────────────────────────────────────── */

function RecallToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className="pointer-events-auto overflow-hidden rounded-2xl border border-recall/40 bg-card shadow-[var(--shadow-glow)]"
      style={{ animation: "rise 0.4s cubic-bezier(0.2,0.9,0.3,1.3)" }}
    >
      <div className="flex items-start gap-3 p-4">
        <img src={mascotSrc} alt="" width={44} height={44} className="shrink-0 drop-shadow" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[oklch(0.5_0.14_60)]">
            Déjà Vu
            <span className="rounded-full bg-recall/20 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-[oklch(0.4_0.12_60)]">
              {toast.score.toFixed(2)}
            </span>
          </div>
          <p className="text-sm leading-snug text-foreground">{toast.memory.content}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            triggered by: <span className="font-mono">“{toast.query}”</span>
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="mt-20 border-t border-border pt-8 text-sm text-muted-foreground">
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <div className="mb-2 font-display text-lg text-foreground">You don't search.</div>
          <p>You don't ask. The memory finds you — through a mascot in your tray, powered by
            Supermemory local. Two loops: capture in 5 seconds, recall in zero.</p>
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em]">How this demo works</div>
          <p>Type in the clipboard box to simulate copying text on your machine. A local
            similarity check runs, and above a threshold the mascot surfaces a matching memory.</p>
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em]">In the real app</div>
          <p>An Electron tray app polls your clipboard every 1.5s, calls Supermemory local at{" "}
            <span className="font-mono">localhost:6767</span>, and fires a native OS notification
            when a memory is relevant.</p>
        </div>
      </div>
      <div className="mt-10 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60">
        Déjà Vu · MVP demo · local-first memory
      </div>
    </footer>
  );
}
