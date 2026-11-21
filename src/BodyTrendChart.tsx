import { useId } from 'react'
import type { BodyMeasurement } from './lib/bodyStorage'
import { bodyTrendDate, getBodyTrend } from './lib/bodyTrends'
import type { BodyMetric } from './lib/bodyTrends'

const number = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 })
const shortDate = (day: number) => bodyTrendDate(day).slice(5).replace('-', '/')

interface Props { items: BodyMeasurement[]; date: string; metric: BodyMetric; label: string; unit: string }

export default function BodyTrendChart({ items, date, metric, label, unit }: Props) {
  const id = useId()
  const points = getBodyTrend(items, metric, date)
  const first = points[0]?.day
  const last = points.at(-1)?.day

  if (first === undefined || last === undefined) return (
    <div className="stats-card">
      <h3>{label}（{unit}）</h3>
      <p className="empty">{label}の記録はまだありません。</p>
    </div>
  )

  let min = points[0].average
  let max = min
  for (const { measured } of points) {
    if (measured === null) continue
    min = Math.min(min, measured)
    max = Math.max(max, measured)
  }
  const middle = (min + max) / 2
  const padding = Math.max((max - min) * .6, .1)
  const ticks = [middle + padding, middle, middle - padding]
  const x = (day: number) => first === last ? 173 : 47 + (day - first) * 252 / (last - first)
  const y = (value: number) => 71 - (value - middle) * 52 / padding
  const path = points.map(({ day, average }, i) =>
    `${points[i - 1]?.day === day - 1 ? 'L' : 'M'}${x(day)} ${y(average)}`,
  ).join(' ')
  const dates = first === last ? [first] : last - first < 14
    ? [first, last]
    : [first, Math.floor((first + last) / 2), last]

  return (
    <div className="stats-card">
      <h3>{label}（{unit}）</h3>
      <p className="stats-range">{bodyTrendDate(first)}{first !== last && ` 〜 ${bodyTrendDate(last)}`}</p>
      <svg className="stats-chart body-chart" viewBox="0 0 320 149" role="img" aria-labelledby={id} aria-describedby={`${id}-description`}>
        <title id={id}>{label}の推移</title>
        <desc id={`${id}-description`}>点は実測値、破線は当日を含む直近7暦日の移動平均です。測定がなかった日は点がなく、直近7日間に測定がなければ破線もありません。</desc>
        {ticks.map((value) => <g key={value}>
          <line x1="47" x2="299" y1={y(value)} y2={y(value)} className="body-chart-grid" />
          <text x="40" y={y(value) + 3} textAnchor="end" className="chart-label">{number.format(value)}</text>
        </g>)}
        <path className="body-chart-average" d={path} />
        {points.map(({ day, average }, i) => points[i - 1]?.day !== day - 1 && points[i + 1]?.day !== day + 1 &&
          <rect key={day} x={x(day) - 4.5} y={y(average) - 4.5} width="9" height="9" className="body-chart-average-point" />)}
        {points.map(({ day, measured }) => measured !== null && (
          <circle key={day} cx={x(day)} cy={y(measured)} r="2.8" className="body-chart-measured">
            <title>{bodyTrendDate(day)}：{number.format(measured)} {unit}</title>
          </circle>
        ))}
        {dates.map((day) => <text key={day} x={x(day)} y="143" textAnchor="middle" className="chart-label">{shortDate(day)}</text>)}
      </svg>
      <div className="body-chart-legend">
        <span className="body-chart-legend-measured">実測値</span>
        <span className="body-chart-legend-average">7日移動平均</span>
      </div>
    </div>
  )
}
