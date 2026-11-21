import { addDays } from './date'

export const studyServices = {
  shadoten: 'シャドテン',
  spiful: 'スピフル',
} as const

export type StudyService = keyof typeof studyServices
type StudyMinutes = Partial<Record<StudyService, number>>
export type StudyDays = Record<string, StudyMinutes>

const STORAGE_KEY = 'habit-tracker:study-time:v1'

function readStoredDays(): StudyDays {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return {}
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('学習時間を読み込めませんでした。')
  }
  return data as StudyDays
}

export function createStudyTimeRepository(demoDate?: string) {
  let demoDays: StudyDays = demoDate ? {
    [demoDate]: { shadoten: 20, spiful: 10 },
    [addDays(demoDate, -1)]: { shadoten: 25, spiful: 15 },
    [addDays(demoDate, -2)]: { shadoten: 0, spiful: 10 },
    [addDays(demoDate, -4)]: { shadoten: 30, spiful: 20 },
    [addDays(demoDate, -8)]: { shadoten: 15, spiful: 15 },
    [addDays(demoDate, -15)]: { shadoten: 25, spiful: 10 },
    [addDays(demoDate, -36)]: { shadoten: 10, spiful: 15 },
    [addDays(demoDate, -62)]: { shadoten: 15, spiful: 5 },
  } : {}
  const read = () => demoDate ? demoDays : readStoredDays()

  return {
    listDays: read,
    getMinutes(date: string): StudyMinutes {
      return read()[date] ?? {}
    },
    saveMinutes(date: string, service: StudyService, minutes: number) {
      const days = read()
      const nextDays = { ...days, [date]: { ...days[date], [service]: minutes } }
      if (demoDate) demoDays = nextDays
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDays))
    },
  }
}
