import { addDays } from './date'

export const STREAK_MILESTONES_KEY = 'habit-tracker:streak-milestones:v1'
export const STREAK_MILESTONES = [7, 30, 100] as const

export function reachedMilestone(streak: number) {
  return [...STREAK_MILESTONES].reverse().find((milestone) => streak >= milestone) ?? null
}

export function nextMilestone(streak: number) {
  return STREAK_MILESTONES.find((milestone) => streak < milestone) ?? null
}

export function streakStart(streak: number, lastActiveDate: string) {
  return addDays(lastActiveDate, 1 - streak)
}

function readStored(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(STREAK_MILESTONES_KEY) ?? 'null')
    return Array.isArray(data?.celebrated) ? data.celebrated.filter((item: unknown) => typeof item === 'string') : []
  } catch { return [] }
}

export function createStreakMilestoneRepository(demo = false) {
  let memory: string[] = []
  const read = () => demo ? [...memory] : readStored()
  return {
    /** The highest milestone reached in the run starting at `start` that has not been celebrated yet. */
    pending(streak: number, start: string): { key: string; milestone: number } | null {
      const milestone = reachedMilestone(streak)
      if (!milestone) return null
      const key = `${start}:${milestone}`
      return read().includes(key) ? null : { key, milestone }
    },
    markCelebrated(key: string) {
      const celebrated = read()
      if (celebrated.includes(key)) return
      const next = [...celebrated, key].slice(-50)
      if (demo) memory = next
      else {
        try { localStorage.setItem(STREAK_MILESTONES_KEY, JSON.stringify({ celebrated: next })) } catch { /* Celebrating again is better than failing the home screen. */ }
      }
    },
  }
}

export type StreakMilestoneRepository = ReturnType<typeof createStreakMilestoneRepository>
