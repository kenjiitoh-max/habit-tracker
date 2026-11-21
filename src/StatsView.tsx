import { useState } from 'react'
import { getPeriodStats } from './lib/stats'
import type { StatsPeriod } from './lib/stats'
import type { Habit, HabitLog } from './lib/types'

interface Props { habits: Habit[]; logs: HabitLog[]; date: string }
const formatPercent = (percent: number | null) => percent === null ? '—' : `${Math.round(percent)}%`
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`

export default function StatsView({ habits, logs, date }: Props) {
  const [period, setPeriod] = useState<StatsPeriod>(7)
  const { daily, perHabit, summary } = getPeriodStats(habits, logs, date, period)
  const step = 264 / period

  return (
    <section className="stats-view" data-testid="stats-view" aria-labelledby="stats-heading">
      <p className="eyebrow">YOUR PROGRESS</p>
      <h1 id="stats-heading">積み重ねを、見える形に。</h1>
      <p className="lead">小さな一歩を、振り返ってみよう。</p>
      <div className="period-switch" aria-label="集計期間">
        <button data-testid="stats-period-week" aria-pressed={period === 7} onClick={() => setPeriod(7)}>週間</button>
        <button data-testid="stats-period-month" aria-pressed={period === 30} onClick={() => setPeriod(30)}>月間</button>
      </div>
      <div className="stats-card">
        <div className="stats-card-title"><h2>直近{period}日間の達成率</h2><span>日本時間</span></div>
        <p className="stats-range">{shortDate(daily[0].date)} — {shortDate(date)}（今日を含む）</p>
        <div className="stats-summary"><strong>{formatPercent(summary.percent)}</strong><span>期間全体の達成率<br />{summary.done} / {summary.total} 件の習慣を達成</span></div>
        <svg className="stats-chart" data-testid="stats-chart" viewBox="0 0 320 204" role="img" aria-labelledby="chart-title" aria-describedby="chart-description">
          <title id="chart-title">直近{period}日間の日別達成率</title>
          <desc id="chart-description">各日に存在した習慣のうち達成した割合。日ごとの数値は下の「日別データを見る」で確認できます。</desc>
          {[0, 50, 100].map((value) => <g key={value}>
            <line x1="36" x2="300" y1={164 - value * 1.3} y2={164 - value * 1.3} stroke="#e5eade" strokeDasharray="3 3" />
            <text x="28" y={168 - value * 1.3} textAnchor="end" className="chart-label">{value}%</text>
          </g>)}
          {daily.map((day, index) => <g key={day.date}>
            <rect x={36 + step * index + step * .18} y={164 - (day.percent ?? 0) * 1.3} width={step * .64} height={(day.percent ?? 0) * 1.3} rx="2" fill={index === daily.length - 1 ? '#355f47' : '#a8bf95'}>
              <title>{day.date}：{formatPercent(day.percent)}（{day.done}/{day.total}）</title>
            </rect>
            {day.percent === null && <circle cx={36 + step * (index + .5)} cy="164" r="2" fill="#a4afa0" />}
            {(period === 7 || (index % 7 === 0 && index < daily.length - 3) || index === daily.length - 1) && <text x={36 + step * (index + .5)} y="186" textAnchor="middle" className="chart-label">{shortDate(day.date)}</text>}
          </g>)}
        </svg>
        <p className="stats-explanation">達成した習慣 ÷ その日に存在した習慣。<br />対象の習慣がない日は「—」で表示します。</p>
        <details className="daily-details"><summary>日別データを見る</summary><table><caption>日別の達成率</caption><thead><tr><th scope="col">日付</th><th scope="col">達成数</th><th scope="col">達成率</th></tr></thead><tbody>{daily.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.done}/{day.total}</td><td>{formatPercent(day.percent)}</td></tr>)}</tbody></table></details>
      </div>
      <section className="habit-rates" aria-labelledby="habit-rates-heading">
        <h2 id="habit-rates-heading">習慣ごとの達成率</h2>
        <p className="stats-range">期間内の作成日から今日までで集計</p>
        {habits.length === 0 && <p className="empty">習慣を追加すると、ここに達成率が表示されます。</p>}
        <ul>{perHabit.map((rate, index) => <li key={rate.habitId} data-testid="habit-rate">
          <div className="rate-heading"><h3>{habits[index].name}</h3><strong>{formatPercent(rate.percent)}</strong></div>
          <div className="rate-track" aria-hidden="true"><span style={{ width: `${rate.percent ?? 0}%` }} /></div>
          <p>{rate.done} / {rate.total} 日達成</p>
        </li>)}</ul>
      </section>
    </section>
  )
}
