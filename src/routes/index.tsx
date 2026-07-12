import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mascotSrc from "../assets/mascot.png";
import { searchTop, type Memory } from "../lib/memory-store";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  Search, X, Moon, Sun, Github, Brain, Zap, Tag, Flame,
  ShieldCheck, Sparkles, Tags, Plus, Eye, EyeOff, Menu, Send,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemories } from "../hooks/use-memories";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from "@/components/ui/command";

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

/* ─── Dark mode hook ──────────────────────────────────────── */

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("dejavu-theme", next ? "dark" : "light");
  }, [dark]);

  return { dark, toggle };
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      isElectron: boolean;
      onClipboardChange: (callback: (text: string) => void) => void;
    };
  }
}

/* ─── Main page ───────────────────────────────────────────── */

function Index() {
  const { memories, addMemory, updateMemory, deleteMemory } = useMemories();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [thought, setThought] = useState("");
  const [thoughtTags, setThoughtTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState("");
  const [mascot, setMascot] = useState<MascotState>("idle");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastCheck, setLastCheck] = useState<{ query: string; score: number; matched: boolean } | null>(null);
  const [watching, setWatching] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);
  const typingDebounceRef = useRef<number | null>(null);
  const lastSimilarNotifyRef = useRef("");

  // Listen to real OS clipboard if running in Electron
  useEffect(() => {
    if (window.electronAPI?.onClipboardChange) {
      window.electronAPI.onClipboardChange((text) => {
        setClipboard(text);
      });
    }
  }, []);

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
        
        // Trigger native OS notification
        if (window.electronAPI?.isElectron && Notification.permission === "granted") {
          new Notification("Déjà Vu found a memory", {
            body: best.memory.content,
            icon: mascotSrc,
          });
        } else if (window.electronAPI?.isElectron && Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              new Notification("Déjà Vu found a memory", {
                body: best.memory.content,
                icon: mascotSrc,
              });
            }
          });
        }

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

  // Ctrl+K command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const saveThought = () => {
    const content = thought.trim();
    if (content.length < 3) return;

    const isFirstMemory = !localStorage.getItem("dejavu_has_saved_memory");

    setMascot("saving");
    window.setTimeout(async () => {
      await addMemory(content, thoughtTags.length > 0 ? thoughtTags : ["you"]);
      setThought("");
      setThoughtTags([]);
      setMascot("saved");

      toast.success("Memory saved!", {
        description: content.length > 60 ? content.slice(0, 60) + "…" : content,
      });

      if (isFirstMemory) {
        localStorage.setItem("dejavu_has_saved_memory", "true");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 9999,
        });
      }

      window.setTimeout(() => setMascot("idle"), 1200);
    }, 250);
  };

  // Similarity check while typing (non-blocking)
  const handleThoughtChange = (value: string) => {
    setThought(value);
    if (typingDebounceRef.current) window.clearTimeout(typingDebounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 8 || memories.length === 0) return;
    typingDebounceRef.current = window.setTimeout(() => {
      const best = searchTop(memories, trimmed);
      if (best && best.score >= RECALL_THRESHOLD && best.memory.content !== lastSimilarNotifyRef.current) {
        lastSimilarNotifyRef.current = best.memory.content;
        toast.info("Similar memory exists", {
          description: best.memory.content.length > 80 ? best.memory.content.slice(0, 80) + "…" : best.memory.content,
          duration: 4000,
        });
      }
    }, 800);
  };

  const recalls = toastIdRef.current;

  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const matchesSearch = memory.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = activeTags.length === 0 || activeTags.every((tag) => memory.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [memories, searchQuery, activeTags]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    memories.forEach((m) => m.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [memories]);

  return (
    <div className="min-h-screen" id="top">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-500"
        style={{
          background: dark
            ? "radial-gradient(1200px 600px at 15% -10%, oklch(0.22 0.04 280 / 0.5), transparent 60%), radial-gradient(900px 500px at 100% 10%, oklch(0.2 0.06 60 / 0.3), transparent 60%)"
            : "radial-gradient(1200px 600px at 15% -10%, oklch(0.9 0.05 300 / 0.7), transparent 60%), radial-gradient(900px 500px at 100% 10%, oklch(0.92 0.08 70 / 0.5), transparent 60%)",
        }}
      />

      <NavBar
        dark={dark}
        onToggleDark={toggleDark}
        onOpenCmd={() => setCmdOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 md:px-6 pb-24 pt-6">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="mb-10 flex flex-col-reverse md:grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-recall" />
              Your personal memory assistant
            </p>
            <h1 className="font-display text-4xl leading-[1.05] md:text-6xl text-wave-hover cursor-default">
              The memory that{" "}
              <em className="not-italic text-recall-foreground/80" style={{ color: "oklch(0.55 0.14 60)" }}>
                finds you
              </em>{" "}
              before you ask.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Save a thought in 5 seconds. Later, when you copy something related — anywhere on
              your machine — Déjà Vu quietly surfaces it. No search bar. No prompt.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <Mascot state={mascot} className="w-32 h-32 md:w-40 md:h-40" />
          </div>
        </section>

        {/* ── Brain Stats ──────────────────────────────────── */}
        <BrainStats memories={memories} recalls={recalls} />

        {/* ── Quick Add ────────────────────────────────────── */}
        <section className="mt-10 mx-auto max-w-2xl" id="quick-add">
          <QuickAdd
            value={thought}
            onChange={handleThoughtChange}
            tags={thoughtTags}
            onTagsChange={setThoughtTags}
            onSubmit={saveThought}
            mascotState={mascot}
            watching={watching}
            onToggleWatch={() => setWatching((w) => !w)}
          />
        </section>

        {/* ── How It Works ─────────────────────────────────── */}
        <HowItWorks
          clipboard={clipboard}
          onClipboardChange={setClipboard}
          mascotState={mascot}
          lastCheck={lastCheck}
          onSample={(s) => setClipboard(s)}
        />

        {/* ── Your Memories ────────────────────────────────── */}
        <section className="mt-12 md:mt-20" id="memories">
          <div className="mb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">Your memories</h2>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {memories.length} saved · Stored locally on this device
            </span>
          </div>

          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background/60 pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setActiveTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                      )
                    }
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      activeTags.includes(tag)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <MemoryList memories={filteredMemories} onUpdate={updateMemory} onDelete={deleteMemory} />
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <FeaturesGrid />

        {/* ── FAQ ──────────────────────────────────────────── */}
        <FAQ />

        {/* ── Footer ───────────────────────────────────────── */}
        <Footer />
      </main>

      {/* ── Overlays ───────────────────────────────────────── */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,360px)] flex-col gap-3">
        {toasts.map((t) => (
          <RecallToast key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        memories={memories}
        dark={dark}
        onToggleDark={toggleDark}
        watching={watching}
        onToggleWatch={() => setWatching((w) => !w)}
      />
    </div>
  );
}

/* ─── NavBar (Surfy-style) ─────────────────────────────────── */

function NavBar({
  dark,
  onToggleDark,
  onOpenCmd,
}: {
  dark: boolean;
  onToggleDark: () => void;
  onOpenCmd: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "bg-background/80 shadow-sm backdrop-blur-xl"
          : "bg-background/40 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-8 py-3 md:py-5">
        {/* ── Left: Logo ── */}
        <a href="#top" className="flex items-center gap-3.5">
          <div className="relative grid h-10 w-10 md:h-12 md:w-12 place-items-center rounded-xl bg-foreground shadow-md">
            <img
              src={mascotSrc}
              alt=""
              className="relative z-10 w-6 h-6 md:w-8 md:h-8 drop-shadow-sm"
            />
            <span
              aria-hidden
              className="absolute inset-x-1 -bottom-0.5 h-3 rounded-full bg-recall opacity-60 blur-[6px]"
            />
          </div>
          <span className="text-base md:text-lg font-semibold tracking-tight">Déjà Vu</span>
        </a>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleDark}
            className="hidden md:block rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <button
            onClick={onOpenCmd}
            className="hidden md:flex h-10 items-center gap-2 rounded-full bg-muted/50 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="hidden md:inline-flex ml-2 items-center gap-1 rounded bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Mobile Menu Dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full p-2 text-muted-foreground hover:text-foreground focus:outline-none">
                <Menu className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-border/50">
                <DropdownMenuItem onClick={onOpenCmd}>
                  <Search className="mr-2 h-4 w-4" /> Search
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleDark}>
                  {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />} Toggle Theme
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#how-it-works">How it works</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#features">Features</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#faq">FAQ</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/memories">All Memories</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ─── Brain Stats ─────────────────────────────────────────── */

function BrainStats({ memories, recalls }: { memories: Memory[]; recalls: number }) {
  const topTag = useMemo(() => {
    const counts: Record<string, number> = {};
    memories.forEach((m) => m.tags?.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "---";
  }, [memories]);

  const stats = [
    { icon: Brain, label: "Memories", value: memories.length, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { icon: Zap, label: "Recalls", value: recalls, gradient: "from-recall/20 to-recall/5", iconColor: "text-[oklch(0.55_0.14_60)]" },
    { icon: Tag, label: "Top tag", value: topTag, gradient: "from-muted-foreground/10 to-transparent", iconColor: "text-muted-foreground" },
    { icon: Flame, label: "Streak", value: "1 day", gradient: "from-recall/15 to-recall/5", iconColor: "text-recall" },
  ];

  return (
    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <Card key={i} className="group relative overflow-hidden rounded-2xl border-border/40 bg-card/40 transition-colors hover:bg-card/60">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={cn("rounded-xl bg-gradient-to-br p-2.5 transition-transform duration-300 group-hover:scale-105", s.gradient)}>
              <s.icon className={cn("h-5 w-5", s.iconColor)} />
            </div>
            <div>
              <div className="font-display text-2xl font-semibold tabular-nums leading-none">{s.value}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Mascot ──────────────────────────────────────────────── */

function Mascot({ state, className = "w-24 h-24 md:w-32 md:h-32" }: { state: MascotState; className?: string }) {
  const [hovered, setHovered] = useState(false);

  const bubble: Record<MascotState, string> = {
    idle: hovered ? "aha!" : "watching",
    listening: "listening...",
    recall: hovered ? "deja vuuuu!" : "deja vu!",
    saving: "noting...",
    saved: "saved",
  };
  const glow = state === "recall" || hovered;
  const bounce = state === "saved" || state === "recall" || hovered;

  return (
    <div
      className={cn("relative flex flex-col items-center", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative flex items-center justify-center rounded-full w-full h-full"
        style={{
          background:
            state === "recall"
              ? "radial-gradient(circle, oklch(0.95 0.12 75 / 0.9), transparent 70%)"
              : "radial-gradient(circle, oklch(0.94 0.03 300 / 0.6), transparent 70%)",
          transition: "background 400ms ease",
        }}
      >
        <div className={cn("w-[92%] h-[92%]", hovered ? "animate-squash origin-bottom" : "")}>
          <img
            src={mascotSrc}
            alt="Déjà Vu mascot"
            className={cn("w-full h-full object-contain", state === "idle" ? "animate-float" : "")}
            style={{
              transform: bounce ? "translateY(-4px) scale(1.03)" : "translateY(0) scale(1)",
              transition: "transform 400ms cubic-bezier(0.2,0.9,0.3,1.3)",
              filter: glow
                ? "drop-shadow(0 0 18px oklch(0.85 0.15 70 / 0.75))"
                : "drop-shadow(0 4px 12px oklch(0.3 0.06 300 / 0.15))",
            }}
          />
        </div>
        {state === "listening" && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary"
            style={{ animation: "pulse-soft 1.2s ease-in-out infinite" }}
          />
        )}
        {state === "recall" && (
          <>
            <span
              aria-hidden
              className="absolute -right-2 -top-2 rounded-full bg-recall px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-recall-foreground"
              style={{ animation: "rise 0.4s cubic-bezier(0.2,0.9,0.3,1.3)" }}
            >
              !
            </span>
            <span
              aria-hidden
              className="absolute left-0 top-0 h-4 w-4 animate-sparkle text-recall"
            >
              *
            </span>
            <span
              aria-hidden
              className="absolute bottom-2 right-4 h-4 w-4 animate-sparkle text-recall"
              style={{ animationDelay: "200ms" }}
            >
              *
            </span>
          </>
        )}
      </div>
      <div
        key={hovered ? "hovered" : "unhovered"}
        className={cn(
          "absolute -bottom-8 rounded-full bg-card/80 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground shadow-sm backdrop-blur whitespace-nowrap",
          "animate-in fade-in slide-in-from-top-2 duration-300",
        )}
      >
        {bubble[state]}
      </div>
    </div>
  );
}

/* ─── QuickAdd ────────────────────────────────────────────── */

function QuickAdd({
  value,
  onChange,
  tags,
  onTagsChange,
  onSubmit,
  mascotState,
  watching,
  onToggleWatch,
}: {
  value: string;
  onChange: (v: string) => void;
  tags: string[];
  onTagsChange: (t: string[]) => void;
  onSubmit: () => void;
  mascotState: MascotState;
  watching: boolean;
  onToggleWatch: () => void;
}) {
  const [tagInput, setTagInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-[var(--shadow-soft)]">
      {/* Decorative gradient strip at top */}
      <div
        className="h-1.5 w-full"
        style={{
          background: "linear-gradient(90deg, var(--color-primary), var(--color-recall), var(--color-primary))",
          backgroundSize: "200% auto",
          animation: watching ? "text-light-wave 4s linear infinite" : "none",
          opacity: watching ? 1 : 0.3,
          transition: "opacity 0.4s ease",
        }}
      />

      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl leading-tight">Save a thought</h3>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Quick save · stored locally</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleWatch}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-300",
                watching
                  ? "border border-recall/30 bg-recall/10 text-recall-foreground shadow-sm"
                  : "border border-border bg-muted/50 text-muted-foreground",
              )}
            >
              <span
                className={cn("h-2 w-2 rounded-full transition-colors", watching ? "bg-recall" : "bg-muted-foreground/50")}
                style={watching ? { animation: "pulse-soft 2.4s ease-in-out infinite" } : undefined}
              />
              {watching ? (
                <><Eye className="h-3.5 w-3.5" /> Watching</>
              ) : (
                <><EyeOff className="h-3.5 w-3.5" /> Paused</>
              )}
            </button>
            <Mascot state={mascotState === "saving" || mascotState === "saved" ? mascotState : "saving"} size={52} />
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Anything useful — a fix, a fact, a preference..."
          rows={3}
          className="w-full resize-none rounded-xl border border-input/60 bg-background/50 px-4 py-3.5 text-[15px] leading-relaxed placeholder:text-muted-foreground/50 focus:border-ring focus:bg-background/80 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all duration-200"
        />

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tags className="h-3.5 w-3.5 text-muted-foreground/60" />
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {t}
              <button onClick={() => removeTag(t)} className="rounded-full p-0.5 hover:bg-primary/20 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags..."
            className="min-w-[80px] flex-1 bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-border/40 pt-4 gap-4 sm:gap-0">
          <span className="text-[10px] sm:text-xs text-muted-foreground/70">
            <kbd className="hidden sm:inline-block rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> <span className="hidden sm:inline">to save · </span>
            <kbd className="hidden sm:inline-block rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> <span className="hidden sm:inline">newline</span>
            <span className="sm:hidden">Tap save to store locally</span>
          </span>
          <button
            onClick={onSubmit}
            disabled={value.trim().length < 3}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 sm:py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:opacity-90 active:scale-[0.97] disabled:opacity-30 disabled:shadow-none"
          >
            <Send className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── How It Works ────────────────────────────────────────── */

function HowItWorks({
  clipboard,
  onClipboardChange,
  mascotState,
  lastCheck,
  onSample,
}: {
  clipboard: string;
  onClipboardChange: (v: string) => void;
  mascotState: MascotState;
  lastCheck: { query: string; score: number; matched: boolean } | null;
  onSample: (s: string) => void;
}) {
  const steps = [
    {
      num: "01",
      title: "Save a thought",
      description:
        "Jot down anything useful — a fix, a fact, a preference. It takes 5 seconds and lives locally on your device forever.",
      visual: (
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Your thought is saved locally</span>
          </div>
          <div className="space-y-2">
            {["Client Acme hates the color blue — use warm neutrals", "React useEffect cleanup pattern for subscriptions"].map((t) => (
              <div key={t} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                {t}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      num: "02",
      title: "Copy something, anywhere",
      description:
        "Later, when you copy text related to a saved memory — Déjà Vu is silently watching your clipboard in the background.",
      visual: (
        <ClipboardSimulator
          value={clipboard}
          onChange={onClipboardChange}
          mascotState={mascotState}
          lastCheck={lastCheck}
          onSample={onSample}
        />
      ),
    },
    {
      num: "03",
      title: "Memory finds you",
      description:
        "A gentle notification surfaces the relevant memory. No search bar. No prompt. It just appears when you need it.",
      visual: (
        <div className="rounded-2xl border border-recall/40 bg-card p-4 shadow-[var(--shadow-glow)]">
          <div className="flex items-start gap-3">
            <img src={mascotSrc} alt="" width={44} height={44} className="shrink-0 drop-shadow" />
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-recall-foreground">
                Déjà Vu
                <span className="ml-2 rounded-full bg-recall/20 px-1.5 py-0.5 font-mono text-[9px] tabular-nums">
                  0.87
                </span>
              </div>
              <p className="text-sm leading-snug text-foreground">
                Client Acme hates the color blue — use warm neutrals...
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                triggered by: <span className="font-mono">"acme brand guidelines"</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="mt-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <h2 className="font-display text-3xl md:text-4xl">Two loops, zero friction</h2>
      </div>
      <div className="space-y-20">
        {steps.map((step, i) => (
          <div
            key={step.num}
            className={cn(
              "grid items-center gap-8 md:grid-cols-2",
              i % 2 === 1 && "md:[direction:rtl] md:[&>*]:[direction:ltr]",
            )}
          >
            <div>
              <span className="font-display text-5xl text-muted-foreground/20">{step.num}</span>
              <h3 className="mt-2 font-display text-2xl">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
            <div>{step.visual}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── ClipboardSimulator ──────────────────────────────────── */

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
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Try it out</div>
          <h3 className="font-display text-xl">Copy something</h3>
        </div>
        <Mascot state={mascotState === "recall" || mascotState === "listening" ? mascotState : "idle"} size={56} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type what you'd copy on your machine..."
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
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
              lastCheck.matched
                ? "bg-recall/20 text-[oklch(0.4_0.12_60)]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {lastCheck.matched ? "recall" : "silent"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Memory List + Card ──────────────────────────────────── */

function MemoryList({
  memories,
  onUpdate,
  onDelete,
}: {
  memories: Memory[];
  onUpdate: (id: string, updates: Partial<Pick<Memory, "content" | "tags">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  if (memories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        No memories match your search.
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {memories.map((m) => (
        <MemoryCard key={m.id} memory={m} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function MemoryCard({
  memory,
  onUpdate,
  onDelete,
}: {
  memory: Memory;
  onUpdate: (id: string, updates: Partial<Pick<Memory, "content" | "tags">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.content);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const content = draft.trim();
    if (content.length < 3 || content === memory.content) {
      setEditing(false);
      setDraft(memory.content);
      return;
    }
    setBusy(true);
    await onUpdate(memory.id, { content });
    setBusy(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(memory.content);
    setEditing(false);
  };

  const remove = async () => {
    setBusy(true);
    await onDelete(memory.id);
  };

  return (
    <li className="group relative rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-ring/50 hover:shadow-[var(--shadow-soft)]">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="flex gap-1">
          {memory.tags && memory.tags.length > 0 ? (
            memory.tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5">
                {t}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5">note</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span>{relTime(memory.createdAt)}</span>
          {!editing && (
            <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => setEditing(true)}
                disabled={busy}
                aria-label="Edit memory"
                className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                onClick={remove}
                disabled={busy}
                aria-label="Delete memory"
                className="rounded-full p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </span>
          )}
        </span>
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
              if (e.key === "Escape") cancel();
            }}
            autoFocus
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background/60 px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={cancel}
              disabled={busy}
              className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy || draft.trim().length < 3}
              className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-30"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-foreground/90">{memory.content}</p>
      )}
    </li>
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

/* ─── Features Grid ───────────────────────────────────────── */

function FeaturesGrid() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Local-first",
      description:
        "All data stays on your device in IndexedDB. No cloud, no account, no tracking. Your memories are yours.",
    },
    {
      icon: Sparkles,
      title: "Smart Recall",
      description:
        "Déjà Vu uses text similarity to surface relevant memories automatically when you copy related content.",
    },
    {
      icon: Tags,
      title: "Tag System",
      description:
        "Organize memories with tags. Filter, search, and let the system learn what matters most to you.",
    },
  ];

  return (
    <section id="features" className="mt-20">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Features
        </p>
        <h2 className="font-display text-3xl md:text-4xl">Built for the way you think</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <Card
            key={f.title}
            className="group bg-card/60 backdrop-blur transition hover:border-ring/50 hover:shadow-[var(--shadow-soft)]"
          >
            <CardHeader>
              <div className="mb-2 w-fit rounded-lg bg-primary/10 p-2.5">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-display text-xl">{f.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ─── FAQ ──────────────────────────────────────────────────── */

function FAQ() {
  const items = [
    {
      q: "Is my data sent anywhere?",
      a: "No. All memories are stored locally in your browser's IndexedDB. Nothing ever leaves your device.",
    },
    {
      q: "How does the recall work?",
      a: "When you copy text (or type in the simulator), Déjà Vu runs a text similarity check against all your saved memories. If the score passes a threshold, the matching memory surfaces as a notification.",
    },
    {
      q: "Can I use this on my actual desktop?",
      a: "This is a web demo of the concept. The full version would be an Electron tray app that polls your real system clipboard and fires native OS notifications.",
    },
    {
      q: "What similarity algorithm is used?",
      a: "A combination of Jaccard similarity and query overlap ratio on tokenized text. It's lightweight and runs entirely in the browser — no API calls needed.",
    },
    {
      q: "How do I delete my data?",
      a: "You can delete individual memories using the trash icon on each card. To clear everything, clear your browser's IndexedDB storage for this site.",
    },
    {
      q: "Will there be a mobile app?",
      a: "The concept is designed for desktop where clipboard monitoring makes sense. A mobile companion for manual capture is being explored.",
    },
  ];

  return (
    <section id="faq" className="mx-auto mt-20 max-w-2xl">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          FAQ
        </p>
        <h2 className="font-display text-3xl md:text-4xl">Questions & answers</h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-medium">{item.q}</AccordionTrigger>
            <AccordionContent className="leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="mt-20 border-t border-border pb-8 pt-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={mascotSrc} alt="" width={28} height={28} />
          <span className="font-display text-lg">Déjà Vu</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Built with care, stored locally</span>
          <a
            href="https://github.com/Nakshatra05/Deja-Vu-Memories"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-foreground"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Recall Toast ────────────────────────────────────────── */

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
            triggered by: <span className="font-mono">"{toast.query}"</span>
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

/* ─── Command Palette ─────────────────────────────────────── */

function CommandPalette({
  open,
  onOpenChange,
  memories,
  dark,
  onToggleDark,
  watching,
  onToggleWatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memories: Memory[];
  dark: boolean;
  onToggleDark: () => void;
  watching: boolean;
  onToggleWatch: () => void;
}) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search memories or run a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onToggleDark();
              onOpenChange(false);
            }}
          >
            {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Toggle {dark ? "light" : "dark"} mode
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onToggleWatch();
              onOpenChange(false);
            }}
          >
            {watching ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {watching ? "Pause" : "Resume"} clipboard watching
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              document.getElementById("quick-add")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add a new memory
          </CommandItem>
        </CommandGroup>
        {memories.length > 0 && (
          <CommandGroup heading="Memories">
            {memories.slice(0, 10).map((m) => (
              <CommandItem key={m.id} onSelect={() => onOpenChange(false)}>
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{m.content}</span>
                {m.tags && m.tags.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{m.tags[0]}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
