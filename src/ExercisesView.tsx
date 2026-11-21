import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { HabitRepository } from './lib/storage'
import type { BodyPart, Exercise } from './lib/types'
import { bodyParts } from './lib/exercises'

export default function ExercisesView({ repository }: { repository: HabitRepository }) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filter, setFilter] = useState<BodyPart | 'all'>('all')
  const [editing, setEditing] = useState<Exercise | null | undefined>()
  const [name, setName] = useState('')
  const [bodyPart, setBodyPart] = useState<BodyPart>('back')
  const [bodyweight, setBodyweight] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    repository.listExercises().then((items) => { if (active) setExercises(items) })
      .catch(() => { if (active) setError('種目を読み込めませんでした。再読み込みしてください。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [repository])

  function open(exercise: Exercise | null) {
    setEditing(exercise)
    setName(exercise?.name ?? '')
    setBodyPart(exercise?.bodyPart ?? (filter === 'all' ? 'back' : filter))
    setBodyweight(exercise?.bodyweight ?? false)
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const input = { name, bodyPart, bodyweight }
      if (editing) await repository.updateExercise(editing.id, input)
      else await repository.createExercise(input)
      setExercises(await repository.listExercises())
      setFilter(bodyPart)
      setEditing(undefined)
    } catch { setError('保存できませんでした。入力内容やブラウザの保存設定を確認してください。') }
    finally { setBusy(false) }
  }

  const form = <form className="exercise-form" onSubmit={(event) => void save(event)} aria-label={editing ? '種目を編集' : '種目を追加'}>
    <h2>{editing ? '種目を編集' : '種目を追加'}</h2>
    <label htmlFor="exercise-name">種目名</label>
    <input id="exercise-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} disabled={busy} placeholder="例：ダンベルロウ" />
    <label htmlFor="exercise-part">部位</label>
    <select id="exercise-part" value={bodyPart} onChange={(event) => setBodyPart(event.target.value as BodyPart)} disabled={busy}>
      {Object.entries(bodyParts).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
    <label className="bodyweight-field"><input type="checkbox" checked={bodyweight} onChange={(event) => setBodyweight(event.target.checked)} disabled={busy} />自重種目（回数だけで記録）</label>
    <div className="actions"><button type="button" className="secondary" onClick={() => { setEditing(undefined); setError('') }} disabled={busy}>キャンセル</button><button className="primary" disabled={busy || !name.trim()}>{busy ? '保存中…' : '保存する'}</button></div>
  </form>

  return <section className="exercises-view" aria-labelledby="exercises-title">
    <p className="eyebrow">EXERCISE LIBRARY</p>
    <h1 id="exercises-title">鍛えたい部位から。</h1>
    <p className="exercise-note">いつもの種目を、自分のメニューに。</p>
    <div className="exercise-filters" role="group" aria-label="部位で絞り込み">
      {([['all', 'すべて'], ...Object.entries(bodyParts)] as [BodyPart | 'all', string][]).map(([key, label]) => <button key={key} aria-pressed={filter === key} disabled={busy} onClick={() => { setFilter(key); setEditing(undefined); setError('') }}>{label}</button>)}
    </div>
    {editing === null ? form : <button className="add-button" disabled={loading || busy || (!!error && editing === undefined)} onClick={() => open(null)}>＋ 種目を追加する</button>}
    {loading ? <p role="status">読み込み中…</p> : <ul className="exercise-list">
      {exercises.filter((item) => filter === 'all' || item.bodyPart === filter).map((item) => <li key={item.id} data-testid="exercise-item">
        {editing?.id === item.id ? form : <><div><span className="exercise-meta">{bodyParts[item.bodyPart]} · {item.bodyweight ? '自重' : 'ウエイト'}</span><h2>{item.name}</h2></div><button aria-label={`${item.name}を編集`} onClick={() => open(item)} disabled={busy}>編集</button></>}
      </li>)}
      {!exercises.some((item) => filter === 'all' || item.bodyPart === filter) && <li className="empty">まだ種目がありません。追加してみましょう。</li>}
    </ul>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
