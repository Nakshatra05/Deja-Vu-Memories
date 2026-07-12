import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from "framer-motion";
import mascotSrc from "../assets/mascot.png";
import { searchTop, type Memory } from "../lib/memory-store";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  Search,
  X,
  Moon,
  Sun,
  Github,
  Brain,
  Zap,
  Tag,
  Flame,
  ShieldCheck,
  Sparkles,
  Tags,
  Plus,
  Eye,
  EyeOff,
  Menu,
  Send,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

import { useMemories } from "../hooks/use-memories";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
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

/* ─── Dark mode hook (now .light class toggle) ─────────── */

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return !document.documentElement.classList.contains("light");
  });

  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("dejavu-theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("dejavu-theme", "light");
    }
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

/* ─── Scroll Reveal Hook & Component ──────────────────────── */

const revealEase = [0.16, 1, 0.3, 1] as const;
const revealViewport = { once: true, amount: 0.24 };

type RevealDirection = "up" | "left" | "right";

function revealOffset(direction: RevealDirection) {
  if (direction === "left") return { x: -34, y: 0 };
  if (direction === "right") return { x: 34, y: 0 };
  return { x: 0, y: 22 };
}

function ScrollReveal({
  children,
  delay = 0,
  className = "",
  direction = "up",
  scale = 1,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: RevealDirection;
  scale?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const offset = revealOffset(direction);

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, ...offset, scale }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={revealViewport}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.55,
        delay: prefersReducedMotion ? 0 : delay,
        ease: revealEase,
      }}
    >
      {children}
    </motion.div>
  );
}

