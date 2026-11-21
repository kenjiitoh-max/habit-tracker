import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import BodyTrendChart from './BodyTrendChart'
import { getBodyRepository } from './lib/bodyStorage'
import type { BodyMeasurement, BodyRepository } from './lib/bodyStorage'
import BodyTargets from './BodyTargets'

interface Props { date: string; repository?: BodyRepository }
const toInput = (value?: number) => value === undefined ? '' : String(value)
const parse = (value: string) => value.trim() === '' ? undefined : Number(value)
const formatDate = (date: string) => date.replaceAll('-', '.')

export default function BodyView({ date, repository: providedRepository }: Props) {
  const [repository] = useState(() => providedRepository ?? getBodyRepository())
  const [items, setItems] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [formDate, setFormDate] = useState(date)
  const [weight, setWeight] = useState('')
  const [fat, setFat] = useState('')
  const openedOn = useRef(date)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let active = true
    repository.listMeasurements().then((records) => {
      if (!active) return
      setItems(records)
      const current = records.find((item) => item.date === openedOn.current)
      setWeight(toInput(current?.weightKg))
      setFat(toInput(current?.bodyFatPercent))
    })
      .catch(() => { if (active) setError('体の記録を読み込めませんでした。再読み込みしてください。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [repository])

  function selectDate(next: string) {
    const current = items.find((item) => item.date === next)
    setFormDate(next)
    setWeight(toInput(current?.weightKg))
    setFat(toInput(current?.bodyFatPercent))
    setError('')
    setNotice('')
  }

  function edit(next: string) {
    selectDate(next)
    form.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.checkValidity()) {
      setError('体重は0より大きく500未満、体脂肪率は0より大きく100未満で入力してください。')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const saved = await repository.saveMeasurement({ date: formDate, weightKg: parse(weight), bodyFatPercent: parse(fat) })
      setItems(await repository.listMeasurements())
      setNotice(`${formatDate(formDate)} の記録を${saved ? '保存' : '削除'}しました。`)
    } catch {
      setError('保存できませんでした。入力内容とブラウザの保存設定を確認してください。')
    } finally { setBusy(false) }
  }

  async function remove(target: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await repository.deleteMeasurement(target)
      setItems(await repository.listMeasurements())
      if (target === formDate) { setWeight(''); setFat('') }
      setNotice(`${formatDate(target)} の記録を削除しました。`)
    } catch {
      setError('削除できませんでした。もう一度お試しください。')
    } finally { setBusy(false) }
  }

  const existing = items.some((item) => item.date === formDate)

  return (
    <section className="body-view" data-testid="body-view" aria-labelledby="body-heading">
      <p className="eyebrow">BODY LOG</p>
      <h1 id="body-heading">体の記録</h1>
      <p className="lead">測った日だけでOK。習慣の連続日数や達成率には含めません。</p>
      {loading ? <p role="status">読み込み中…</p> : <>
        <BodyTargets items={items} />
        <form ref={form} className="stats-card body-form" onSubmit={(event) => void save(event)} noValidate>
          <label htmlFor="body-date">測定日</label>
          <input id="body-date" data-testid="body-date-input" type="date" value={formDate} max={date} required disabled={busy}
            onChange={(event) => { if (event.target.value) selectDate(event.target.value) }} />
          <div className="body-fields">
            <div>
              <label htmlFor="body-weight">体重 <span className="optional">kg</span></label>
              <input id="body-weight" data-testid="body-weight-input" type="number" inputMode="decimal" min="0.1" max="499.9" step="0.1"
                placeholder="例：68.5" value={weight} onChange={(event) => setWeight(event.target.value)} disabled={busy} />
            </div>
            <div>
              <label htmlFor="body-fat">体脂肪率 <span className="optional">%</span></label>
              <input id="body-fat" data-testid="body-fat-input" type="number" inputMode="decimal" min="0.1" max="99.9" step="0.1"
                placeholder="例：18.2" value={fat} onChange={(event) => setFat(event.target.value)} disabled={busy} />
            </div>
          </div>
          <p className="field-note">片方だけでも保存できます。空欄にして保存すると、その項目を消します。</p>
          {error && <p className="error" role="alert">{error}</p>}
          {notice && <p className="body-notice" role="status">{notice}</p>}
          <div className="actions"><button className="primary" data-testid="body-save-button" disabled={busy || (!existing && !weight.trim() && !fat.trim())}>{busy ? '保存中…' : existing ? '記録を修正する' : '記録する'}</button></div>
        </form>
        <section className="body-trends" aria-labelledby="body-trends-heading">
          <h2 id="body-trends-heading">測定値の推移</h2>
          <p className="field-note">移動平均は、当日を含む7暦日のうち、測った値だけで計算します。</p>
          <BodyTrendChart items={items} date={date} metric="weightKg" label="体重" unit="kg" />
          <BodyTrendChart items={items} date={date} metric="bodyFatPercent" label="体脂肪率" unit="%" />
        </section>
        <section className="body-history" aria-labelledby="body-history-heading">
          <h2 id="body-history-heading">これまでの記録</h2>
          {items.length === 0 ? <p className="empty" data-testid="body-empty">まだ記録がありません。</p> : (
            <ul data-testid="body-list">{items.map((item) => <li key={item.date} data-testid="body-item">
              <span className="body-item-date">{formatDate(item.date)}</span>
              <span className="body-item-values">{item.weightKg === undefined ? '—' : `${item.weightKg} kg`} ／ {item.bodyFatPercent === undefined ? '—' : `${item.bodyFatPercent}%`}</span>
              <button className="edit-button" aria-label={`${formatDate(item.date)}の記録を修正`} onClick={() => edit(item.date)} disabled={busy}>修正</button>
              <button className="edit-button" aria-label={`${formatDate(item.date)}の記録を削除`} onClick={() => void remove(item.date)} disabled={busy}>削除</button>
            </li>)}</ul>
          )}
        </section>
      </>}
    </section>
  )
}
