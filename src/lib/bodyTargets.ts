import type { BodyMeasurement } from './bodyStorage'
import { isDemoMode } from './storage'

export type BodyTargets = Pick<BodyMeasurement, 'weightKg' | 'bodyFatPercent'>
export const BODY_TARGETS_KEY = 'habit-tracker:body-targets:v1'

function validate(input: unknown): BodyTargets {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('目標の形式が正しくありません。')
  const result: BodyTargets = {}
  for (const key of ['weightKg', 'bodyFatPercent'] as const) {
    if (!(key in input)) continue
    const value = (input as BodyTargets)[key]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value >= (key === 'weightKg' ? 500 : 100)) {
      throw new Error('目標の数値が正しくありません。')
    }
    result[key] = value
  }
  return result
}

export function createTargetRepository(demo: boolean) {
  let targets: BodyTargets = { weightKg: 68, bodyFatPercent: 17 }
  return {
    async load(): Promise<BodyTargets> {
      if (demo) return { ...targets }
      const raw = localStorage.getItem(BODY_TARGETS_KEY)
      return raw === null ? {} : validate(JSON.parse(raw))
    },
    async save(input: BodyTargets): Promise<BodyTargets> {
      const next = validate(input)
      if (demo) targets = next
      else localStorage.setItem(BODY_TARGETS_KEY, JSON.stringify(next))
      return { ...next }
    },
  }
}

const realRepository = createTargetRepository(false)
const demoRepository = createTargetRepository(true)
export const getTargetRepository = () => isDemoMode() ? demoRepository : realRepository

export function targetStatus(current: number | undefined, target: number | undefined, unit: string): string {
  if (target === undefined) return '目標は未設定です'
  if (current === undefined) return 'まだ測定値がありません'
  const difference = Math.round(Math.abs(current - target) * 10) / 10
  if (difference === 0) return '目標に到達しています'
  return `目標まで あと ${difference.toFixed(1)} ${unit}（現在は目標より${current > target ? '上' : '下'}）`
}

export function latestMeasurement(items: BodyMeasurement[], key: keyof BodyTargets): BodyMeasurement | undefined {
  return [...items].sort((a, b) => b.date.localeCompare(a.date)).find((item) => item[key] !== undefined)
}
