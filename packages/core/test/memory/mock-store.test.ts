import { describe, expect, it } from 'bun:test'
import { MockMemoryStore } from '../../src/memory/mock-store.js'

describe('MockMemoryStore', () => {
  it('returns entries matching prompt tags', async () => {
    const store = new MockMemoryStore()
    await store.add({ content: 'Use bun test runner', tags: ['bun', 'testing'] })
    await store.add({ content: 'Deploy to prod', tags: ['deploy'] })

    const relevant = await store.getRelevant('run bun tests in CI')
    expect(relevant).toHaveLength(1)
    expect(relevant[0].content).toContain('bun test')
  })

  it('respects limit', async () => {
    const store = new MockMemoryStore()
    await store.add({ content: 'one', tags: ['api'] })
    await store.add({ content: 'two', tags: ['api'] })
    await store.add({ content: 'three', tags: ['api'] })

    const relevant = await store.getRelevant('api docs', 2)
    expect(relevant).toHaveLength(2)
  })

  it('assigns id and createdAt on add', async () => {
    const store = new MockMemoryStore()
    const entry = await store.add({ content: 'note', tags: ['memo'] })
    expect(entry.id).toBeTruthy()
    expect(entry.createdAt).toBeInstanceOf(Date)
  })
})
