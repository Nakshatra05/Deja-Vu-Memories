import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllMemories } from "../lib/memory-db";
import type { Memory } from "../lib/memory-store";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import mascotSrc from "../assets/mascot.png";
import {
  ArrowLeft,
  Search,
  Brain,
  Tag,
  Moon,
  Sun,
  SlidersHorizontal,
  X,
  Menu,
  Github,
  Zap,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});

/* ─── Dark mode hook (uses .light class) ──────────────────── */

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

/* ─── Main page ───────────────────────────────────────────── */

function MemoriesPage() {
  const { dark, toggle: toggleDark } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: memories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["memories-all"],
    queryFn: async () => {
      if (typeof window === "undefined") return [];
      return getAllMemories();
    },
  });

  const allTags = useMemo(() => {
    if (!memories) return [];
    const tags = new Set<string>();
    memories.forEach((m) => m.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [memories]);

  const filteredMemories = useMemo(() => {
    if (!memories) return [];
    return memories.filter((memory) => {
      const matchesSearch = memory.content
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((tag) => memory.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [memories, searchQuery, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <div className="min-h-screen p-2 md:p-4" id="top" style={{ color: 'var(--foreground)' }}>
      <div className="boxed-wrapper">

      {/* ── Nav ───────────────────────────────────────────── */}
      <MemoriesNav dark={dark} onToggleDark={toggleDark} />

      <main className="mx-auto max-w-6xl px-4 md:px-6 pb-24 pt-32">
        {/* ── Hero header with mascot ─────────────────────── */}
        <section className="mb-12 flex flex-col-reverse md:grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-ui-label mb-4 inline-flex items-center gap-2" style={{ color: 'var(--accent-soft)' }}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--accent-orange)' }}
              />
              Your memory vault
            </p>
            <h1 className="text-hero" style={{ fontSize: 'clamp(36px, 4vw, 56px)' }}>
              All saved{" "}
              <span style={{ color: 'var(--accent-orange)' }}>
                memories
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-body" style={{ color: 'var(--text-muted)' }}>
              Everything you've saved lives here. Search, filter by tags, or
              just browse through your thoughts — all stored locally on this
              device.
            </p>
          </div>
          <MiniMascot />
        </section>

        {/* ── Stats bar ──────────────────────────────────────── */}
        {memories && memories.length > 0 && (
          <section className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Brain, label: "Total", value: memories.length },
              { icon: Tag, label: "Tags", value: allTags.length },
              { icon: Search, label: "Showing", value: filteredMemories.length },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid var(--line)',
                  borderRadius: '16px',
                }}
              >
                <div
                  className="grid h-[44px] w-[44px] place-items-center rounded-xl"
                  style={{ background: 'rgba(255,109,41,0.1)' }}
                >
                  <s.icon className="h-5 w-5" style={{ color: 'var(--accent-orange)' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>
                    {s.value}
                  </div>
                  <div className="text-micro-label mt-1" style={{ color: 'var(--text-muted)' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Search & Filters ───────────────────────────────── */}
        {memories && memories.length > 0 && (
          <section className="mb-10 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                <input
                  type="text"
                  placeholder="Search your memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dv-input pl-11"
                  style={{ borderRadius: '14px' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 grid h-[24px] w-[24px] place-items-center rounded-full transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "dv-btn-ghost",
                  showFilters && "dv-pill--active",
                )}
                style={{
                  borderRadius: '14px',
                  padding: '12px 20px',
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeTags.length > 0 && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--accent-orange)', color: 'var(--accent-ink)' }}
                  >
                    {activeTags.length}
                  </span>
                )}
              </button>
            </div>

            {showFilters && allTags.length > 0 && (
              <div
                className="flex flex-wrap gap-2 rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--line)',
                  borderRadius: '16px',
                  animation: 'panelEnter 300ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <span className="text-micro-label mr-1 self-center" style={{ color: 'var(--text-muted)' }}>
                  Tags:
                </span>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "dv-pill dv-pill--interactive",
                      activeTags.includes(tag) && "dv-pill--active",
                    )}
                  >
                    {tag}
                  </button>
                ))}
                {activeTags.length > 0 && (
                  <button
                    onClick={() => setActiveTags([])}
                    className="ml-auto text-xs font-medium transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Content ──────────────────────────────────────── */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error as Error} />
        ) : !memories || memories.length === 0 ? (
          <EmptyState />
        ) : filteredMemories.length === 0 ? (
          <NoResultsState onClear={() => { setSearchQuery(""); setActiveTags([]); }} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filteredMemories.map((memory, i) => (
              <MemoryCard key={memory.id} memory={memory} index={i} />
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}

/* ─── Nav for Memories page (Surfyy Floating Pill) ────────────── */

function MemoriesNav({
  dark,
  onToggleDark,
}: {
  dark: boolean;
  onToggleDark: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: "How it works", href: "/#how-it-works", isRoute: true },
    { label: "Features", href: "/#features", isRoute: true },
    { label: "FAQ", href: "/#faq", isRoute: true },
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
          background: dark ? 'rgba(24, 20, 18, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--line)',
          boxShadow: scrolled
            ? '0 8px 32px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0,0,0,0.08)'
            : '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* ── Left: Back + Logo ── */}
        <div className="flex items-center gap-2 pl-2 pr-2 shrink-0">
          <Link
            to="/"
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--line)',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <a href="#top" className="group flex items-center gap-2 ml-1">
            <div className="dv-logo-badge overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:bg-[rgba(255,109,41,0.15)]" style={{ width: 32, height: 32, borderRadius: '50%' }}>
              <img
                src={mascotSrc}
                alt=""
                className="relative z-10 w-5 h-5 drop-shadow-sm"
              />
            </div>
            <span className="text-[15px] tracking-tight ml-1" style={{ fontWeight: 800, color: 'var(--text)' }}>
              Déjà Vu
            </span>
          </a>
        </div>

        {/* ── Center: Nav links (Desktop/Large only) ── */}
        <div className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200"
              style={{ color: link.label === "All Memories" ? 'var(--text)' : 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = link.label === "All Memories" ? 'var(--text)' : 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {link.label}
            </Link>
          ))}
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
              border: '1px solid var(--line)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          >
            <Github className="h-[14px] w-[14px]" />
            <span className="text-[13px] font-semibold">GitHub</span>
          </a>

          {/* Theme toggle */}
          <button
            onClick={onToggleDark}
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--line)',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-orange)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-[14px] w-[14px]" /> : <Moon className="h-[14px] w-[14px]" />}
          </button>

          {/* Get Access button with glow */}
          <div className="relative group ml-1">
            <div className="absolute inset-0 rounded-full bg-[var(--accent-orange)] opacity-40 blur-md transition-all duration-500 group-hover:opacity-70 group-hover:blur-lg"></div>
            <Link
              to="/"
              className="relative flex items-center justify-center h-[36px] px-5 rounded-full font-bold text-[13px] transition-all"
              style={{ background: 'var(--accent-orange)', color: 'var(--accent-ink)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)' }}
            >
              Save a thought
            </Link>
          </div>
        </div>

        {/* ── Hamburger (Mobile/Tablet) ── */}
        <div className="md:hidden flex items-center gap-1.5 pr-2">
          <button
            onClick={onToggleDark}
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              border: '1px solid var(--line)',
              color: 'var(--text-muted)',
            }}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-[14px] w-[14px]" /> : <Moon className="h-[14px] w-[14px]" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-[36px] w-[36px] place-items-center rounded-full transition-all duration-200"
            style={{
              background: mobileOpen ? 'rgba(255,109,41,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${mobileOpen ? 'rgba(255,109,41,0.3)' : 'var(--line)'}`,
              color: mobileOpen ? 'var(--accent-orange)' : 'var(--text-muted)',
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
            background: dark
              ? 'rgba(20, 16, 14, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            border: '1px solid var(--line)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            animation: 'panelEnter 300ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div className="p-2 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {link.label === "How it works" && <Zap className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />}
                {link.label === "Features" && <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />}
                {link.label === "FAQ" && <Search className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />}
                {link.label === "All Memories" && <Brain className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />}
                {link.label}
              </Link>
            ))}

            <div className="mx-2 my-1" style={{ borderTop: '1px solid var(--line)' }} />

            <a
              href="https://github.com/Nakshatra05/Deja-Vu-Memories"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-200"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Github className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
              GitHub
            </a>

            <div className="px-2 pt-2 pb-2">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="dv-btn-primary w-full justify-center h-[44px]"
                style={{ borderRadius: '12px', fontSize: '14px' }}
              >
                <Zap className="h-4 w-4 mr-2" />
                Save a thought
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Mini Mascot ─────────────────────────────────────────── */

function MiniMascot() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glow layer */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          width: 130,
          height: 130,
          background: hovered
            ? "radial-gradient(circle, rgba(255,109,41,0.35), transparent 65%)"
            : "radial-gradient(circle, rgba(255,109,41,0.12), transparent 70%)",
          transition: "background 400ms ease",
          animation: "glowDrift 8s ease-in-out infinite alternate",
        }}
      />
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 120,
          height: 120,
        }}
      >
        <div className={hovered ? "animate-squash origin-bottom" : ""}>
          <img
            src={mascotSrc}
            alt="Déjà Vu mascot"
            width={120}
            height={120}
            className="animate-float"
            style={{
              width: 110,
              height: 110,
              transform: hovered
                ? "translateY(-4px) scale(1.03)"
                : "translateY(0) scale(1)",
              transition: "transform 400ms cubic-bezier(0.2,0.9,0.3,1.3)",
              filter: hovered
                ? "drop-shadow(0 0 24px rgba(255,109,41,0.7))"
                : "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
            }}
          />
        </div>
      </div>
      <div
        key={hovered ? "h" : "u"}
        className="mt-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          color: hovered ? 'var(--text)' : 'var(--text-muted)',
          animation: "panelEnter 300ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {hovered ? "your vault!" : "browsing"}
      </div>
    </div>
  );
}

