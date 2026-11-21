import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { bodyParts } from './lib/exercises'
import { detectPersonalBests } from './lib/personalBests'
import type { PersonalBest } from './lib/personalBests'
import type { HabitRepository } from './lib/storage'
import type { BodyPart, Exercise } from './lib/types'
import { formatSet, groupByExercise } from './lib/workoutSets'
import type { WorkoutSet, WorkoutSetInput, WorkoutSetRepository } from './lib/workoutSets'

interface Props {
  date: string
  repository: HabitRepository
  workoutRepository: WorkoutSetRepository
  onChange?: () => void
}

const bestMetrics = {
  weight: { label: '最大重量', unit: ' kg' },
  reps: { label: '最大回数', unit: '回' },
  volume: { label: '総挙上量', unit: ' kg' },
}
const bestNumber = new Intl.NumberFormat('ja-JP', { maximumSignificantDigits: 15 })

function SetFields({ idPrefix, bodyweight, weight, reps, setWeight, setReps, disabled }: {
  idPrefix: string
  bodyweight: boolean
  weight: string
  reps: string
  setWeight: (value: string) => void
  setReps: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="set-fields">
      {!bodyweight && <div>
        <label htmlFor={`${idPrefix}-weight`}>重量（kg）</label>
        <input id={`${idPrefix}-weight`} type="number" min="0" max="1000" step="any" inputMode="decimal" required
          value={weight} onChange={(event) => setWeight(event.target.value)} disabled={disabled} placeholder="—" />
      </div>}
      <div>
        <label htmlFor={`${idPrefix}-reps`}>回数</label>
        <input id={`${idPrefix}-reps`} type="number" min="1" max="1000" step="1" inputMode="numeric" required
          value={reps} onChange={(event) => setReps(event.target.value)} disabled={disabled} placeholder="—" />
      </div>
    </div>
  )
}

function toInput(exerciseId: string, weight: string, reps: string, bodyweight: boolean) {
  return { exerciseId, reps: Number(reps), ...(bodyweight ? {} : { weightKg: Number(weight) }) }
}

