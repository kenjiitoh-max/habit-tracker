import type { StudyDays } from './studyTime'
import type { WorkoutSet } from './workoutSets'
import type { BodyMeasurement } from './bodyStorage'

export const XP_STORAGE_KEY = 'habit-tracker:xp:v1'
export const STUDY_XP = 10
export const WORKOUT_SET_XP = 10
export const BODY_XP = 5
export const COMEBACK_XP = 30
export const XP_PER_LEVEL = 100
export const XP_CHANGED = 'habit-tracker:xp-changed'
export interface XpData { totalXp: number; awarded: Record<string, number> }
const comebackKey = (date: string) => `comeback:${date}`
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
      if (minutes >= 1) award(`study:${date}:${service}`, STUDY_XP)
    },
    awardSet(id: string) { award(`set:${id}`, WORKOUT_SET_XP) },
    awardBody(measurement: BodyMeasurement) {
      if (measurement.weightKg !== undefined || measurement.bodyFatPercent !== undefined) award(`body:${measurement.date}`, BODY_XP)
    },
    awardComeback(date: string) { award(comebackKey(date), COMEBACK_XP) },
    hasComeback(date: string) { return Object.hasOwn(read().awarded, comebackKey(date)) },
    backfill(days: StudyDays, sets: WorkoutSet[], measurements: BodyMeasurement[] = []) {
      const data = read()
      let changed = false
      const add = (key: string, amount: number) => {
        if (Object.hasOwn(data.awarded, key)) return
        data.awarded[key] = amount
        data.totalXp += amount
        changed = true
      }
      for (const [date, minutes] of Object.entries(days)) {
        for (const service of ['shadoten', 'spiful'] as const) {
          if (minutes && typeof minutes[service] === 'number' && minutes[service] >= 1) add(`study:${date}:${service}`, STUDY_XP)
        }
      }
      for (const set of sets) add(`set:${set.id}`, WORKOUT_SET_XP)
      for (const measurement of measurements) {
        if (measurement.weightKg !== undefined || measurement.bodyFatPercent !== undefined) add(`body:${measurement.date}`, BODY_XP)
      }
      if (!changed) return
      if (demo) memory = data
      else localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(data))
      window.dispatchEvent(new Event(XP_CHANGED))
    },
  }
}

export type XpRepository = ReturnType<typeof createXpRepository>
export const xpRepository = createXpRepository()
