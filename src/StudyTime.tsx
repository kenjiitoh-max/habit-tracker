import { useState } from 'react'
import type { FormEvent } from 'react'
import { studyServices } from './lib/studyTime'
import type { createStudyTimeRepository } from './lib/studyTime'

interface Props {
  date: string
  repository: ReturnType<typeof createStudyTimeRepository>
}

type StudyService = keyof typeof studyServices

function MinutesForm({ service, minutes, save }: {
  service: StudyService
  minutes?: number
  save: (minutes: number) => void
}) {
  const [saved, setSaved] = useState(minutes !== undefined)
  const [error, setError] = useState(false)
  const label = studyServices[service]

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('minutes')
    if (!(input instanceof HTMLInputElement) || !input.validity.valid) return
    try {
      save(input.valueAsNumber)
      setSaved(true)
      setError(false)
    } catch {
      setError(true)
    }
  }

  return (
    <form className="study-time-form" onSubmit={submit}>
      <label htmlFor={`study-${service}`}>{label}（分）</label>
      <input id={`study-${service}`} name="minutes" type="number" min="0" step="any" required
        inputMode="decimal" placeholder="—" defaultValue={minutes}
        onChange={() => { setSaved(false); setError(false) }} />
      <button className="primary" aria-label={`${label}を保存`}>保存</button>
      <p className="study-time-status" role="status">{saved && '保存済み'}</p>
      {error && <p className="study-time-status error" role="alert">保存できませんでした。もう一度お試しください。</p>}
    </form>
  )
}

export default function StudyTime({ date, repository }: Props) {
  const [minutes] = useState(() => {
    try { return repository.getMinutes(date) }
    catch { return null }
  })

  return (
    <section className="study-time" aria-labelledby="study-time-heading">
      <div className="section-heading"><h2 id="study-time-heading">今日の英語学習</h2></div>
      <div className="habit-card">
        {minutes ? (
          (Object.keys(studyServices) as StudyService[]).map((service) => (
            <MinutesForm key={service} service={service} minutes={minutes[service]}
              save={(value) => repository.saveMinutes(date, service, value)} />
          ))
        ) : <p className="error" role="alert">学習時間を読み込めませんでした。再読み込みしてください。</p>}
      </div>
    </section>
  )
}
