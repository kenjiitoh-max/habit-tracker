import { describe, expect, it } from 'vitest'
import { addDays, toDateKey, today } from './date'

describe('Tokyo dates', () => {
  it('uses the next day in Tokyo after 15:00 UTC', () => {
    expect(toDateKey(new Date('2026-01-01T16:00:00Z'))).toBe('2026-01-02')
    expect(today(new Date('2026-01-01T14:59:59Z'))).toBe('2026-01-01')
  })
  it('adds calendar days across year and leap-day boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
    expect(addDays('2026-01-02', 0)).toBe('2026-01-02')
  })
  it('rejects missing and invalid dates and fractional offsets', () => {
    for (const key of ['', '2026-02-30', 'not-a-date']) expect(() => addDays(key, 1)).toThrow()
    expect(() => addDays('2026-01-01', 0.5)).toThrow()
  })
})
