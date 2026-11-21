import { useState } from 'react'
import { studyServices } from './lib/studyTime'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { Habit, HabitLog } from './lib/types'

interface Props {
  date: string
  habits: Habit[]
  logs: HabitLog[]
  studyTimeRepository: ReturnType<typeof createStudyTimeRepository>
  onBack: () => void
}

export default function YesterdayRecords({ date, habits, logs, studyTimeRepository, onBack }: Props) {
  const [minutes] = useState(() => {
    try { return studyTimeRepository.getMinutes(date) }
    catch { return null }
  })
  const completed = new Map(logs.filter((log) => log.date === date && log.done).map((log) => [log.habitId, log]))
  const habitRows = habits.flatMap((habit) => {
    const log = completed.get(habit.id)
    if (!log) return []
    return [{
      id: habit.id,
      name: habit.name,
      value: log.value === undefined ? '記録済み（数値なし）' : [log.value, habit.unit].filter((part) => part !== undefined).join(' '),
    }]
  })
  const studyRows = (Object.keys(studyServices) as (keyof typeof studyServices)[]).flatMap((service) => {
    const value = minutes?.[service]
    return value === undefined ? [] : [{ id: service, name: studyServices[service], value: `${value} 分` }]
  })

  return (
    <section className="yesterday-view" aria-labelledby="yesterday-heading">
      <h1 id="yesterday-heading">昨日の記録</h1>
      <p className="date"><time dateTime={date}>{date.replaceAll('-', '.')}</time> <span>日本時間</span></p>
      {habitRows.length > 0 && <RecordList title="わたしの習慣" rows={habitRows} />}
      {studyRows.length > 0 && <RecordList title="英語学習" rows={studyRows} />}
      {minutes === null && <p className="error" role="alert">学習時間を読み込めませんでした。再読み込みしてください。</p>}
      {minutes !== null && !habitRows.length && !studyRows.length && (
        <p className="habit-card empty">昨日の記録はありません。</p>
      )}
      <button className="secondary yesterday-back" onClick={onBack}>今日の入力へ戻る</button>
    </section>
  )
}

function RecordList({ title, rows }: { title: string; rows: { id: string; name: string; value: string }[] }) {
  return (
    <>
      <div className="section-heading"><h2>{title}</h2></div>
      <dl className="habit-card yesterday-list">
        {rows.map((row) => (
          <div key={row.id}><dt>{row.name}</dt><dd>{row.value}</dd></div>
        ))}
      </dl>
    </>
  )
}
