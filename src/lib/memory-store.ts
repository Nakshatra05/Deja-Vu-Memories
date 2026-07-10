export type Memory = {
  id: string;
  content: string;
  createdAt: number;
  tag?: string;
};

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","of","to","in","on","at","for","and","or","but","if","then","so","with","without","by","from","as","it","this","that","these","those","i","you","he","she","we","they","my","your","our","their","me","him","her","us","them","not","no","do","does","did","have","has","had","will","would","can","could","should","about","into","up","down","out","over","just","also","than","too","very","use","using","used",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  const union = ta.size + tb.size - inter;
  // Jaccard, boosted slightly by overlap ratio on the query side
  const jaccard = inter / union;
  const queryOverlap = inter / Math.min(ta.size, tb.size);
  return jaccard * 0.55 + queryOverlap * 0.45;
}

export function searchTop(memories: Memory[], query: string) {
  let best: { memory: Memory; score: number } | null = null;
  for (const m of memories) {
    const score = similarity(query, m.content);
    if (!best || score > best.score) best = { memory: m, score };
  }
  return best;
}

export const SEED_MEMORIES: Memory[] = [
  {
    id: "m1",
    content: "Client Acme hates the color blue — use warm neutrals and cream tones on their pitch deck.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    tag: "clients",
  },
  {
    id: "m2",
    content: "React useEffect infinite loop fix: wrap functions in useCallback before adding them to the dependency array.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    tag: "code",
  },
  {
    id: "m3",
    content: "Mom's birthday is March 12 — she loves peonies, absolutely no roses.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    tag: "life",
  },
  {
    id: "m4",
    content: "Postgres 'too many connections' error → set pgBouncer pool_mode=transaction and lower max_client_conn.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    tag: "code",
  },
  {
    id: "m5",
    content: "Wifi at the Nomad co-working space: network 'Nomad_Guest', password is taped to the espresso machine.",
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    tag: "life",
  },
  {
    id: "m6",
    content: "Sam from design prefers async Loom updates over live standup meetings — schedule accordingly.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    tag: "team",
  },
];