export default function WorkoutSets({ date, repository, workoutRepository, onChange }: Props) {
  const [sets, setSets] = useState<WorkoutSet[] | null>(() => {
    try { return workoutRepository.listSets(date) }
    catch { return null }
  })
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exerciseId, setExerciseId] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [editing, setEditing] = useState<WorkoutSet | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editReps, setEditReps] = useState('')
  const [bests, setBests] = useState<{ name: string; records: PersonalBest[] } | null>(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [previous, setPrevious] = useState<WorkoutSet>()

  const selectExercise = useCallback((id: string, items: Exercise[]) => {
    setExerciseId(id)
    setError('')
    try {
      const last = workoutRepository.previousSet(id, date)
      const bodyweight = items.find((item) => item.id === id)?.bodyweight
      setPrevious(last && (bodyweight || last.weightKg !== undefined) ? last : undefined)
      setWeight(last?.weightKg === undefined ? '' : String(last.weightKg))
      setReps(last ? String(last.reps) : '')
    } catch {
      setPrevious(undefined)
      setWeight('')
      setReps('')
      setError('前回の記録を読み込めませんでした。再読み込みしてください。')
    }
  }, [workoutRepository, date])
  const saving = useRef(false)
  const pendingId = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    repository.listExercises().then((items) => {
      if (!active) return
      setExercises(items)
      selectExercise(items[0]?.id || '', items)
    }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [repository, selectExercise])

  const exerciseById = new Map(exercises.map((item) => [item.id, item]))
  const isBodyweightSet = (set: WorkoutSet) => set.weightKg === undefined
  const selected = exerciseById.get(exerciseId)

  function refreshAfterSave(history: WorkoutSet[], saved: WorkoutSet) {
    setSets(workoutRepository.listSets(date))
    const exercise = exerciseById.get(saved.exerciseId)
    if (!exercise) return
    const records = detectPersonalBests(history.filter((set) => set.exerciseId === saved.exerciseId), saved, exercise.bodyweight)
    setBests(records.length ? { name: exercise.name, records } : null)
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !event.currentTarget.checkValidity()) return
    void saveSet(toInput(selected.id, weight, reps, selected.bodyweight))
  }

  async function saveSet(input: WorkoutSetInput) {
    if (saving.current || !selected) return
    saving.current = true
    setBusy(true)
    pendingId.current ??= crypto.randomUUID()
    setError('')
    setBests(null)
    try {
      const history = workoutRepository.listAllSets()
      const saved = await workoutRepository.addSet(date, input, selected.bodyweight, pendingId.current)
      refreshAfterSave(history, saved)
      pendingId.current = null
      onChange?.()
    } catch { setError('セットを保存できませんでした。入力内容やブラウザの保存設定を確認してください。') }
    finally { saving.current = false; setBusy(false) }
  }

  function startEdit(set: WorkoutSet) {
    setEditing(set)
    setEditWeight(set.weightKg === undefined ? '' : String(set.weightKg))
    setEditReps(String(set.reps))
    setError('')
  }

  function repeatPrevious() {
    if (!selected || !previous) return
    void saveSet(previous)
  }

  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || !event.currentTarget.checkValidity()) return
    const bodyweight = isBodyweightSet(editing)
    setError('')
    setBests(null)
    try {
      const history = workoutRepository.listAllSets()
      const saved = workoutRepository.updateSet(editing.id, toInput(editing.exerciseId, editWeight, editReps, bodyweight), bodyweight)
      refreshAfterSave(history, saved)
      setEditing(null)
      onChange?.()
    } catch { setError('セットを保存できませんでした。入力内容やブラウザの保存設定を確認してください。') }
  }

  function remove(set: WorkoutSet) {
    setError('')
    setBests(null)
    try {
      workoutRepository.deleteSet(set.id)
      setSets(workoutRepository.listSets(date))
      if (editing?.id === set.id) setEditing(null)
      onChange?.()
    } catch { setError('セットを削除できませんでした。もう一度お試しください。') }
  }

  const groups = sets ? groupByExercise(sets) : []
  const improved = bests?.records.some(({ kind }) => kind === 'improved')

  return (
    <section className="workout-sets" aria-labelledby="workout-sets-heading">
      <div className="section-heading"><h2 id="workout-sets-heading">今日の筋トレ</h2><span className="small-note">セットごとに記録</span></div>
      <div className="workout-best-status" role="status" aria-atomic="true">
        {bests && <div
          key={bests.records.map(({ metric, value }) => `${metric}:${value}`).join(',')}
          className={improved ? 'workout-best workout-best-improved' : 'workout-best'}
        >
          <strong>{improved ? '🏆 自己ベスト更新！' : '初めての記録'}</strong>
          <p>{bests.name}</p>
          <ul>{bests.records.map(({ metric, value, kind }) => (
            <li key={metric}>
              {bestMetrics[metric].label}：{bestNumber.format(value)}{bestMetrics[metric].unit}
              {improved && kind === 'first' && <small> 初回</small>}
            </li>
          ))}</ul>
        </div>}
      </div>
      <div className="habit-card">
        {sets === null ? <p className="error" role="alert">筋トレの記録を読み込めませんでした。再読み込みしてください。</p> : <>
          {groups.map(([id, items]) => {
            const name = exerciseById.get(id)?.name ?? '種目'
            return (
              <div className="workout-group" key={id}>
                <h3>{name}</h3>
                <ol aria-label={`${name}のセット`}>
                  {items.map((set, index) => (
                    <li key={set.id}>
                      {editing?.id === set.id ? (
                        <form className="set-form" onSubmit={update} aria-label={`${name} ${index + 1}セット目を編集`}>
                          <SetFields idPrefix={`edit-${set.id}`} bodyweight={isBodyweightSet(set)}
                            weight={editWeight} reps={editReps} setWeight={setEditWeight} setReps={setEditReps} />
                          <div className="set-actions">
                            <button type="button" className="secondary" onClick={() => setEditing(null)}>キャンセル</button>
                            <button className="primary">保存</button>
                          </div>
                        </form>
                      ) : <>
                        <span className="set-number">{index + 1}セット目</span>
                        <span className="set-value">{formatSet(set)}</span>
                        <button className="edit-button" aria-label={`${name} ${index + 1}セット目を編集`} onClick={() => startEdit(set)}>編集</button>
                        <button className="edit-button" aria-label={`${name} ${index + 1}セット目を削除`} onClick={() => remove(set)}>削除</button>
                      </>}
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
          <form className="set-form add-set-form" onSubmit={add} aria-label="セットを追加">
            <label htmlFor="workout-exercise">種目</label>
            <select id="workout-exercise" value={exerciseId} onChange={(event) => selectExercise(event.target.value, exercises)} disabled={!exercises.length}>
              {(Object.keys(bodyParts) as BodyPart[]).map((part) => (
                <optgroup key={part} label={bodyParts[part]}>
                  {exercises.filter((item) => item.bodyPart === part).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </optgroup>
              ))}
            </select>
            {previous && <div className="previous-set">
              <p className="field-note">前回（{previous.date}・最終セット）：{formatSet(selected?.bodyweight ? { reps: previous.reps } : previous)}</p>
              <button type="button" className="primary add-set-button" onClick={repeatPrevious} disabled={busy}>前回と同じ</button>
            </div>}
            <SetFields idPrefix="workout" bodyweight={!!selected?.bodyweight} weight={weight} reps={reps} setWeight={setWeight} setReps={setReps} />
            {selected?.bodyweight && <p className="field-note">自重種目なので回数だけ記録します。</p>}
            <button className="primary add-set-button" disabled={!selected || busy}>＋ セットを追加</button>
          </form>
        </>}
        {loadError && <p className="error" role="alert">種目を読み込めませんでした。再読み込みしてください。</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  )
}
