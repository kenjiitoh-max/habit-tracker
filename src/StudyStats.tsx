import { useState } from 'react'
import { getLegacyStudyLogs, getStudyStats } from './lib/studyStats'
import type { StudyPeriod, StudyScope } from './lib/studyStats'
import { studyServices } from './lib/studyTime'
import type { createStudyTimeRepository } from './lib/studyTime'
import type { Habit, HabitLog } from './lib/types'

interface Props {
  date: string
  habits: Habit[]
  logs: HabitLog[]
  repository: ReturnType<typeof createStudyTimeRepository>
}

const scopes = { total: '全体', ...studyServices } as const
const periods = { day: '日', week: '週', month: '月' } as const
const currentLabels = { day: '今日', week: '今週', month: '今月' } as const
const minutesFormat = new Intl.NumberFormat('ja-JP', { maximumSignificantDigits: 12 })
const axisFormat = new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 1 })
const formatMinutes = (minutes: number | null) => minutes === null ? '未記録' : `${minutesFormat.format(minutes)} 分`
const formatRange = (start: string, end: string) => start === end ? start : `${start} 〜 ${end}`
const shortDate = (date: string, period: StudyPeriod) => period === 'month'
  ? `${date.slice(2, 4)}/${Number(date.slice(5, 7))}`
  : `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`

type Bucket = ReturnType<typeof getStudyStats>['current']
const hasLegacy = ({ legacyMinutes, untimed }: Pick<Bucket, 'legacyMinutes' | 'untimed'>) => legacyMinutes !== null || untimed > 0
const formatLegacy = ({ legacyMinutes, untimed }: Pick<Bucket, 'legacyMinutes' | 'untimed'>) => [
  legacyMinutes === null ? null : formatMinutes(legacyMinutes),
  untimed > 0 ? `時間なし ${untimed} 件` : null,
].filter(Boolean).join('、') || '—'

function StudyChart({ trend, title, period }: { trend: Bucket[]; title: string; period: StudyPeriod }) {
  const peak = Math.max(1, ...trend.map(({ minutes }) => minutes ?? 0))
  const step = 36
  const baseline = 126
  return (
    <svg className="stats-chart" viewBox="0 0 320 150" role="img" aria-labelledby="study-chart-title" aria-describedby="study-chart-legend">
      <title id="study-chart-title">{title}</title>
      <text x="32" y="35" textAnchor="end" className="chart-label">{axisFormat.format(peak)} 分</text>
      <text x="32" y={baseline + 3} textAnchor="end" className="chart-label">0</text>
      <path d={`M38 32H290 M38 ${baseline}H290`} className="body-chart-grid" />
      {trend.map((point, index) => {
        const x = 38 + step * (index + .5)
        const height = ((point.minutes ?? 0) / peak) * (baseline - 32)
        return (
          <g key={point.start}>
            <title>{formatRange(point.start, point.end)}：{formatMinutes(point.minutes)}{hasLegacy(point) && `、旧記録 ${formatLegacy(point)}`}</title>
            {point.minutes === 0 ? <circle cx={x} cy={baseline} r="3" fill="var(--accent)" /> :
              point.minutes !== null && <rect x={x - 9} y={baseline - height} width="18" height={height} rx="2" fill={index === trend.length - 1 ? 'var(--accent)' : 'var(--cyan)'} />}
            {hasLegacy(point) && <path d={`M${x} 12l4 4-4 4-4-4z`} fill="var(--gold)" />}
            <text x={x} y="144" textAnchor="middle" className="chart-label">{shortDate(point.start, period)}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function StudyStats({ date, habits, logs, repository }: Props) {
  const [scope, setScope] = useState<StudyScope>('total')
  const [period, setPeriod] = useState<StudyPeriod>('day')
  const [days] = useState(() => {
    try { return repository.listDays() }
    catch { return null }
  })
  const stats = days && getStudyStats(days, getLegacyStudyLogs(habits, logs), date, period, scope)
  const title = `${scopes[scope]}の${periods[period]}別学習時間`

  return (
    <section className="stats-card study-stats" aria-labelledby="study-stats-heading">
      <div className="stats-card-title"><h2 id="study-stats-heading">英語の学習時間</h2><span>日本時間</span></div>
      {stats ? <>
        <div className="period-switch" role="group" aria-label="学習サービス">
          {(Object.keys(scopes) as StudyScope[]).map((key) =>
            <button key={key} aria-pressed={scope === key} onClick={() => setScope(key)}>{scopes[key]}</button>)}
        </div>
        <div className="period-switch" role="group" aria-label="学習時間の集計期間">
          {(Object.keys(periods) as StudyPeriod[]).map((key) =>
            <button key={key} aria-pressed={period === key} onClick={() => setPeriod(key)}>{periods[key]}別</button>)}
        </div>
        <p className="stats-range">{formatRange(stats.current.start, stats.current.end)}{period === 'week' && '（月曜始まり）'}</p>
        <dl className="study-stats-totals">
          <div><dt>{currentLabels[period]}の合計</dt><dd>{formatMinutes(stats.current.minutes)}</dd></div>
          <div><dt>累計（今日まで）</dt><dd>{formatMinutes(stats.lifetime.minutes)}</dd></div>
        </dl>
        {hasLegacy(stats.lifetime) && <p className="study-stats-legacy">
          旧記録（内訳不明・合計に含めない）<br />
          {currentLabels[period]}：{formatLegacy(stats.current)} ／ 累計：{formatLegacy(stats.lifetime)}
        </p>}
        <p className="stats-range">{title}：{formatRange(stats.trend[0].start, date)}</p>
        <StudyChart trend={stats.trend} title={title} period={period} />
        <p className="stats-explanation" id="study-chart-legend">{'● 0 分　空欄：未記録'}{stats.trend.some(hasLegacy) && '　◆ 旧記録あり'}</p>
        <details className="daily-details">
          <summary>{periods[period]}別の学習データを見る</summary>
          <table>
            <caption>{title}（日本時間）</caption>
            <thead><tr><th scope="col">期間</th><th scope="col">学習時間</th>{hasLegacy(stats.lifetime) && <th scope="col">旧記録</th>}</tr></thead>
            <tbody>{stats.trend.map((point) => (
              <tr key={point.start}>
                <th scope="row">{formatRange(point.start, point.end)}</th>
                <td>{formatMinutes(point.minutes)}</td>
                {hasLegacy(stats.lifetime) && <td>{formatLegacy(point)}</td>}
              </tr>
            ))}</tbody>
          </table>
        </details>
      </> : <p className="error" role="alert">学習時間を読み込めませんでした。再読み込みしてください。</p>}
    </section>
  )
}