/* ─── Memory Card ─────────────────────────────────────────── */

function MemoryCard({ memory, index }: { memory: Memory; index: number }) {
  return (
    <div
      className="group dv-card relative overflow-hidden p-5"
      style={{
        animation: `panelEnter 460ms cubic-bezier(0.16,1,0.3,1) both`,
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, var(--accent-orange), var(--accent-hot), transparent)',
          opacity: 0.6,
        }}
      />

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {memory.tags?.map((tag) => (
          <span
            key={tag}
            className="text-micro-label rounded-full px-2.5 py-0.5"
            style={{
              background: 'rgba(255,109,41,0.1)',
              color: 'var(--accent-soft)',
            }}
          >
            {tag}
          </span>
        ))}
        {(!memory.tags || memory.tags.length === 0) && (
          <span
            className="text-micro-label rounded-full px-2.5 py-0.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted)',
            }}
          >
            note
          </span>
        )}
      </div>

      <p className="text-card-body leading-relaxed" style={{ color: 'var(--text-muted-strong)' }}>
        {memory.content}
      </p>

      <div
        className="mt-4 flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="text-micro-label" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          {format(new Date(memory.createdAt), "MMM d, yyyy")}
        </span>
        <span className="text-micro-label" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          {format(new Date(memory.createdAt), "h:mm a")}
        </span>
      </div>
    </div>
  );
}

