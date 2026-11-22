import type { CardioRepository } from './lib/cardio'
import { useEffect, useReducer, useState } from 'react'
import { getLevel, XP_CHANGED, XP_PER_LEVEL } from './lib/xp'
import type { XpRepository } from './lib/xp'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'
import type { BodyRepository } from './lib/bodyStorage'

export default function XpCard({ repository, studyRepository, workoutRepository, bodyRepository, cardioRepository }: {
  repository: XpRepository
  studyRepository: ReturnType<typeof createStudyTimeRepository>
  cardioRepository?: CardioRepository
  workoutRepository: WorkoutSetRepository
  bodyRepository: BodyRepository
}) {
  const [, refresh] = useReducer((value: number) => value + 1, 0)
  const [error, setError] = useState(false)
  const [celebration, setCelebration] = useState<{ level: number; sequence: number } | null>(null)
  useEffect(() => {
    let previousLevel = getLevel(repository.read().totalXp).level
    let backfilling = false
    let sequence = 0
    const changed = () => {
      const nextLevel = getLevel(repository.read().totalXp).level
      if (!backfilling && nextLevel > previousLevel) setCelebration({ level: nextLevel, sequence: ++sequence })
      previousLevel = nextLevel
      refresh()
    }
    window.addEventListener(XP_CHANGED, changed)
    window.addEventListener('storage', refresh)
    let active = true
    bodyRepository.listMeasurements().catch(() => {
      if (active) setError(true)
      return []
    }).then((measurements) => {
      if (active) {
        backfilling = true
        try { repository.backfill(studyRepository.listDays(), workoutRepository.listAllSets(), measurements, cardioRepository?.listSessions()) }
        finally { backfilling = false }
      }
    }).catch(() => { if (active) setError(true) })
    return () => {
      active = false
      window.removeEventListener(XP_CHANGED, changed)
      window.removeEventListener('storage', refresh)
    }
  }, [repository, studyRepository, workoutRepository, bodyRepository, cardioRepository])
  useEffect(() => {
    if (!celebration) return
    const timer = window.setTimeout(() => setCelebration(null), 5000)
    return () => window.clearTimeout(timer)
  }, [celebration])
  const { totalXp } = repository.read()
  const { level, xpIntoLevel, xpToNext } = getLevel(totalXp)
  return <section className="xp-card habit-card" aria-label="レベルとXP">
    <div className="xp-heading"><h2>レベル {level}</h2><span data-testid="total-xp">累計 {totalXp} XP</span></div>
    <progress aria-label="次のレベルまでのXP" value={xpIntoLevel} max={XP_PER_LEVEL} />
    <p>あと {xpToNext} XP で次のレベル</p>
    {celebration && <div key={celebration.sequence} className="level-up" role="status" data-testid="level-up">
      <strong>レベルアップ！ レベル {celebration.level}</strong>
      <span>積み重ねが力になりました。おめでとう！</span>
    </div>}
    {error && <p className="error" role="alert">過去の記録のXPを反映できませんでした。再読み込みで再試行できます。</p>}
  </section>
}
