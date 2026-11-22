import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { cardioTypes } from './lib/cardio'
import type { CardioRepository, CardioSession } from './lib/cardio'

export default function Cardio({ date, repository, onChange }: { date: string; repository: CardioRepository; onChange: () => void }) {
  const [sessions, setSessions] = useState(() => repository.listSessions())
  const [type, setType] = useState<CardioSession['type']>('ランニング')
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const pendingId = useRef<string | null>(null)
  function reset() {
    setEditing(null); setMinutes(''); setDistance(''); pendingId.current = null
  }
  function save(event: FormEvent) {
    event.preventDefault()
    setError(''); setStatus('')
    try {
      const input = { type, minutes: Number(minutes), ...(distance === '' ? {} : { distanceKm: Number(distance) }) }
      if (editing) repository.updateSession(editing, input)
      else {
        pendingId.current ??= crypto.randomUUID()
        repository.addSession(date, input, pendingId.current)
      }
      setSessions(repository.listSessions()); reset(); onChange(); setStatus('保存しました。')
    } catch (cause) { setError(cause instanceof Error && /入力|選択|見つかりません/.test(cause.message) ? cause.message : '保存できませんでした。保存容量・設定を確認して、もう一度お試しください。') }
  }
  function remove(id: string) {
    try {
      repository.deleteSession(id); setSessions(repository.listSessions())
      if (editing === id) reset()
      setError(''); setStatus('削除しました。'); onChange()
    } catch { setError('削除できませんでした。もう一度お試しください。') }
  }
  return <section className="habit-card workout-sets cardio" aria-labelledby="cardio-heading">
    <h2 id="cardio-heading">有酸素運動</h2>
    <p className="field-note">歩いた時間も、今日の一歩に。1記録につき +10 XP</p>
    <form onSubmit={save} noValidate>
      <label htmlFor="cardio-type">運動の種類</label>
      <select id="cardio-type" value={type} onChange={(event) => setType(event.target.value as CardioSession['type'])}>{cardioTypes.map((item) => <option key={item}>{item}</option>)}</select>
      <div className="set-fields">
        <div><label htmlFor="cardio-minutes">時間（分）</label><input id="cardio-minutes" type="number" min="1" step="1" inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></div>
        <div><label htmlFor="cardio-distance">距離（km・任意）</label><input id="cardio-distance" type="number" min="0" step="any" inputMode="decimal" value={distance} onChange={(event) => setDistance(event.target.value)} /></div>
      </div>
      <div className="actions"><button className="primary">{editing ? '変更を保存' : '有酸素運動を保存'}</button>{editing && <button type="button" className="secondary" onClick={reset}>キャンセル</button>}</div>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    <p role="status">{status}</p>
    <ul className="cardio-list" aria-label="今日の有酸素運動">
      {sessions.filter((session) => session.date === date).map((session) => <li key={session.id}>
        <p><strong>{session.type}</strong> · {session.minutes}分{session.distanceKm === undefined ? '' : ` · ${session.distanceKm} km`}</p>
        <div className="actions"><button type="button" onClick={() => { setEditing(session.id); setType(session.type); setMinutes(String(session.minutes)); setDistance(session.distanceKm === undefined ? '' : String(session.distanceKm)); setError(''); setStatus(''); pendingId.current = null }}>編集</button><button type="button" className="secondary" onClick={() => remove(session.id)}>削除</button></div>
      </li>)}
    </ul>
    {!sessions.some((session) => session.date === date) && <p className="field-note">今日の有酸素運動はまだありません。</p>}
  </section>
}
