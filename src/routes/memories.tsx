import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllMemories } from "../lib/memory-db";
import type { Memory } from "../lib/memory-store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});

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
    <div className="min-h-screen" id="top">
      {/* Background gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-500"
        style={{
          background: dark
            ? "radial-gradient(1200px 600px at 15% -10%, oklch(0.22 0.04 280 / 0.5), transparent 60%), radial-gradient(900px 500px at 100% 10%, oklch(0.2 0.06 60 / 0.3), transparent 60%)"
            : "radial-gradient(1200px 600px at 15% -10%, oklch(0.9 0.05 300 / 0.7), transparent 60%), radial-gradient(900px 500px at 100% 10%, oklch(0.92 0.08 70 / 0.5), transparent 60%)",
        }}
      />

      {/* ── Nav ───────────────────────────────────────────── */}
      <MemoriesNav dark={dark} onToggleDark={toggleDark} />

      <main className="mx-auto max-w-6xl px-4 md:px-6 pb-24 pt-6">
        {/* ── Hero header with mascot ─────────────────────── */}
        <section className="mb-10 flex flex-col-reverse md:grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Your memory vault
            </p>
            <h1 className="font-display text-4xl leading-[1.05] md:text-5xl">
              All saved{" "}
              <em
                className="not-italic"
                style={{ color: "oklch(0.55 0.14 60)" }}
              >
                memories
              </em>
            </h1>
            <p className="mt-3 max-w-lg text-base text-muted-foreground">
              Everything you've saved lives here. Search, filter by tags, or
              just browse through your thoughts — all stored locally on this
              device.
            </p>
          </div>
          <MiniMascot />
        </section>

        {/* ── Stats bar ──────────────────────────────────────── */}
        {memories && memories.length > 0 && (
          <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-md">
              <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-display text-2xl font-semibold leading-none tabular-nums">
                  {memories.length}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Total
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-md">
              <div className="rounded-xl bg-gradient-to-br from-recall/20 to-recall/5 p-2.5">
                <Tag className="h-5 w-5 text-recall" />
              </div>
              <div>
                <div className="font-display text-2xl font-semibold leading-none tabular-nums">
                  {allTags.length}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Tags
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-md">
              <div className="rounded-xl bg-gradient-to-br from-muted-foreground/10 to-transparent p-2.5">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-display text-2xl font-semibold leading-none tabular-nums">
                  {filteredMemories.length}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Showing
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Search & Filters ───────────────────────────────── */}
        {memories && memories.length > 0 && (
          <section className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Search your memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-input/60 bg-card/70 pl-11 pr-4 py-3 text-sm backdrop-blur-md placeholder:text-muted-foreground/50 focus:border-ring focus:bg-card/90 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                  showFilters
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-input/60 bg-card/70 text-muted-foreground hover:text-foreground hover:bg-card/90 backdrop-blur-md",
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeTags.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeTags.length}
                  </span>
                )}
              </button>
            </div>

            {showFilters && allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-xl border border-border/40 bg-card/50 p-4 backdrop-blur-md">
                <span className="mr-1 text-[11px] uppercase tracking-widest text-muted-foreground self-center">
                  Tags:
                </span>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      activeTags.includes(tag)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tag}
                  </button>
                ))}
                {activeTags.length > 0 && (
                  <button
                    onClick={() => setActiveTags([])}
                    className="ml-auto rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMemories.map((memory, i) => (
              <MemoryCard key={memory.id} memory={memory} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Nav for Memories page ───────────────────────────────── */

function MemoriesNav({
  dark,
  onToggleDark,
}: {
  dark: boolean;
  onToggleDark: () => void;
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
        {/* Left: Back + Logo */}
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            to="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <Link to="/" className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-foreground shadow-md">
              <img
                src={mascotSrc}
                alt=""
                width={24}
                height={24}
                className="relative z-10 drop-shadow-sm"
              />
              <span
                aria-hidden
                className="absolute inset-x-1 -bottom-0.5 h-3 rounded-full bg-recall opacity-60 blur-[6px]"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Déjà Vu
            </span>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleDark}
            className="rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {dark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Save a thought
          </Link>
        </div>
      </div>
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
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 120,
          height: 120,
          background:
            "radial-gradient(circle, oklch(0.94 0.03 300 / 0.6), transparent 70%)",
          transition: "background 400ms ease",
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
                ? "drop-shadow(0 0 18px oklch(0.85 0.15 70 / 0.75))"
                : "drop-shadow(0 4px 12px oklch(0.3 0.06 300 / 0.15))",
            }}
          />
        </div>
      </div>
      <div
        key={hovered ? "h" : "u"}
        className={cn(
          "mt-1 rounded-full bg-card/80 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground shadow-sm backdrop-blur",
          hovered && "animate-pop text-foreground",
        )}
      >
        {hovered ? "your vault!" : "browsing"}
      </div>
    </div>
  );
}