function StaggerReveal({
  children,
  className = "",
  itemClassName = "",
  delayChildren = 0,
  staggerChildren = 0.08,
}: {
  children: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  delayChildren?: number;
  staggerChildren?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : "hidden"}
      whileInView="show"
      viewport={revealViewport}
      variants={{
        hidden: {},
        show: {
          transition: {
            delayChildren: prefersReducedMotion ? 0 : delayChildren,
            staggerChildren: prefersReducedMotion ? 0 : staggerChildren,
          },
        },
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          className={itemClassName}
          variants={{
            hidden: { opacity: 0, y: 18 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            ease: revealEase,
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
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
  const [lastCheck, setLastCheck] = useState<{
    query: string;
    score: number;
    matched: boolean;
  } | null>(null);
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
          Notification.requestPermission().then((permission) => {
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
      if (
        best &&
        best.score >= RECALL_THRESHOLD &&
        best.memory.content !== lastSimilarNotifyRef.current
      ) {
        lastSimilarNotifyRef.current = best.memory.content;
        toast.info("Similar memory exists", {
          description:
            best.memory.content.length > 80
              ? best.memory.content.slice(0, 80) + "…"
              : best.memory.content,
          duration: 4000,
        });
      }
    }, 800);
  };

  const recalls = toastIdRef.current;

  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const matchesSearch = memory.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags =
        activeTags.length === 0 || activeTags.every((tag) => memory.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [memories, searchQuery, activeTags]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    memories.forEach((m) => m.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [memories]);

  return (
    <div className="min-h-screen p-2 md:p-4" id="top" style={{ color: "var(--foreground)" }}>
      <div className="boxed-wrapper">
        <NavBar dark={dark} onToggleDark={toggleDark} onOpenCmd={() => setCmdOpen(true)} />

        <main className="mx-auto max-w-6xl px-4 md:px-6 pb-24 pt-32">
          {/* ── Hero ─────────────────────────────────────────── */}
          <section className="mb-12 flex flex-col-reverse md:grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <ScrollReveal direction="left">
              <div>
                <p
                  className="text-ui-label mb-4 inline-flex items-center gap-2"
                  style={{ color: "var(--accent-soft)" }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "var(--accent-orange)",
                      animation: "pulseSoft 1.3s ease-in-out infinite",
                    }}
                  />
                  Your personal memory assistant
                </p>
                <h1 className="text-hero">
                  The memory that <span style={{ color: "var(--accent-orange)" }}>finds you</span>{" "}
                  before you ask.
                </h1>
                <p
                  className="mt-6 max-w-[570px] text-body mb-8"
                  style={{ color: "var(--text-muted)" }}
                >
                  Save a thought in 5 seconds. Later, when you copy something related — anywhere on
                  your machine — Déjà Vu quietly surfaces it. No search bar. No prompt.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-[var(--accent-orange)] opacity-40 blur-xl transition-all duration-500 group-hover:opacity-70 group-hover:blur-2xl"></div>
                    <button
                      className="relative flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold transition-all"
                      style={{
                        background: "var(--accent-orange)",
                        color: "var(--accent-ink)",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
                      }}
                    >
                      Get early access <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    className="flex items-center justify-center rounded-xl px-6 py-3 font-semibold transition-all"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    Watch demo
                  </button>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal
              delay={0.15}
              direction="right"
              className="flex justify-center md:justify-end"
            >
              <Mascot state={mascot} className="w-36 h-36 md:w-44 md:h-44" />
            </ScrollReveal>
          </section>

          {/* ── Brain Stats ──────────────────────────────────── */}
          <BrainStats memories={memories} recalls={recalls} />

          {/* ── Quick Add ────────────────────────────────────── */}
          <section className="mt-12 mx-auto max-w-2xl" id="quick-add">
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
          <section className="mt-16 md:mt-24" id="memories">
            <div className="mb-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
              <h2 className="text-section-heading" style={{ color: "var(--text)" }}>
                Your memories
              </h2>
              <span className="text-micro-label" style={{ color: "var(--text-muted)" }}>
                {memories.length} saved · Stored locally on this device
              </span>
            </div>

            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dv-input pl-11"
                  style={{ borderRadius: 999 }}
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
                        "dv-pill dv-pill--interactive",
                        activeTags.includes(tag) && "dv-pill--active",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <MemoryList
              memories={filteredMemories}
              onUpdate={updateMemory}
              onDelete={deleteMemory}
            />

            {memories.length > 6 && (
              <div className="mt-8 text-center">
                <Link to="/memories" className="dv-btn-ghost">
                  View all memories →
                </Link>
              </div>
            )}
          </section>

          {/* ── Features ─────────────────────────────────────── */}
          <FeaturesGrid />

          {/* ── FAQ ──────────────────────────────────────────── */}
          <FAQ />

          {/* ── Footer ───────────────────────────────────────── */}
          <Footer />
        </main>
      </div>

      {/* ── Overlays ── (Outside boxed wrapper so they float over the black edges) ── */}
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(92vw,380px)] flex-col gap-3">
        {toasts.map((t) => (
          <RecallToast
            key={t.id}
            toast={t}
            onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
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

/* ─── NavBar (Surfyy Floating Pill) ───────────────────────── */

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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "FAQ", href: "#faq" },
    { label: "All Memories", href: "/memories", isRoute: true },
  ];

  return (
    <nav
      className={cn(
        "fixed top-4 left-0 right-0 z-50 flex justify-center w-full px-4 transition-all duration-300",
        scrolled ? "translate-y-0 opacity-100" : "translate-y-0 opacity-100",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between transition-all duration-300",
          "w-full max-w-[1000px] rounded-full h-[60px]",
        )}
        style={{
          background: dark ? "rgba(24, 20, 18, 0.7)" : "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--line)",
          boxShadow: scrolled
            ? "0 8px 32px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0,0,0,0.08)"
            : "0 4px 12px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* ── Left: Logo ── */}
        <a href="#top" className="group flex items-center gap-2 pl-4 pr-2 shrink-0">
          <div
            className="dv-logo-badge overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:bg-[rgba(255,109,41,0.15)]"
            style={{ width: 36, height: 36, borderRadius: "50%" }}
          >
            <img
              src={mascotSrc}
              alt=""
              className="relative z-10 w-7 h-7 drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12"
            />
          </div>
          <span
            className="text-[16px] tracking-tight ml-1"
            style={{ fontWeight: 800, color: "var(--text)" }}
          >
            Déjà Vu
          </span>
        </a>

        {/* ── Center: Nav links (Desktop/Large only) ── */}
        <div className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {link.label}
              </a>
            ),
          )}
        </div>

        {/* ── Right: Actions (Desktop/Large) ── */}
        <div className="hidden md:flex items-center gap-2 pr-2 shrink-0">
          {/* GitHub button (pill with text) */}
          <a
            href="https://github.com/Nakshatra05/Deja-Vu-Memories"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-[36px] px-3 rounded-full transition-all duration-200"
            style={{
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--text)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-orange)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
          >
            <Github className="h-[14px] w-[14px]" />
            <span className="text-[13px] font-semibold">GitHub</span>
          </a>

          {/* Search button (icon only or small pill to save space) */}
          <button
            onClick={onOpenCmd}
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--line)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-orange)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            aria-label="Search"
          >
            <Search className="h-[14px] w-[14px]" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleDark}
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--line)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-orange)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-[14px] w-[14px]" /> : <Moon className="h-[14px] w-[14px]" />}
          </button>

          {/* Get Access button with glow */}
          <div className="relative group ml-1">
            <div className="absolute inset-0 rounded-full bg-[var(--accent-orange)] opacity-40 blur-md transition-all duration-500 group-hover:opacity-70 group-hover:blur-lg"></div>
            <Link
              to="/memories"
              className="relative flex items-center justify-center h-[36px] px-5 rounded-full font-bold text-[13px] transition-all"
              style={{
                background: "var(--accent-orange)",
                color: "var(--accent-ink)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
              }}
            >
              Get access
            </Link>
          </div>
        </div>

        {/* ── Hamburger (Mobile/Tablet) ── */}
        <div className="md:hidden flex items-center gap-1.5 pr-2">
          <button
            onClick={onToggleDark}
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              border: "1px solid var(--line)",
              color: "var(--text-muted)",
            }}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-[14px] w-[14px]" /> : <Moon className="h-[14px] w-[14px]" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              background: mobileOpen ? "rgba(255,109,41,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${mobileOpen ? "rgba(255,109,41,0.3)" : "var(--line)"}`,
              color: mobileOpen ? "var(--accent-orange)" : "var(--text-muted)",
            }}
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown ── */}
      {mobileOpen && (
        <div
          className="md:hidden absolute top-[70px] left-4 right-4 rounded-[20px]"
          style={{
            background: dark ? "rgba(20, 16, 14, 0.95)" : "rgba(255, 255, 255, 0.95)",
            border: "1px solid var(--line)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
            animation: "panelEnter 300ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="p-2 flex flex-col gap-1">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Brain className="h-4 w-4" style={{ color: "var(--accent-orange)" }} />
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {link.label === "How it works" && (
                    <Zap className="h-4 w-4" style={{ color: "var(--accent-orange)" }} />
                  )}
                  {link.label === "Features" && (
                    <Sparkles className="h-4 w-4" style={{ color: "var(--accent-orange)" }} />
                  )}
                  {link.label === "FAQ" && (
                    <Search className="h-4 w-4" style={{ color: "var(--accent-orange)" }} />
                  )}
                  {link.label}
                </a>
              ),
            )}

            <div className="mx-2 my-1" style={{ borderTop: "1px solid var(--line)" }} />

            <button
              onClick={() => {
                onOpenCmd();
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Search className="h-4 w-4" style={{ color: "var(--accent-orange)" }} />
              Search
              <kbd
                className="ml-auto inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted-strong)" }}
              >
                ⌘K
              </kbd>
            </button>

            <a
              href="https://github.com/Nakshatra05/Deja-Vu-Memories"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Github className="h-4 w-4" style={{ color: "var(--accent-orange)" }} />
              GitHub
            </a>

            <div className="px-2 pt-2 pb-2">
              <Link
                to="/memories"
                onClick={() => setMobileOpen(false)}
                className="dv-btn-primary w-full justify-center h-[44px]"
                style={{ borderRadius: "12px", fontSize: "14px" }}
              >
                <Brain className="h-4 w-4 mr-2" />
                Open Your Vault
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Brain Stats (§7.2 stat pills) ──────────────────────── */

function BrainStats({ memories, recalls }: { memories: Memory[]; recalls: number }) {
  const topTag = useMemo(() => {
    const counts: Record<string, number> = {};
    memories.forEach((m) =>
      m.tags?.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      }),
    );
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "---";
  }, [memories]);

  const stats = [
    { icon: Brain, label: "Memories", value: memories.length },
    { icon: Zap, label: "Recalls", value: recalls },
    { icon: Tag, label: "Top tag", value: topTag },
    { icon: Flame, label: "Streak", value: "1 day" },
  ];

  return (
    <StaggerReveal className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4" staggerChildren={0.07}>
      {stats.map((s) => (
        <div
          key={s.label}
          className="group flex items-center gap-4 rounded-2xl p-5 transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.035)",
            border: "1px solid var(--line)",
            borderRadius: "16px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,109,41,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
          }}
        >
          <div
            className="grid h-[44px] w-[44px] place-items-center rounded-xl"
            style={{
              background: "rgba(255,109,41,0.1)",
            }}
          >
            <s.icon className="h-5 w-5" style={{ color: "var(--accent-orange)" }} />
          </div>
          <div>
            <div
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: "var(--text)" }}
            >
              {s.value}
            </div>
            <div className="text-micro-label mt-1" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </StaggerReveal>
  );
}

/* ─── Mascot (premium glowing companion) ──────────────────── */

function Mascot({
  state,
  className = "w-28 h-28 md:w-36 md:h-36",
  size,
}: {
  state: MascotState;
  className?: string;
  size?: number;
}) {
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

  const containerStyle: React.CSSProperties = size ? { width: size, height: size } : {};

  return (
    <div
      className={cn("relative flex flex-col items-center", !size && className)}
      style={containerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glow layer behind mascot */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            state === "recall"
              ? "radial-gradient(circle, rgba(255,109,41,0.5), transparent 65%)"
              : glow
                ? "radial-gradient(circle, rgba(255,109,41,0.3), transparent 65%)"
                : "radial-gradient(circle, rgba(255,109,41,0.1), transparent 70%)",
          transition: "background 400ms ease",
          animation: state === "idle" ? "glowDrift 8s ease-in-out infinite alternate" : "none",
        }}
      />

      <div className="relative flex items-center justify-center w-full h-full">
        <div className={cn("w-[85%] h-[85%]", hovered ? "animate-squash origin-bottom" : "")}>
          <img
            src={mascotSrc}
            alt="Déjà Vu mascot"
            className={cn("w-full h-full object-contain", state === "idle" ? "animate-float" : "")}
            style={{
              transform: bounce ? "translateY(-4px) scale(1.03)" : "translateY(0) scale(1)",
              transition: "transform 400ms cubic-bezier(0.2,0.9,0.3,1.3)",
              filter: glow
                ? "drop-shadow(0 0 24px rgba(255,109,41,0.7))"
                : "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
            }}
          />
        </div>
        {state === "listening" && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full"
            style={{
              background: "var(--accent-orange)",
              animation: "pulseSoft 1.3s ease-in-out infinite",
            }}
          />
        )}
        {state === "recall" && (
          <>
            <span
              aria-hidden
              className="absolute -right-2 -top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "var(--accent-orange)",
                color: "var(--accent-ink)",
                animation: "panelEnter 0.4s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              !
            </span>
            <span
              aria-hidden
              className="absolute left-0 top-0 h-4 w-4 animate-sparkle"
              style={{ color: "var(--accent-orange)" }}
            >
              ✦
            </span>
            <span
              aria-hidden
              className="absolute bottom-2 right-4 h-4 w-4 animate-sparkle"
              style={{ animationDelay: "200ms", color: "var(--accent-orange)" }}
            >
              ✦
            </span>
          </>
        )}
      </div>
      <div
        key={hovered ? "hovered" : "unhovered"}
        className="absolute -bottom-7 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          color: "var(--text-muted)",
          animation: "panelEnter 300ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {bubble[state]}
      </div>
    </div>
  );
}

/* ─── QuickAdd / Save-a-Thought (§7.3 glass panel) ────────── */

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
    <div
      className="dv-glass-panel overflow-hidden"
      style={{ animation: "panelEnter 460ms cubic-bezier(0.16,1,0.3,1) both" }}
    >
      {/* Orange accent top border */}
      <div
        className="h-[3px] w-full"
        style={{
          background: watching
            ? "linear-gradient(90deg, var(--accent-hot), var(--accent-orange), var(--accent-hot))"
            : "linear-gradient(90deg, var(--accent-orange), transparent)",
          backgroundSize: "200% auto",
          animation: watching ? "gradient-shift 4s linear infinite" : "none",
          opacity: watching ? 1 : 0.3,
          transition: "opacity 0.4s ease",
        }}
      />

      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid h-[44px] w-[44px] place-items-center rounded-xl"
              style={{ background: "rgba(255,109,41,0.12)" }}
            >
              <Sparkles className="h-5 w-5" style={{ color: "var(--accent-orange)" }} />
            </div>
            <div>
              <h3
                className="text-xl font-bold leading-tight"
                style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
              >
                Save a thought
              </h3>
              <p className="text-micro-label" style={{ color: "var(--text-muted)" }}>
                Quick save · stored locally
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleWatch}
              className={cn("dv-pill dv-pill--interactive", watching && "dv-pill--active")}
              style={{ padding: "6px 14px" }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: watching ? "var(--accent-orange)" : "var(--text-muted)",
                  animation: watching ? "pulseSoft 1.3s ease-in-out infinite" : "none",
                }}
              />
              {watching ? (
                <>
                  <Eye className="h-3.5 w-3.5" /> Watching
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> Paused
                </>
              )}
            </button>
            <div
              className="group dv-logo-badge overflow-hidden flex items-center justify-center transition-all duration-300 hover:bg-[rgba(255,109,41,0.15)]"
              style={{ width: 36, height: 36, borderRadius: "50%" }}
            >
              <img
                src={mascotSrc}
                alt="mascot"
                className="relative z-10 w-7 h-7 drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12"
              />
            </div>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Anything useful — a fix, a fact, a preference..."
          rows={3}
          className="dv-input resize-none"
          style={{ borderRadius: "14px" }}
        />

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tags className="h-3.5 w-3.5" style={{ color: "var(--text-muted)", opacity: 0.6 }} />
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                background: "rgba(255,109,41,0.14)",
                color: "var(--accent-soft)",
              }}
            >
              {t}
              <button
                onClick={() => removeTag(t)}
                className="rounded-full p-0.5 transition-colors"
                style={{ color: "var(--accent-soft)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,109,41,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
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
            className="min-w-[80px] flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: "var(--text)" }}
          />
        </div>

        {/* Footer */}
        <div
          className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between pt-5 gap-4 sm:gap-0"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            <kbd
              className="hidden sm:inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted-strong)" }}
            >
              Enter
            </kbd>
            <span className="hidden sm:inline"> to save · </span>
            <kbd
              className="hidden sm:inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted-strong)" }}
            >
              Shift+Enter
            </kbd>
            <span className="hidden sm:inline"> newline</span>
            <span className="sm:hidden">Tap save to store locally</span>
          </span>
          <button
            onClick={onSubmit}
            disabled={value.trim().length < 3}
            className="dv-btn-primary w-full sm:w-auto"
          >
            <Send className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── How It Works (§7.5) ────────────────────────────────── */

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
        <div className="dv-card p-6">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="grid h-[40px] w-[40px] place-items-center rounded-xl"
              style={{ background: "rgba(255,109,41,0.1)" }}
            >
              <Brain className="h-5 w-5" style={{ color: "var(--accent-orange)" }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Your thought is saved locally
            </span>
          </div>
          <div className="space-y-2">
            {[
              "Client Acme hates the color blue — use warm neutrals",
              "React useEffect cleanup pattern for subscriptions",
            ].map((t) => (
              <div
                key={t}
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--line)",
                  color: "var(--text-muted-strong)",
                }}
              >
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
        <div
          className="dv-glass-panel p-5"
          style={{ borderRadius: "18px", boxShadow: "0 28px 80px rgba(0,0,0,0.44)" }}
        >
          <div className="flex items-start gap-3">
            <img
              src={mascotSrc}
              alt=""
              width={36}
              height={36}
              className="shrink-0"
              style={{ filter: "drop-shadow(0 0 12px rgba(255,109,41,0.4))" }}
            />
            <div>
              <div
                className="mb-1 flex items-center gap-2 text-micro-label"
                style={{ color: "var(--accent-soft)" }}
              >
                Déjà Vu
                <span
                  className="rounded-full px-1.5 py-0.5 font-mono text-[9px] tabular-nums"
                  style={{ background: "rgba(255,109,41,0.14)", color: "var(--accent-soft)" }}
                >
                  0.87
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
                Client Acme hates the color blue — use warm neutrals...
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                triggered by: <span className="font-mono">"acme brand guidelines"</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="mt-24">
      <ScrollReveal>
        <div className="mb-14 text-center">
          <p className="text-ui-label mb-3" style={{ color: "var(--text-muted)" }}>
            How it works
          </p>
          <h2 className="text-section-heading md:text-[32px]" style={{ color: "var(--text)" }}>
            Two loops, zero friction
          </h2>
        </div>
      </ScrollReveal>
      <div className="space-y-24">
        {steps.map((step, i) => (
          <ScrollReveal key={step.num} delay={i * 0.12} scale={0.97}>
            <div
              className={cn(
                "grid items-center gap-10 md:grid-cols-2",
                i % 2 === 1 && "md:[direction:rtl] md:[&>*]:[direction:ltr]",
              )}
            >
              <div>
                <span
                  className="block text-6xl font-bold"
                  style={{
                    color: "var(--text)",
                    opacity: 0.08,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </span>
                <h3 className="mt-3 text-section-heading" style={{ color: "var(--text)" }}>
                  {step.title}
                </h3>
                <p
                  className="mt-3 text-card-body leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {step.description}
                </p>
              </div>
              <div>{step.visual}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

/* ─── ClipboardSimulator / Try-It (§7.6) ──────────────────── */

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
    <div className="dv-card p-5 md:p-6 overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-micro-label" style={{ color: "var(--text-muted)" }}>
            Try it out
          </div>
          <h3
            className="text-xl font-bold"
            style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            Copy something
          </h3>
        </div>
        <Mascot
          state={mascotState === "recall" || mascotState === "listening" ? mascotState : "idle"}
          size={56}
        />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type what you'd copy on your machine..."
        rows={4}
        className="dv-input resize-none font-mono text-[13px]"
        style={{ borderRadius: "12px" }}
      />
      <div className="mt-4">
        <div className="text-micro-label mb-2" style={{ color: "var(--text-muted)" }}>
          Try one
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_COPIES.map((s) => (
            <button
              key={s}
              onClick={() => onSample(s)}
              className="dv-pill dv-pill--interactive text-xs"
              style={{ fontSize: "12px" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {lastCheck && (
        <div
          className="mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-xs"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px dashed var(--line-strong)",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>
            {lastCheck.matched ? "Match" : "No match"} · score{" "}
            <span className="font-mono tabular-nums" style={{ color: "var(--text)" }}>
              {lastCheck.score.toFixed(2)}
            </span>{" "}
            · threshold <span className="font-mono tabular-nums">{RECALL_THRESHOLD}</span>
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: lastCheck.matched ? "rgba(255,109,41,0.14)" : "rgba(255,255,255,0.04)",
              color: lastCheck.matched ? "var(--accent-soft)" : "var(--text-muted)",
            }}
          >
            {lastCheck.matched ? "recall" : "silent"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Memory List + Card (§7.8) ───────────────────────────── */

function MemoryList({
  memories,
  onUpdate,
  onDelete,
}: {
  memories: Memory[];
  onUpdate: (id: string, updates: Partial<Pick<Memory, "content" | "tags">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const gridRef = useRef<HTMLUListElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ["start end", "end start"],
  });
  const driftRight = useTransform(scrollYProgress, [0, 0.5, 1], [-18, 12, 0]);
  const driftLeft = useTransform(scrollYProgress, [0, 0.5, 1], [14, -12, 0]);

  if (memories.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{
          border: "1px dashed var(--line-strong)",
          background: "rgba(255,255,255,0.015)",
          color: "var(--text-muted)",
        }}
      >
        No memories match your search.
      </div>
    );
  }
  return (
    <motion.ul
      ref={gridRef}
      className="grid gap-4 sm:grid-cols-2"
      initial={prefersReducedMotion ? false : "hidden"}
      whileInView="show"
      viewport={revealViewport}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : 0.07,
          },
        },
      }}
    >
      {memories.map((m, i) => (
        <MemoryCard
          key={m.id}
          memory={m}
          onUpdate={onUpdate}
          onDelete={onDelete}
          parallaxX={prefersReducedMotion ? undefined : i % 2 === 0 ? driftRight : driftLeft}
        />
      ))}
    </motion.ul>
  );
}

function MemoryCard({
  memory,
  onUpdate,
  onDelete,
  parallaxX,
}: {
  memory: Memory;
  onUpdate: (id: string, updates: Partial<Pick<Memory, "content" | "tags">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  parallaxX?: MotionValue<number>;
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

  const cardStyle: MotionStyle = parallaxX ? { x: parallaxX } : {};

  return (
    <motion.li
      className="group dv-card relative p-4 md:p-5"
      style={cardStyle}
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: revealEase }}
    >
      {/* Inset top highlight */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="flex gap-1.5">
          {memory.tags && memory.tags.length > 0 ? (
            memory.tags.map((t) => (
              <span
                key={t}
                className="text-micro-label rounded-full px-2.5 py-0.5"
                style={{
                  background: "rgba(255,109,41,0.1)",
                  color: "var(--accent-soft)",
                }}
              >
                {t}
              </span>
            ))
          ) : (
            <span
              className="text-micro-label rounded-full px-2.5 py-0.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-muted)",
              }}
            >
              note
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {relTime(memory.createdAt)}
          </span>
          {!editing && (
            <span className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <button
                onClick={() => setEditing(true)}
                disabled={busy}
                aria-label="Edit memory"
                className="grid h-[32px] w-[32px] place-items-center rounded-full transition-colors disabled:opacity-40"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                onClick={remove}
                disabled={busy}
                aria-label="Delete memory"
                className="grid h-[32px] w-[32px] place-items-center rounded-full transition-colors disabled:opacity-40"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,143,143,0.1)";
                  e.currentTarget.style.color = "var(--color-danger)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") cancel();
            }}
            autoFocus
            rows={3}
            className="dv-input resize-none text-sm"
            style={{ borderRadius: "12px" }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={cancel}
              disabled={busy}
              className="dv-btn-ghost text-xs disabled:opacity-40"
              style={{ padding: "6px 14px" }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy || draft.trim().length < 3}
              className="dv-btn-primary text-xs disabled:opacity-30"
              style={{ padding: "6px 14px", borderRadius: "999px" }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-card-body leading-relaxed" style={{ color: "var(--text-muted-strong)" }}>
          {memory.content}
        </p>
      )}
    </motion.li>
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

/* ─── Features Grid (§7.4) ───────────────────────────────── */

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
    <section id="features" className="mt-24">
      <ScrollReveal>
        <div className="mb-12 text-center">
          <p className="text-ui-label mb-3" style={{ color: "var(--text-muted)" }}>
            Features
          </p>
          <h2 className="text-section-heading md:text-[32px]" style={{ color: "var(--text)" }}>
            Built for the way you think
          </h2>
        </div>
      </ScrollReveal>
      <StaggerReveal className="grid gap-6 md:grid-cols-3" staggerChildren={0.09}>
        {features.map((f) => (
          <div className="group dv-card p-6 md:p-7">
            <div
              className="mb-4 grid h-[44px] w-[44px] place-items-center rounded-xl"
              style={{ background: "rgba(255,109,41,0.1)" }}
            >
              <f.icon className="h-5 w-5" style={{ color: "var(--accent-orange)" }} />
            </div>
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
            >
              {f.title}
            </h3>
            <p className="text-card-body leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {f.description}
            </p>
          </div>
        ))}
      </StaggerReveal>
    </section>
  );
}

/* ─── FAQ (§7.9 — flat list, no card bg) ──────────────────── */

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
    <section id="faq" className="mx-auto mt-24 max-w-2xl">
      <ScrollReveal>
        <div className="mb-12 text-center">
          <p className="text-ui-label mb-3" style={{ color: "var(--text-muted)" }}>
            FAQ
          </p>
          <h2 className="text-section-heading md:text-[32px]" style={{ color: "var(--text)" }}>
            Questions & answers
          </h2>
        </div>
      </ScrollReveal>
      <div>
        {items.map((item, i) => (
          <ScrollReveal key={i} delay={i * 50}>
            <div style={{ borderBottom: "1px solid var(--line)" }}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left transition-colors"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="text-[15px] font-semibold pr-4"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {item.q}
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-200"
                  style={{
                    color: "var(--text-muted)",
                    transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              <div
                style={{
                  maxHeight: openIndex === i ? "200px" : "0px",
                  overflow: "hidden",
                  transition: "max-height 250ms ease",
                }}
              >
                <p
                  className="text-card-body pb-5 leading-relaxed"
                  style={{ color: "var(--text-muted-strong)", paddingTop: "4px" }}
                >
                  {item.a}
                </p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

/* ─── Footer (§7.10) ─────────────────────────────────────── */

function Footer() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.footer
      className="mt-24 pb-8 pt-8"
      style={{ borderTop: "1px solid var(--line)" }}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={revealViewport}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: revealEase }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <div
          className="group flex items-center gap-3 cursor-pointer"
          onClick={() => window.scrollTo(0, 0)}
        >
          <div
            className="dv-logo-badge overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:bg-[rgba(255,109,41,0.15)]"
            style={{ width: 36, height: 36, borderRadius: "50%" }}
          >
            <img
              src={mascotSrc}
              alt=""
              className="relative z-10 w-7 h-7 drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12"
            />
          </div>
          <span
            className="text-lg font-bold transition-colors group-hover:text-white"
            style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
          >
            Déjà Vu
          </span>
        </div>
        <div className="flex items-center gap-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
          <span>Built with care, stored locally</span>
          <a
            href="https://github.com/Nakshatra05/Deja-Vu-Memories"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </motion.footer>
  );
}

/* ─── Recall Toast (§7.7 — glass panel lite) ──────────────── */

function RecallToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className="pointer-events-auto overflow-hidden dv-glass-panel"
      style={{
        borderRadius: "18px",
        boxShadow: "0 28px 80px rgba(0,0,0,0.44), 0 0 0 1px rgba(255,109,41,0.15)",
        animation: "panelEnter 460ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <img
          src={mascotSrc}
          alt=""
          width={32}
          height={32}
          className="shrink-0"
          style={{ filter: "drop-shadow(0 0 12px rgba(255,109,41,0.5))" }}
        />
        <div className="min-w-0 flex-1">
          <div
            className="mb-1 flex items-center gap-2 text-micro-label"
            style={{ color: "var(--accent-soft)" }}
          >
            Déjà Vu
            <span
              className="rounded-full px-1.5 py-0.5 font-mono text-[9px] tabular-nums"
              style={{ background: "rgba(255,109,41,0.14)", color: "var(--accent-soft)" }}
            >
              {toast.score.toFixed(2)}
            </span>
          </div>
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
            {toast.memory.content}
          </p>
          <p className="mt-1 truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
            triggered by: <span className="font-mono">"{toast.query}"</span>
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="grid h-[28px] w-[28px] place-items-center rounded-full transition-colors"
          aria-label="Dismiss"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
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
                <Search className="mr-2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
                <span className="truncate">{m.content}</span>
                {m.tags && m.tags.length > 0 && (
                  <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.tags[0]}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
