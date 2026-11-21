import type { StudyDays } from './studyTime'
import type { WorkoutSet } from './workoutSets'

export const XP_STORAGE_KEY = 'habit-tracker:xp:v1'
export const STUDY_XP = 10
export const WORKOUT_SET_XP = 10
export const XP_PER_LEVEL = 100
export const XP_CHANGED = 'habit-tracker:xp-changed'
export interface XpData { totalXp: number; awarded: Record<string, number> }
const empty = (): XpData => ({ totalXp: 0, awarded: {} })

function readStored(): XpData {
  try {
    const data = JSON.parse(localStorage.getItem(XP_STORAGE_KEY) ?? 'null')
    if (!data || !Number.isSafeInteger(data.totalXp) || data.totalXp < 0
      || !data.awarded || typeof data.awarded !== 'object' || Array.isArray(data.awarded)
      || !Object.values(data.awarded).every((value) => Number.isSafeInteger(value) && (value as number) > 0)) return empty()
    return data
  } catch { return empty() }
}

export function getLevel(totalXp: number) {
  const xpIntoLevel = totalXp % XP_PER_LEVEL
  return { level: Math.floor(totalXp / XP_PER_LEVEL) + 1, xpIntoLevel, xpToNext: XP_PER_LEVEL - xpIntoLevel }
}

export function createXpRepository(demo = false) {
  let memory = empty()
  const read = () => demo ? structuredClone(memory) : readStored()
  function award(key: string, amount: number) {
    const data = read()
    if (Object.hasOwn(data.awarded, key)) return
    const next = { totalXp: data.totalXp + amount, awarded: { ...data.awarded, [key]: amount } }
    if (demo) memory = next
    else localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(XP_CHANGED))
  }
  return {
    read,
    awardStudy(date: string, service: string, minutes: number) {
      if (minutes > 0) award(`study:${date}:${service}`, STUDY_XP)
    },
    awardSet(id: string) { award(`set:${id}`, WORKOUT_SET_XP) },
    backfill(days: StudyDays, sets: WorkoutSet[]) {
      for (const [date, minutes] of Object.entries(days)) {
        for (const service of ['shadoten', 'spiful'] as const) {
          if (minutes && typeof minutes[service] === 'number') this.awardStudy(date, service, minutes[service])
        }
      }
      for (const set of sets) this.awardSet(set.id)
    },
  }
}

export type XpRepository = ReturnType<typeof createXpRepository>
export const xpRepository = createXpRepository()
