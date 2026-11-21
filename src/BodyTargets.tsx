import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { BodyMeasurement } from './lib/bodyStorage'
import { getTargetRepository, latestMeasurement, targetStatus } from './lib/bodyTargets'
import type { BodyTargets as Targets } from './lib/bodyTargets'

export default function BodyTargets({ items }: { items: BodyMeasurement[] }) {
  const [repository] = useState(getTargetRepository)
  const [targets, setTargets] = useState<Targets>({})
  const [weight, setWeight] = useState('')
  const [fat, setFat] = useState('')
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    repository.load().then((next) => { if (active) { setTargets(next); setReady(true) } })
      .catch(() => { if (active) setError('目標を読み込めませんでした。再読み込みしてください。') })
    return () => { active = false }
  }, [repository])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.checkValidity()) {
      setError('目標体重は0より大きく500未満、目標体脂肪率は0より大きく100未満で入力してください。')
      return
    }
    setBusy(true)
    setError('')
    try {
      setTargets(await repository.save({ ...(weight === '' ? {} : { weightKg: Number(weight) }), ...(fat === '' ? {} : { bodyFatPercent: Number(fat) }) }))
      setEditing(false)
    } catch { setError('目標を保存できませんでした。ブラウザの保存設定を確認してください。') }
    finally { setBusy(false) }
  }

  return <section className="stats-card body-targets" aria-labelledby="body-targets-heading">
    <div className="stats-card-title"><h2 id="body-targets-heading">目標と現在</h2>
      <button className="edit-button" disabled={!ready || busy} aria-expanded={editing} onClick={() => {
        setWeight(targets.weightKg === undefined ? '' : String(targets.weightKg))
        setFat(targets.bodyFatPercent === undefined ? '' : String(targets.bodyFatPercent))
        setError(''); setEditing(!editing)
      }}>{editing ? '閉じる' : '目標を設定・変更'}</button></div>
    {ready && (['weightKg', 'bodyFatPercent'] as const).map((key) => {
      const latest = latestMeasurement(items, key)
      const unit = key === 'weightKg' ? 'kg' : '%'
      return <div className="body-target-summary" key={key} data-testid={`target-${key}`}>
        <h3>{key === 'weightKg' ? '体重' : '体脂肪率'}</h3>
        <p>最新：{latest ? `${latest[key]} ${unit}（${latest.date.replaceAll('-', '.')}）` : 'まだ測定値がありません'}</p>
        <p>目標：{targets[key] === undefined ? '未設定' : `${targets[key]} ${unit}`}</p>
        <p>{targetStatus(latest?.[key], targets[key], key === 'weightKg' ? 'kg' : '%ポイント')}</p>
      </div>
    })}
    {editing && <form onSubmit={(event) => void save(event)} noValidate>
      <div className="body-fields"><div><label htmlFor="target-weight">目標体重（kg）</label>
        <input id="target-weight" type="number" inputMode="decimal" min="0.1" max="499.9" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} disabled={busy} /></div>
      <div><label htmlFor="target-fat">目標体脂肪率（%）</label>
        <input id="target-fat" type="number" inputMode="decimal" min="0.1" max="99.9" step="0.1" value={fat} onChange={(event) => setFat(event.target.value)} disabled={busy} /></div></div>
      <p className="field-note">片方だけでも設定できます。空欄で保存すると、その目標を解除します。</p>
      <div className="actions"><button className="primary" disabled={busy}>{busy ? '保存中…' : '目標を保存する'}</button></div>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
