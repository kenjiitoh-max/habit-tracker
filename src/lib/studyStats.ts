import { addDays } from './date'
import type { StudyDays, StudyService } from './studyTime'
import type { Habit, HabitLog } from './types'

export type StudyPeriod = 'day' | 'week' | 'month'
export type StudyScope = 'total' | StudyService

const TREND_LENGTH = 7
const weekStart = (date: string) => {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  return addDays(date, -((weekday + 6) % 7))
}

function periodStart(date: string, period: StudyPeriod, offset: number): string {
  if (period === 'month') {
    const month = new Date(`${date.slice(0, 7)}-01T00:00:00Z`)
    month.setUTCMonth(month.getUTCMonth() + offset)
    return month.toISOString().slice(0, 10)
  }
  return period === 'week' ? addDays(weekStart(date), offset * 7) : addDays(date, offset)
}

export function getLegacyStudyLogs(habits: readonly Habit[], logs: readonly HabitLog[]) {
  // The original habit has no stable ID; only match its original name and unit.
  const ids = new Set(habits.filter(({ name, unit }) => name === '英語トレーニング' && unit === '分').map(({ id }) => id))
  return logs.filter(({ habitId, done }) => done && ids.has(habitId))
}

function isMinutes(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0
}

function sumMinutes(values: readonly (number | undefined)[]) {
  return values.filter(isMinutes).reduce<number | null>((sum, value) => (sum ?? 0) + value, null)
}

export function getStudyStats(days: StudyDays, legacyLogs: readonly HabitLog[], today: string, period: StudyPeriod, scope: StudyScope) {
  const entries = Object.entries(days).filter(([date]) => date <= today)
  const legacy = scope === 'total' ? legacyLogs.filter(({ date }) => date <= today) : []
  const summarize = (start?: string, end = today) => {
    const minutes = sumMinutes(entries.flatMap(([date, day]) => {
      if ((start && date < start) || date > end) return []
      return scope === 'total' ? [day.shadoten, day.spiful] : [day[scope]]
    }))
    const records = legacy.filter(({ date }) => (!start || date >= start) && date <= end)
    const legacyMinutes = records.map(({ value }) => value)
    return { minutes, legacyMinutes: sumMinutes(legacyMinutes), untimed: legacyMinutes.filter((value) => !isMinutes(value)).length }
  }
  const trend = Array.from({ length: TREND_LENGTH }, (_, index) => {
    const offset = index - TREND_LENGTH + 1
    const start = periodStart(today, period, offset)
    const end = offset === 0 ? today : addDays(periodStart(today, period, offset + 1), -1)
    return { start, end, ...summarize(start, end) }
  })
  return { trend, current: trend[trend.length - 1], lifetime: summarize() }
}
