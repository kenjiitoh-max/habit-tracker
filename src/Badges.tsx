import { useEffect, useState } from 'react'
import { badges, createBadgeRepository, earnedBadges, getBadgeMetrics } from './lib/badges'
import type { Exercise, Habit, HabitLog } from './lib/types'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'

export default function Badges({ habits, logs, exercises, date, studyRepository, workoutRepository, demo, loading, error }: {
  habits: Habit[]; logs: HabitLog[]; exercises: Exercise[]; date: string
  studyRepository: ReturnType<typeof createStudyTimeRepository>; workoutRepository: WorkoutSetRepository
  demo: boolean; loading: boolean; error: boolean
}) {
  const [repository] = useState(() => createBadgeRepository(demo))
  const [saveError, setSaveError] = useState(false)
  let metrics: ReturnType<typeof getBadgeMetrics> | undefined
  let earned: string[] = []
  try {
    if (!loading && !error) {
      metrics = getBadgeMetrics(habits, logs, studyRepository.listDays(), workoutRepository.listAllSets(), exercises, date)
      earned = earnedBadges(metrics, repository.read())
    }
  } catch { metrics = undefined }
  useEffect(() => {
    if (!metrics) return
    let active = true
    const current = metrics
    Promise.resolve().then(() => repository.award(current)).catch(() => { if (active) setSaveError(true) })
    return () => { active = false }
  }, [metrics, repository])
  return <section className="habit-card badges" aria-labelledby="badges-heading">
    <h2 id="badges-heading">実績バッジ</h2>
    <p>積み重ねた成果は、連続記録が途切れても消えません。</p>
    {loading ? <p role="status">読み込み中…</p> : error ? <p>実績を確認できません。</p> : !metrics ? <p role="alert">実績を読み込めませんでした。再読み込みしてください。</p> : <>
      <details><summary>バッジを見る（獲得 {earned.length} / {badges.length}）</summary>
        <ul className="badge-list">{badges.map((badge) => <li key={badge.id} data-earned={earned.includes(badge.id)}>
          <span aria-hidden="true">{earned.includes(badge.id) ? '🏅' : '◇'}</span>
          <div><strong>{badge.condition}</strong><small>{earned.includes(badge.id) ? '獲得済み' : '未獲得'}</small></div>
        </li>)}</ul>
        <p className="small-note">記録日数は習慣・学習・筋トレが対象（体の測定は除く）。自己ベストは初回を除き、重量・回数・総挙上量それぞれの更新を数えます。英語はシャドテン・スピフルの合計です。</p>
      </details>
      {saveError && <p role="alert">実績を保存できませんでした。保存設定を確認して再読み込みしてください。</p>}
    </>}
  </section>
}
