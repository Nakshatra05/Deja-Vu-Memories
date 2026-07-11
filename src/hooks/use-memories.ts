import { useState, useEffect, useCallback } from "react";
import { SEED_MEMORIES, type Memory } from "../lib/memory-store";

type UseMemoriesReturn = {
  memories: Memory[];
  isLoading: boolean;
  addMemory: (content: string, tags?: string[]) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Pick<Memory, "content" | "tags">>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
};

export function useMemories(): UseMemoriesReturn {
  const [memories, setMemories] = useState<Memory[]>(SEED_MEMORIES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("../lib/memory-db").then(async (db) => {
      const all = await db.getAllMemories();
      if (!cancelled) {
        setMemories(all);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addMemory = useCallback(async (content: string, tags?: string[]) => {
    const db = await import("../lib/memory-db");
    const memory = await db.addMemory(content, tags);
    setMemories((prev) => [memory, ...prev]);
  }, []);

  const updateMemory = useCallback(
    async (id: string, updates: Partial<Pick<Memory, "content" | "tags">>) => {
      const db = await import("../lib/memory-db");
      const updated = await db.updateMemory(id, updates);
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
    },
    [],
  );

  const deleteMemory = useCallback(async (id: string) => {
    const db = await import("../lib/memory-db");
    await db.deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { memories, isLoading, addMemory, updateMemory, deleteMemory };
}
