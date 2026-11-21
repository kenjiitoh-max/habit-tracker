import { useEffect, useReducer, useState } from 'react'
import { getLevel, XP_CHANGED, XP_PER_LEVEL } from './lib/xp'
import type { XpRepository } from './lib/xp'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'
import type { BodyRepository } from './lib/bodyStorage'

export default function XpCard({ repository, studyRepository, workoutRepository, bodyRepository }: {
  repository: XpRepository
  studyRepository: ReturnType<typeof createStudyTimeRepository>
  workoutRepository: WorkoutSetRepository
  bodyRepository: BodyRepository
}) {
  const [, refresh] = useReducer((value: number) => value + 1, 0)
  const [error, setError] = useState(false)
  useEffect(() => {
    window.addEventListener(XP_CHANGED, refresh)
    window.addEventListener('storage', refresh)
    let active = true
    bodyRepository.listMeasurements().then((measurements) => {
      if (active) repository.backfill(studyRepository.listDays(), workoutRepository.listAllSets(), measurements)
    }).catch(() => { if (active) setError(true) })
    return () => {
      active = false
      window.removeEventListener(XP_CHANGED, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [repository, studyRepository, workoutRepository, bodyRepository])
  const { totalXp } = repository.read()
  const { level, xpIntoLevel, xpToNext } = getLevel(totalXp)
  return <section className="xp-card habit-card" aria-label="レベルとXP">
    <div className="xp-heading"><h2>レベル {level}</h2><span data-testid="total-xp">累計 {totalXp} XP</span></div>
    <progress aria-label="次のレベルまでのXP" value={xpIntoLevel} max={XP_PER_LEVEL} />
    <p>あと {xpToNext} XP で次のレベル</p>
    {error && <p className="error" role="alert">過去の記録のXPを反映できませんでした。再読み込みで再試行できます。</p>}
  </section>
}