/* ─── Memory Card ─────────────────────────────────────────── */

function MemoryCard({ memory, index }: { memory: Memory; index: number }) {
  return (
    <Card
      className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-md transition-all duration-300 hover:shadow-sm hover:-translate-y-px hover:border-border/80"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "rise 0.5s cubic-bezier(0.2,0.9,0.3,1.2) backwards",
      }}
    >
      {/* Subtle top accent */}
      <div
        className="h-0.5 w-full opacity-60"
        style={{
          background:
            "linear-gradient(90deg, var(--color-primary), var(--color-recall), transparent)",
        }}
      />

      <CardHeader className="px-5 pb-2 pt-5">
        <div className="flex items-center gap-2 flex-wrap">
          {memory.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="rounded-full bg-gradient-to-r from-muted/80 to-muted/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur"
            >
              {tag}
            </Badge>
          ))}
          {(!memory.tags || memory.tags.length === 0) && (
            <Badge
              variant="secondary"
              className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
            >
              note
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <p className="text-sm leading-relaxed text-card-foreground/90">
          {memory.content}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-border/30 pt-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            {format(new Date(memory.createdAt), "MMM d, yyyy")}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            {format(new Date(memory.createdAt), "h:mm a")}
          </span>
        </div>
      </CardContent>
    </Card>
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
              filter:
                "drop-shadow(0 4px 12px oklch(0.3 0.06 300 / 0.15))",
            }}
          />
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary"
            style={{ animation: "pulse-soft 1.2s ease-in-out infinite" }}
          />
        </div>
        <span className="text-sm tracking-widest uppercase text-muted-foreground">
          Fetching memories...
        </span>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 py-20 backdrop-blur">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <X className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center">
        {error.message}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/30 py-24 backdrop-blur text-center">
      <div className="relative mb-6">
        <img
          src={mascotSrc}
          alt="Mascot"
          width={100}
          height={100}
          className="animate-float"
          style={{
            filter:
              "drop-shadow(0 4px 12px oklch(0.3 0.06 300 / 0.15))",
          }}
        />
      </div>
      <h3 className="font-display text-2xl text-foreground mb-2">
        No memories yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        Your memory vault is empty! Go back and save your first thought — the
        mascot is waiting.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Save your first thought
      </Link>
    </div>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/30 py-20 backdrop-blur text-center">
      <div className="relative mb-5">
        <img
          src={mascotSrc}
          alt="Mascot"
          width={80}
          height={80}
          style={{
            filter:
              "drop-shadow(0 4px 12px oklch(0.3 0.06 300 / 0.15)) grayscale(0.4)",
            opacity: 0.7,
          }}
        />
      </div>
      <h3 className="font-display text-xl text-foreground mb-2">
        No matches found
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Try a different search term or remove some filters.
      </p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent active:scale-[0.98]"
      >
        Clear filters
      </button>
    </div>
  );
}
