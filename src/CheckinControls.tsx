import { useRef, useState } from 'react'
import { getRepository } from './lib/storage'
import type { Habit, HabitLog } from './lib/types'

interface Props {
  habit: Habit
  date: string
  log?: HabitLog
  streak: number
  onChange: (log: HabitLog | undefined) => void
}

export default function CheckinControls({ habit, date, log, streak, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  const valueInput = useRef<HTMLInputElement>(null)

  async function persist(next: HabitLog | undefined) {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const repository = getRepository()
      if (next) await repository.upsertLog(next)
      else await repository.deleteLog(habit.id, date)
      onChange(next)
    } catch {
      setError('記録を保存できませんでした。もう一度お試しください。')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  function saveValue(input: HTMLInputElement) {
    if (!input.validity.valid) {
      setError('0以上の数値を入力してください。')
      return
    }
    const value = input.value === '' ? undefined : input.valueAsNumber
    if (value === log?.value) return
    if (value === undefined && !log?.done) return
    void persist({ habitId: habit.id, date, done: true, ...(value === undefined ? {} : { value }) })
  }

  return (
    <div className="checkin" aria-label={`${habit.name}の今日の記録`}>
      <div className="checkin-row">
        <button className="checkin-toggle" data-testid="checkin-toggle" aria-pressed={!!log?.done}
          aria-label={`${habit.name}：今日やった`} disabled={busy}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            if (log?.done) return void persist(undefined)
            const input = valueInput.current
            const value = input && input.value !== '' && input.validity.valid ? input.valueAsNumber : log?.value
            void persist({ habitId: habit.id, date, done: true, ...(value === undefined ? {} : { value }) })
          }}>
          <span aria-hidden="true">{log?.done ? '✓' : '○'}</span> 今日やった
        </button>
        <span className="streak" data-testid="streak-count">{streak}日連続</span>
      </div>
      <div className="value-row">
        <label htmlFor={`value-${habit.id}`}>今日の数値 <span>任意</span></label>
        <input ref={valueInput} key={`${log?.done}-${log?.value}`} id={`value-${habit.id}`} data-testid="checkin-value-input"
          type="number" min="0" step="any" inputMode="decimal" placeholder="—"
          aria-label={`${habit.name}の今日の数値${habit.unit ? `（${habit.unit}）` : ''}`}
          defaultValue={log?.value ?? ''} disabled={busy}
          onBlur={(event) => saveValue(event.currentTarget)}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
        {habit.unit && <span className="value-unit">{habit.unit}</span>}
      </div>
      <p className="checkin-note">数値は入力を終えると自動保存されます。</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
