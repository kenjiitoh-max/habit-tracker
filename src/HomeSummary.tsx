import { useEffect, useReducer, useState } from 'react'
import { getHomeSummary } from './lib/homeSummary'
import type { Exercise, Habit, HabitLog } from './lib/types'
import { countPersonalBestUpdates } from './lib/activity'
import { nextMilestone, reachedMilestone } from './lib/streakMilestones'
import type { StreakMilestoneRepository } from './lib/streakMilestones'
import { getLevel, XP_CHANGED } from './lib/xp'
import type { XpRepository } from './lib/xp'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'

export default function HomeSummary({ habits, logs, date, studyRepository, workoutRepository, loading, error, exercises = [], xpRepository, milestoneRepository }: {
  habits: Habit[]
  logs: HabitLog[]
  date: string
  studyRepository: ReturnType<typeof createStudyTimeRepository>
  workoutRepository: WorkoutSetRepository
  loading: boolean
  error: boolean
  exercises?: Exercise[]
  xpRepository?: XpRepository
  milestoneRepository?: StreakMilestoneRepository
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
  const [celebration, setCelebration] = useState<{ key: string; milestone: number } | null>(null)
  const [dismissed, setDismissed] = useState('')
  const pending = !loading && !error && summary?.streakStart && milestoneRepository ? milestoneRepository.pending(summary.streak, summary.streakStart) : null
  if (pending && pending.key !== celebration?.key && pending.key !== dismissed) setCelebration(pending)
  const pendingKey = pending?.key
  useEffect(() => {
    if (pendingKey) milestoneRepository?.markCelebrated(pendingKey)
  }, [pendingKey, milestoneRepository])
  function goToInput(target: string) {
    const element = document.getElementById(target)
    element?.scrollIntoView({ block: 'center', behavior: 'instant' })
    element?.focus({ preventScroll: true })
  }
  return <section className="home-summary habit-card" aria-labelledby="home-heading">
    <p className="date" data-testid="today-date">{date.replaceAll('-', '.')} <span>日本時間</span></p>
    <h1 id="home-heading">今日の記録</h1>
    {loading ? <p role="status">読み込み中…</p> : error ? <p>今日の記録を確認できません。</p> : !summary ? <p role="alert">今日の記録を読み込めませんでした。</p> : <>
      <StreakFlame streak={summary.streak} />
      {celebration && celebration.key !== dismissed && celebration.key === `${summary.streakStart}:${reachedMilestone(summary.streak)}` && <section className="streak-celebration" role="status" aria-label="ストリークの節目">
        <span className="streak-celebration-mark" aria-hidden="true">🎉</span>
        <h2>{celebration.milestone}日連続、達成！</h2>
        <p>{celebration.milestone >= 100 ? '100日の大台です。積み上げた習慣は本物です！' : celebration.milestone >= 30 ? '1か月続きました。すっかり習慣になっています！' : '1週間続きました。この調子でいきましょう！'}</p>
        <button type="button" onClick={() => setDismissed(celebration.key)}>閉じる</button>
      </section>}
      {summary.broken && <section className="streak-break" aria-label="積み上げた成果">
        <h2>おかえりなさい！</h2>
        <p>連続は一度リセットされましたが、積み上げは残っています。今日からまた始めましょう！</p>
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

function StreakFlame({ streak }: { streak: number }) {
  const reached = reachedMilestone(streak)
  const next = nextMilestone(streak)
  return <div className={`summary-streak streak-flame streak-tier-${reached ?? (streak > 0 ? 'lit' : 'out')}`} data-testid="summary-streak">
    <span className="streak-flame-icon" aria-hidden="true">{streak > 0 ? '🔥' : '・'}</span>
    <p><strong>{streak}日連続</strong> <small>いずれかの習慣を記録</small></p>
    <p className="streak-flame-next">
      {reached && <span className="streak-flame-badge">節目 {reached}日 達成</span>}
      {next ? <span>次の節目 {next}日まであと{next - streak}日</span> : <span>すべての節目を達成！</span>}
    </p>
  </div>
}
