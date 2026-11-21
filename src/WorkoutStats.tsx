import { useEffect, useId, useState } from 'react'
import type { HabitRepository } from './lib/storage'
import { getWorkoutDays } from './lib/workoutStats'
import type { WorkoutDay } from './lib/workoutStats'
import type { WorkoutSet, WorkoutSetRepository } from './lib/workoutSets'
import type { Exercise } from './lib/types'

const number = new Intl.NumberFormat('ja-JP', { maximumSignificantDigits: 15 })
const axisNumber = new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 2 })
const formatWeight = (value: number | null) => value === null ? '—' : `${number.format(value)} kg`
const timestamp = (date: string) => Date.parse(`${date}T00:00:00Z`)
const metrics = { maxWeight: '最大重量', volume: '総挙上量' } as const

function WorkoutChart({ days, metric }: { days: WorkoutDay[]; metric: keyof typeof metrics }) {
  const id = useId()
  const points = days.flatMap(({ date, [metric]: value }) => value === null ? [] : [{ date, value }])
  const max = points.reduce((highest, { value }) => Math.max(highest, value), 0)
  const first = days[0].date
  const last = days[days.length - 1].date
  const start = timestamp(first)
  const span = timestamp(last) - start
  const x = (date: string) => span === 0 ? 175 : 51 + (timestamp(date) - start) * 249 / span
  const y = (value: number) => max === 0 ? 87 : 87 - value / max * 66

  return (
    <div className="workout-chart">
      <h3 id={id}>{metrics[metric]}（kg）</h3>
      <svg className="stats-chart" viewBox="0 0 320 114" role="img" aria-labelledby={id}>
        {(max === 0 ? [0] : [0, max / 2, max]).map((tick) => <g key={tick}>
          <line x1="51" x2="300" y1={y(tick)} y2={y(tick)} className="body-chart-grid" />
          <text x="44" y={y(tick) + 3} textAnchor="end" className="chart-label">{axisNumber.format(tick)}</text>
        </g>)}
        {points.length > 1 && <polyline points={points.map(({ date, value }) => `${x(date)},${y(value)}`).join(' ')} />}
        {points.map(({ date, value }) => <circle key={date} cx={x(date)} cy={y(value)} r="3.5">
          <title>{date}：{formatWeight(value)}</title>
        </circle>)}
        {(first === last ? [first] : [first, last]).map((date) =>
          <text key={date} x={x(date)} y="108" textAnchor="middle" className="chart-label">{date.slice(5).replace('-', '/')}</text>
        )}
      </svg>
    </div>
  )
}

interface Props { repository: HabitRepository; workoutRepository: WorkoutSetRepository }
interface Records { exercises: Exercise[]; sets: WorkoutSet[] }

export default function WorkoutStats({ repository, workoutRepository }: Props) {
  const [records, setRecords] = useState<Records | null>()
  const [exerciseId, setExerciseId] = useState('')

  useEffect(() => {
    let active = true
    repository.listExercises()
      .then((exercises) => { if (active) setRecords({ exercises, sets: workoutRepository.listAllSets() }) })
      .catch(() => { if (active) setRecords(null) })
    return () => { active = false }
  }, [repository, workoutRepository])

  const weightedIds = new Set(records?.sets.filter((set) => set.weightKg !== undefined).map((set) => set.exerciseId))
  const recordedIds = new Set(records?.sets.map((set) => set.exerciseId))
  const selectedId = exerciseId || records?.exercises.find((exercise) => weightedIds.has(exercise.id))?.id
    || records?.exercises.find((exercise) => recordedIds.has(exercise.id))?.id || records?.exercises[0]?.id
  const days = records && selectedId ? getWorkoutDays(records.sets, selectedId) : []
  const hasWeights = days.some(({ maxWeight }) => maxWeight !== null)

  return (
    <section className="stats-card workout-stats" aria-labelledby="workout-stats-heading">
      <div className="stats-card-title"><h2 id="workout-stats-heading">筋トレの推移</h2><span>日本時間</span></div>
      {records === undefined ? <p role="status">読み込み中…</p> :
        records === null ? <p className="error" role="alert">筋トレの記録を読み込めませんでした。</p> :
        records.exercises.length === 0 ? <p className="empty">種目を追加すると、ここで推移を確認できます。</p> : <>
          <label className="workout-stats-picker">
            種目
            <select value={selectedId} onChange={(event) => setExerciseId(event.target.value)}>
              {records.exercises.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          {days.length === 0 ? <p className="empty">この種目の記録はまだありません。</p> : <>
            {hasWeights ? <>
              <p className="stats-range">{days[0].date}{days.length > 1 && ` 〜 ${days[days.length - 1].date}`}</p>
              <WorkoutChart days={days} metric="maxWeight" />
              <WorkoutChart days={days} metric="volume" />
              <p className="stats-explanation">総挙上量は、各セットの「重量 × 回数」の日別合計です。未記録日や重量のない日には点を表示しません。</p>
            </> : <p className="empty">重量の記録がないため、最大重量・総挙上量は表示できません。</p>}
            <details className="daily-details">
              <summary>日別の筋トレデータを見る</summary>
              <table>
                <caption>日別の筋トレ記録（— は重量の記録なし）</caption>
                <thead><tr><th scope="col">日付</th><th scope="col">最大重量</th><th scope="col">総挙上量</th></tr></thead>
                <tbody>{days.map(({ date, maxWeight, volume }) => <tr key={date}>
                  <th scope="row">{date}</th><td>{formatWeight(maxWeight)}</td><td>{formatWeight(volume)}</td>
                </tr>)}</tbody>
              </table>
            </details>
          </>}
        </>}
    </section>
  )
}
