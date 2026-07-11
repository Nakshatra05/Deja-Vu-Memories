import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import { SEED_MEMORIES, type Memory } from "./memory-store";

interface DejaVuDB extends DBSchema {
  memories: {
    key: string;
    value: Memory;
    indexes: {
      "by-created": number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<DejaVuDB>> | null = null;

function getDB(): Promise<IDBPDatabase<DejaVuDB>> {
  if (typeof indexedDB === "undefined") {
    throw new Error("memory-db: IndexedDB is not available (server environment)");
  }
  if (!dbPromise) {
    dbPromise = openDB<DejaVuDB>("dejavu", 1, {
      upgrade(db) {
        const store = db.createObjectStore("memories", { keyPath: "id" });
        store.createIndex("by-created", "createdAt");
      },
    }).then(async (db) => {
      const count = await db.count("memories");
      if (count === 0) {
        const tx = db.transaction("memories", "readwrite");
        for (const m of SEED_MEMORIES) {
          await tx.store.put(m);
        }
        await tx.done;
      }
      return db;
    });
  }
  return dbPromise;
}

export async function getAllMemories(): Promise<Memory[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("memories", "by-created");
  return all.reverse();
}

export async function addMemory(content: string, tags?: string[]): Promise<Memory> {
  const db = await getDB();
  const memory: Memory = {
    id: `m${Date.now()}`,
    content,
    createdAt: Date.now(),
    tags: tags ?? ["you"],
  };
  await db.put("memories", memory);
  return memory;
}

export async function updateMemory(
  id: string,
  updates: Partial<Pick<Memory, "content" | "tags">>,
): Promise<Memory> {
  const db = await getDB();
  const existing = await db.get("memories", id);
  if (!existing) {
    throw new Error(`memory-db: memory "${id}" not found`);
  }
  const updated: Memory = { ...existing, ...updates };
  await db.put("memories", updated);
  return updated;
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("memories", id);
}

export async function getMemoryById(id: string): Promise<Memory | undefined> {
  const db = await getDB();
  return db.get("memories", id);
}
