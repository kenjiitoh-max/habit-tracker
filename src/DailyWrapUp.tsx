import { useEffect, useReducer } from 'react'
import { getDailyWrapUp } from './lib/dailyWrapUp'
import { XP_CHANGED } from './lib/xp'
import type { XpRepository } from './lib/xp'
import type { Exercise, Habit, HabitLog } from './lib/types'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { WorkoutSetRepository } from './lib/workoutSets'

const labels = { weight: '最大重量', reps: '最大回数', volume: '総挙上量' }

export default function DailyWrapUp({ habits, logs, exercises, date, studyRepository, workoutRepository, xpRepository, loading, error }: {
  habits: Habit[]; logs: HabitLog[]; exercises: Exercise[]; date: string
  studyRepository: ReturnType<typeof createStudyTimeRepository>
  workoutRepository: WorkoutSetRepository; xpRepository: XpRepository
  loading: boolean; error: boolean
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
  try {
    summary = getDailyWrapUp(habits, logs, studyRepository.listDays(), workoutRepository.listAllSets(), exercises, xpRepository.read(), date)
  } catch { /* Unreadable records must not appear as an empty day. */ }
  return <section className="daily-wrap-up habit-card" aria-label="今日の締め" aria-live="polite">
    <h2>✨ 今日の締め</h2>
    <p className="date">{date.replaceAll('-', '.')} · 日本時間</p>
    {loading ? <p role="status">読み込み中…</p> : error ? <p>今日の成果を確認できません。</p> : !summary ? <p role="alert">今日の成果を読み込めませんでした。</p> : <>
      <div className="wrap-up-totals"><strong>今日 +{summary.earnedXp} XP</strong><strong>🔥 {summary.streak}日連続</strong></div>
      <small>XPは復帰ボーナスを含む · ストリークは習慣・学習・筋トレが対象</small>
      {!summary.recordedToday && <p>まだ今日の記録はありません。あなたのペースで始めましょう。</p>}
      {summary.bests.length ? <><h3>🏆 今日の自己ベスト</h3><ul>{summary.bests.map(({ exercise, best }) => <li key={`${exercise}-${best.metric}`}><strong>{exercise}</strong> · {labels[best.metric]} {best.value}{best.metric === 'reps' ? '回' : ' kg'}{best.kind === 'first' ? '（初記録）' : ''}</li>)}</ul></> : summary.recordedToday && <p>今日は自己ベスト更新なし。今日の積み重ねも力になります！</p>}
    </>}
  </section>
}
