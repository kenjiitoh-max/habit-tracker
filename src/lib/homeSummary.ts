import type { CardioSession } from './cardio'
import { getStreak } from './streak'
import { addDays } from './date'
import { streakStart } from './streakMilestones'
import { getActivityHistory } from './activity'
import { studyServices } from './studyTime'
import type { StudyDays, StudyService } from './studyTime'
import type { Habit, HabitLog } from './types'
import type { WorkoutSet } from './workoutSets'

export function getHomeSummary(habits: Habit[], logs: HabitLog[], days: StudyDays, sets: WorkoutSet[], date: string, cardio: CardioSession[] = []) {
  const recorded = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) && value >= 0
  const items = [
    { label: '筋トレ', target: 'workout-exercise', done: sets.some((set) => set.date === date) },
    ...(Object.keys(studyServices) as StudyService[]).map((service) => ({
      label: studyServices[service], target: `study-${service}`, done: recorded(days[date]?.[service]),
    })),
    ...habits.filter(({ name, unit }) => name !== '筋トレ' && !(name === '英語トレーニング' && unit === '分'))
      .map((habit) => ({ label: habit.name, target: `habit-${habit.id}`, done: logs.some((log) => log.habitId === habit.id && log.date === date && log.done) })),
  ]
  const activityDates = new Set([
    ...logs.filter((log) => log.done && habits.some((habit) => habit.id === log.habitId)).map((log) => log.date),
    ...Object.entries(days).filter(([, minutes]) => minutes && Object.values(minutes).some(recorded)).map(([day]) => day),
    ...sets.map((set) => set.date),
    ...cardio.map((session) => session.date),
  ])
  const streak = getStreak('activity', [...activityDates].map((day) => ({ habitId: 'activity', date: day, done: true })), date)
  const unrecorded = items.filter((item) => !item.done)
  return {
    unrecorded, allDone: unrecorded.length === 0, streak,
    streakStart: streak > 0 ? streakStart(streak, activityDates.has(date) ? date : addDays(date, -1)) : null,
    ...getActivityHistory([...activityDates], date),
  }
}
