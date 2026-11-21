import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { today } from './lib/date'
import { getRepository, isDemoMode } from './lib/storage'
import type { Habit, HabitLog } from './lib/types'
import { getStreak } from './lib/streak'
import { createStudyTimeRepository } from './lib/studyTime'
import CheckinControls from './CheckinControls'
import StatsView from './StatsView'
import BodyView from './BodyView'
import StudyTime from './StudyTime'

export default function App() {
  const [repository] = useState(() => getRepository())
  const demo = isDemoMode()
  const normalUrl = new URL(window.location.href)
  normalUrl.searchParams.delete('demo')
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [date, setDate] = useState(() => today())
  const [studyTimeRepository] = useState(() => createStudyTimeRepository(demo ? date : undefined))
  const [view, setView] = useState<'record' | 'stats' | 'body'>('record')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Habit | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const showDialog = editing !== undefined || deleting !== null

  useEffect(() => {
    let active = true
    Promise.all([repository.listHabits(), repository.listLogs()]).then(([items, records]) => {
      if (active) { setHabits(items); setLogs(records) }
    })
      .catch(() => { if (active) setError('データを読み込めませんでした。ブラウザの保存設定を確認して、再読み込みしてください。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [repository])

  useEffect(() => {
    const refreshDate = () => setDate(today())
    const interval = window.setInterval(refreshDate, 1000)
    window.addEventListener('focus', refreshDate)
    document.addEventListener('visibilitychange', refreshDate)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshDate)
      document.removeEventListener('visibilitychange', refreshDate)
    }
  }, [])

  useEffect(() => {
    if (showDialog) dialog.current?.showModal()
    else dialog.current?.close()
  }, [showDialog])

  function openForm(habit: Habit | null) {
    setName(habit?.name ?? '')
    setUnit(habit?.unit ?? '')
    setError('')
    setEditing(habit)
  }

  function closeDialog() {
    if (busy) return
    setEditing(undefined)
    setDeleting(null)
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (editing) await repository.updateHabit(editing.id, { name, unit })
      else await repository.createHabit({ name, unit })
      setHabits(await repository.listHabits())
      setEditing(undefined)
    } catch {
      setError('保存できませんでした。ブラウザの保存容量・設定を確認して、もう一度お試しください。')
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!deleting) return
    setBusy(true)
    setError('')
    try {
      await repository.deleteHabit(deleting.id)
      setLogs((items) => items.filter((log) => log.habitId !== deleting.id))
      setHabits(await repository.listHabits())
      setDeleting(null)
    } catch { setError('削除できませんでした。もう一度お試しください。') }
    finally { setBusy(false) }
  }

  return (
    <main className="app">
      <header className="brand"><span className="brand-mark" aria-hidden="true">芽</span> 習慣トラッカー<span className="local-badge">{demo ? 'サンプル体験中' : 'この端末に保存'}</span></header>
      {demo && <aside className="demo-banner" data-testid="demo-banner"><strong>デモモード（サンプルデータ）</strong><p>実際のデータには触れません。<br />変更は再読み込みでリセットされます。</p><a href={normalUrl.href}>デモを終了して通常モードへ →</a></aside>}
      <nav className="view-switch" aria-label="表示切り替え">
        <button data-testid="nav-record" aria-pressed={view === 'record'} onClick={() => setView('record')}>記録</button>
        <button data-testid="nav-stats" aria-pressed={view === 'stats'} onClick={() => setView('stats')}>グラフ</button>
        <button data-testid="nav-body" aria-pressed={view === 'body'} onClick={() => setView('body')}>体の記録</button>
      </nav>
      {view === 'record' ? <>
      <section className="intro">
        <p className="eyebrow">MY DAILY ROUTINE</p>
        <p className="date" data-testid="today-date">{date.replaceAll('-', '.')} <span>日本時間</span></p>
        <h1>小さな習慣を、<br />自分のペースで。</h1>
        <p className="lead">続けたいことを、ここに集めよう。</p>
        <div className="plant" aria-hidden="true"><span>✦</span><i /><b /></div>
      </section>
      <StudyTime key={date} date={date} repository={studyTimeRepository} />
      <section aria-labelledby="habits-heading">
        <div className="section-heading"><h2 id="habits-heading">わたしの習慣 <span>{habits.length}</span></h2><span className="small-note">一歩ずつ、こつこつ。</span></div>
        {loading ? <p role="status">読み込み中…</p> : (
          <ul className="habit-list" data-testid="habit-list">
            {habits.map((habit, index) => (
              <li className="habit-card" data-testid="habit-item" key={habit.id}>
                <div className="habit-card-heading"><span className={`habit-icon tone-${index % 3}`} aria-hidden="true">{habit.name.slice(0, 1)}</span>
                <div className="habit-info"><h3>{habit.name}</h3><p>{habit.unit ? `単位：${habit.unit}` : '単位なし'}</p></div>
                <button className="edit-button" data-testid="edit-habit-button" aria-label={`${habit.name}を編集`} onClick={() => openForm(habit)}>編集 <span aria-hidden="true">↗</span></button>
                <button className="icon-button" data-testid="delete-habit-button" aria-label={`${habit.name}を削除`} onClick={() => { setError(''); setDeleting(habit) }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></svg></button>
                </div>
                <CheckinControls key={date} habit={habit} date={date}
                  log={logs.find((log) => log.habitId === habit.id && log.date === date)}
                  streak={getStreak(habit.id, logs, date)}
                  onChange={(next) => setLogs((items) => {
                    const remaining = items.filter((log) => log.habitId !== habit.id || log.date !== date)
                    return next ? [...remaining, next] : remaining
                  })} />
              </li>
            ))}
            {!habits.length && <li className="empty" data-testid="empty-state">まだ習慣がありません。<br />まずは、ひとつ追加してみましょう。</li>}
          </ul>
        )}
        <button className="add-button" data-testid="add-habit-button" onClick={() => openForm(null)} disabled={loading || (!!error && !showDialog)}><span aria-hidden="true">＋</span> 習慣を追加する</button>
      </section>
      </> : view === 'body' ? <BodyView date={date} /> : loading ? <p role="status">読み込み中…</p> : !error ? <StatsView habits={habits} logs={logs} date={date} /> : null}
      {error && !showDialog && view !== 'body' && <p className="error" role="alert">{error}</p>}
      <aside className="tip"><span aria-hidden="true">✧</span><p>大切なのは、完璧よりも続けること。<br /><strong>今日の小さな一歩が、明日の自分に。</strong></p></aside>
      <footer>あなたのペースを、大切に。<br /><span>{demo ? 'サンプルへの変更は保存されません。' : 'データはこのブラウザだけに保存されます。'}</span></footer>
      <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); closeDialog() }} aria-labelledby="dialog-title" data-testid="habit-dialog">
        {deleting ? <>
          <p className="eyebrow">DELETE HABIT</p><h2 id="dialog-title">習慣を削除しますか？</h2>
          <p className="dialog-description">「{deleting.name}」とその記録が削除されます。この操作は取り消せません。</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions"><button className="secondary" onClick={closeDialog} disabled={busy} autoFocus>キャンセル</button><button className="danger" data-testid="confirm-delete-button" onClick={() => void remove()} disabled={busy}>{busy ? '削除中…' : '削除する'}</button></div>
        </> : <form onSubmit={(event) => void save(event)}>
          <p className="eyebrow">{editing ? 'EDIT HABIT' : 'NEW HABIT'}</p><h2 id="dialog-title">{editing ? '習慣を編集' : '新しい習慣を追加'}</h2>
          <p className="dialog-description">無理なく続けられることから、はじめよう。</p>
          <label htmlFor="habit-name">習慣の名前 <span className="required">必須</span></label>
          <input autoFocus id="habit-name" data-testid="habit-name-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="例：読書、ウォーキング" disabled={busy} />
          <label htmlFor="habit-unit">単位 <span className="optional">任意</span></label>
          <input id="habit-unit" data-testid="habit-unit-input" value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={20} placeholder="例：回、分、ページ" disabled={busy} />
          <p className="field-note">回数や時間など、習慣に合う単位を設定できます。</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions"><button type="button" className="secondary" onClick={closeDialog} disabled={busy}>キャンセル</button><button className="primary" data-testid="save-habit-button" disabled={busy || !name.trim()}>{busy ? '保存中…' : '保存する'}</button></div>
        </form>}
      </dialog>
    </main>
  )
}
