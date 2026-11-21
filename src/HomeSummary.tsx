import { getHomeSummary } from './lib/homeSummary'
import type { Habit, HabitLog } from './lib/types'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'

export default function HomeSummary({ habits, logs, date, studyRepository, workoutRepository, loading, error }: {
  habits: Habit[]
  logs: HabitLog[]
  date: string
  studyRepository: ReturnType<typeof createStudyTimeRepository>
  workoutRepository: WorkoutSetRepository
  loading: boolean
  error: boolean
}) {
  let summary
  try { summary = getHomeSummary(habits, logs, studyRepository.listDays(), workoutRepository.listAllSets(), date) }
  catch { /* The summary must not claim completion when records cannot be read. */ }
  function goToInput(target: string) {
    const element = document.getElementById(target)
    element?.scrollIntoView({ block: 'center', behavior: 'instant' })
    element?.focus({ preventScroll: true })
  }
  return <section className="home-summary habit-card" aria-labelledby="home-heading">
    <p className="date" data-testid="today-date">{date.replaceAll('-', '.')} <span>日本時間</span></p>
    <h1 id="home-heading">今日の記録</h1>
    {loading ? <p role="status">読み込み中…</p> : error ? <p>今日の記録を確認できません。</p> : !summary ? <p role="alert">今日の記録を読み込めませんでした。</p> : <>
      <p className="summary-streak">🔥 {summary.streak}日連続 <small>いずれかの習慣を記録</small></p>
      <div aria-live="polite">
        <h2>{summary.allDone ? '✓ 達成済み' : '未記録の項目'}</h2>
        {summary.allDone ? <p>今日も記録できました。おつかれさまでした！</p> : <ul>{summary.unrecorded.map((item) => <li key={item.target}><button onClick={() => goToInput(item.target)}>{item.label} →</button></li>)}</ul>}
      </div>
    </>}
  </section>
}