/* ─── State Components ────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <img
            src={mascotSrc}
            alt=""
            width={80}
            height={80}
            className="animate-float"
            style={{
              filter: "drop-shadow(0 0 16px rgba(255,109,41,0.4))",
            }}
          />
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full"
            style={{
              background: 'var(--accent-orange)',
              animation: "pulseSoft 1.3s ease-in-out infinite",
            }}
          />
        </div>
        <span className="text-ui-label" style={{ color: 'var(--text-muted)' }}>
          Fetching memories...
        </span>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-20"
      style={{
        border: '1px solid rgba(255,143,143,0.2)',
        background: 'rgba(255,143,143,0.04)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="mb-4 grid h-14 w-14 place-items-center rounded-full"
        style={{ background: 'rgba(255,143,143,0.1)' }}
      >
        <X className="h-6 w-6" style={{ color: 'var(--color-danger)' }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
        Something went wrong
      </h3>
      <p className="text-sm max-w-xs text-center" style={{ color: 'var(--text-muted)' }}>
        {error.message}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-24 text-center"
      style={{
        border: '1px dashed var(--line-strong)',
        background: 'rgba(255,255,255,0.015)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="relative mb-6">
        <img
          src={mascotSrc}
          alt="Mascot"
          width={100}
          height={100}
          className="animate-float"
          style={{
            filter: "drop-shadow(0 0 16px rgba(255,109,41,0.4))",
          }}
        />
      </div>
      <h3 className="text-section-heading mb-2" style={{ color: 'var(--text)' }}>
        No memories yet
      </h3>
      <p className="text-sm max-w-xs mb-8" style={{ color: 'var(--text-muted)' }}>
        Your memory vault is empty! Go back and save your first thought — the
        mascot is waiting.
      </p>
      <Link
        to="/"
        className="dv-btn-primary"
        style={{ borderRadius: '999px' }}
      >
        Save your first thought
      </Link>
    </div>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
      style={{
        border: '1px dashed var(--line-strong)',
        background: 'rgba(255,255,255,0.015)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="relative mb-5">
        <img
          src={mascotSrc}
          alt="Mascot"
          width={80}
          height={80}
          style={{
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25)) grayscale(0.4)",
            opacity: 0.7,
          }}
        />
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
        No matches found
      </h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Try a different search term or remove some filters.
      </p>
      <button
        onClick={onClear}
        className="dv-btn-ghost"
      >
        Clear filters
      </button>
    </div>
  );
}
