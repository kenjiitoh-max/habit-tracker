export const studyServices = {
  shadoten: 'シャドテン',
  spiful: 'スピフル',
} as const

type StudyService = keyof typeof studyServices
type StudyMinutes = Partial<Record<StudyService, number>>
type StudyDays = Record<string, StudyMinutes>

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
  let demoDays: StudyDays = demoDate ? { [demoDate]: { shadoten: 20, spiful: 10 } } : {}
  const read = () => demoDate ? demoDays : readStoredDays()

  return {
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
