import { addDays, today } from './date'
import { isDemoMode } from './storage'

export interface BodyMeasurement {
  date: string
  weightKg?: number
  bodyFatPercent?: number
}

export interface BodyRepository {
  listMeasurements(): Promise<BodyMeasurement[]>
  saveMeasurement(measurement: BodyMeasurement): Promise<BodyMeasurement | undefined>
  deleteMeasurement(date: string): Promise<void>
}

export const BODY_STORAGE_KEY = 'habit-tracker:body:v1'
const MAX_WEIGHT_KG = 500

function isValidNumber(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < max
}

export function normalizeMeasurement(input: BodyMeasurement): BodyMeasurement | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('日付が正しくありません。')
  addDays(input.date, 0)
  if (input.weightKg !== undefined && !isValidNumber(input.weightKg, MAX_WEIGHT_KG)) throw new Error('体重は0より大きく500未満で入力してください。')
  if (input.bodyFatPercent !== undefined && !isValidNumber(input.bodyFatPercent, 100)) throw new Error('体脂肪率は0より大きく100未満で入力してください。')
  if (input.weightKg === undefined && input.bodyFatPercent === undefined) return undefined
  return {
    date: input.date,
    ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
    ...(input.bodyFatPercent === undefined ? {} : { bodyFatPercent: input.bodyFatPercent }),
  }
}

const byDateDesc = (a: BodyMeasurement, b: BodyMeasurement) => b.date.localeCompare(a.date)

export function createMemoryBodyRepository(initial: BodyMeasurement[] = []): BodyRepository {
  let items = initial.map((item) => ({ ...item }))
  return {
    async listMeasurements() {
      return [...items].sort(byDateDesc).map((item) => ({ ...item }))
    },
    async saveMeasurement(measurement) {
      const next = normalizeMeasurement(measurement)
      items = items.filter((item) => item.date !== measurement.date)
      if (next) items.push(next)
      return next && { ...next }
    },
    async deleteMeasurement(date) {
      items = items.filter((item) => item.date !== date)
    },
  }
}

function read(): BodyMeasurement[] {
  const raw = localStorage.getItem(BODY_STORAGE_KEY)
  if (raw === null) return []
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('measurements' in data) || !Array.isArray(data.measurements)) {
    throw new Error('体の記録を読み込めませんでした。')
  }
  return data.measurements as BodyMeasurement[]
}

function write(measurements: BodyMeasurement[]): void {
  localStorage.setItem(BODY_STORAGE_KEY, JSON.stringify({ measurements }))
}

const repository: BodyRepository = {
  async listMeasurements() {
    return read().sort(byDateDesc)
  },
  async saveMeasurement(measurement) {
    const next = normalizeMeasurement(measurement)
    const items = read().filter((item) => item.date !== measurement.date)
    if (next) items.push(next)
    write(items)
    return next
  },
  async deleteMeasurement(date) {
    write(read().filter((item) => item.date !== date))
  },
}

export function createDemoBodyRepository(todayKey: string): BodyRepository {
  const measurements: BodyMeasurement[] = []
  for (let offset = 59; offset >= 0; offset--) {
    if (offset % 7 === 3 || offset % 11 === 5) continue
    const trend = 72.4 - (59 - offset) * 0.03
    const wave = Math.sin(offset * 1.7) * 0.4
    const weightKg = Math.round((trend + wave) * 10) / 10
    const bodyFatPercent = offset % 3 === 1 ? undefined : Math.round((19.8 - (59 - offset) * 0.02 + Math.cos(offset) * 0.3) * 10) / 10
    measurements.push({ date: addDays(todayKey, -offset), weightKg, ...(bodyFatPercent === undefined ? {} : { bodyFatPercent }) })
  }
  return createMemoryBodyRepository(measurements)
}

let demoRepository: BodyRepository | undefined

export function getBodyRepository(): BodyRepository {
  if (isDemoMode()) {
    demoRepository ??= createDemoBodyRepository(today())
    return demoRepository
  }
  return repository
}
