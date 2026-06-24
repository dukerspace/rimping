import type { MemoryEntry, MemoryStore } from '../types.js'

const store: MemoryEntry[] = []

export class MockMemoryStore implements MemoryStore {
  async getRelevant(prompt: string, limit = 5): Promise<MemoryEntry[]> {
    const words = new Set(prompt.toLowerCase().split(/\W+/).filter(Boolean))
    return store
      .filter((entry) => entry.tags.some((tag) => words.has(tag.toLowerCase())))
      .slice(0, limit)
  }

  async add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry> {
    const newEntry: MemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }
    store.push(newEntry)
    return newEntry
  }
}

export const defaultMemoryStore = new MockMemoryStore()
