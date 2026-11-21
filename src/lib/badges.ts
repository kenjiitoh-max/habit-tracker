import { countPersonalBestUpdates } from './activity'
import { getHomeSummary } from './homeSummary'
import type { Habit, HabitLog, Exercise } from './types'
import type { StudyDays } from './studyTime'
import type { WorkoutSet } from './workoutSets'

export const BADGES_KEY = 'habit-tracker:badges:v1'
export const badges = [
  ...[7, 30, 100].map((target) => ({ id: `days-${target}`, metric: 'days' as const, target, condition: `累計記録日数 ${target}日` })),
  ...[1, 5, 20].map((target) => ({ id: `bests-${target}`, metric: 'bests' as const, target, condition: `自己ベスト更新 ${target}回` })),
  ...[10, 50, 100].map((hours) => ({ id: `english-${hours}`, metric: 'minutes' as const, target: hours * 60, condition: `英語の累計時間 ${hours}時間` })),
]

export function getBadgeMetrics(habits: Habit[], logs: HabitLog[], study: StudyDays, sets: WorkoutSet[], exercises: Exercise[], date: string) {
  return {
    days: getHomeSummary(habits, logs, study, sets, date).totalDays,
    bests: countPersonalBestUpdates(sets.filter((set) => set.date <= date), exercises),
    minutes: Object.entries(study).filter(([day]) => day <= date).reduce((sum, [, values]) => sum + Object.values(values).reduce((total, value) => total + (Number.isFinite(value) && value > 0 ? value : 0), 0), 0),
  }
}

export function earnedBadges(metrics: ReturnType<typeof getBadgeMetrics>, previous: readonly string[] = []) {
  return badges.filter((badge) => previous.includes(badge.id) || metrics[badge.metric] >= badge.target).map((badge) => badge.id)
}

export function createBadgeRepository(demo = false) {
  let memory: string[] = []
  const read = (): string[] => {
    if (demo) return [...memory]
    const data: unknown = JSON.parse(localStorage.getItem(BADGES_KEY) ?? '[]')
    if (!Array.isArray(data) || !data.every((id) => typeof id === 'string')) throw new Error('実績を読み込めませんでした。')
    return data
  }
  return {
    read,
    award(metrics: ReturnType<typeof getBadgeMetrics>) {
      const previous = read()
      const next = earnedBadges(metrics, previous)
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        if (demo) memory = next
        else localStorage.setItem(BADGES_KEY, JSON.stringify(next))
      }
      return next
    },
  }
}
