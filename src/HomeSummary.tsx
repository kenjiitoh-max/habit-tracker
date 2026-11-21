import { useEffect, useReducer } from 'react'
import { getHomeSummary } from './lib/homeSummary'
import type { Exercise, Habit, HabitLog } from './lib/types'
import { countPersonalBestUpdates } from './lib/activity'
import { COMEBACK_XP, getLevel, XP_CHANGED } from './lib/xp'
import type { XpRepository } from './lib/xp'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'

export default function HomeSummary({ habits, logs, date, studyRepository, workoutRepository, loading, error, exercises = [], xpRepository }: {
  habits: Habit[]
  logs: HabitLog[]
  date: string
  studyRepository: ReturnType<typeof createStudyTimeRepository>
  workoutRepository: WorkoutSetRepository
  loading: boolean
  error: boolean
  exercises?: Exercise[]
  xpRepository?: XpRepository
}) {
  const [, refresh] = useReducer((value: number) => value + 1, 0)
  useEffect(() => {
    window.addEventListener(XP_CHANGED, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(XP_CHANGED, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  let summary
  let updates = 0
  try {
    const sets = workoutRepository.listAllSets()
    summary = getHomeSummary(habits, logs, studyRepository.listDays(), sets, date)
    if (summary.broken) updates = countPersonalBestUpdates(sets.filter((set) => set.date <= date), exercises)
  }
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
      {xpRepository?.hasComeback(date) && <p className="comeback-bonus" role="status"><strong>🎉 復帰ボーナス +{COMEBACK_XP} XP</strong><br />おかえりなさい！また始めてくれてうれしいです。ここからもう一度積み上げましょう。</p>}
      {summary.broken && <section className="streak-break" aria-label="積み上げた成果">
        <h2>おかえりなさい！</h2>
        <p>連続は一度リセットされましたが、積み上げは残っています。今日からまた始めましょう！</p>
        {summary.comebackDay && <p className="comeback-hint">今日記録すると、復帰ボーナス <strong>+{COMEBACK_XP} XP</strong> がもらえます。</p>}
        <ul>
          <li>累計記録日数 {summary.totalDays}日</li>
          <li>レベル Lv.{getLevel(xpRepository?.read().totalXp ?? 0).level}</li>
          <li>自己ベスト更新 {updates}回</li>
        </ul>
        {summary.longest && <p className="streak-hall">🏆 殿堂入り 最長ストリーク {summary.longest.length}日<br /><small>{summary.longest.start}〜{summary.longest.end}</small></p>}
        <small>集計対象：習慣チェック・学習記録・筋トレのいずれかを記録した日（体の測定は含みません）</small>
      </section>}
      <div aria-live="polite">
        <h2>{summary.allDone ? '✓ 達成済み' : '未記録の項目'}</h2>
        {summary.allDone ? <p>今日も記録できました。おつかれさまでした！</p> : <ul>{summary.unrecorded.map((item) => <li key={item.target}><button onClick={() => goToInput(item.target)}>{item.label} →</button></li>)}</ul>}
      </div>
    </>}
  </section>
}
