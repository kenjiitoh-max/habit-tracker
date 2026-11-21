import { useEffect, useReducer, useState } from 'react'
import { getLevel, XP_CHANGED, XP_PER_LEVEL } from './lib/xp'
import type { XpRepository } from './lib/xp'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'

export default function XpCard({ repository, studyRepository, workoutRepository }: {
  repository: XpRepository
  studyRepository: ReturnType<typeof createStudyTimeRepository>
  workoutRepository: WorkoutSetRepository
}) {
  const [, refresh] = useReducer((value: number) => value + 1, 0)
  const [error, setError] = useState(false)
  useEffect(() => {
    window.addEventListener(XP_CHANGED, refresh)
    window.addEventListener('storage', refresh)
    let active = true
    Promise.resolve().then(() => {
      if (active) repository.backfill(studyRepository.listDays(), workoutRepository.listAllSets())
    }).catch(() => { if (active) setError(true) })
    return () => {
      active = false
      window.removeEventListener(XP_CHANGED, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [repository, studyRepository, workoutRepository])
  const { totalXp } = repository.read()
  const { level, xpIntoLevel, xpToNext } = getLevel(totalXp)
  return <section className="xp-card habit-card" aria-label="レベルとXP">
    <div className="xp-heading"><h2>レベル {level}</h2><span data-testid="total-xp">累計 {totalXp} XP</span></div>
    <progress aria-label="次のレベルまでのXP" value={xpIntoLevel} max={XP_PER_LEVEL} />
    <p>あと {xpToNext} XP で次のレベル</p>
    {error && <p className="error" role="alert">過去の記録のXPを反映できませんでした。再読み込みで再試行できます。</p>}
  </section>
}
