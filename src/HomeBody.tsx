import { useEffect, useState } from 'react'
import { getBodyRepository } from './lib/bodyStorage'
import type { BodyMeasurement } from './lib/bodyStorage'
import { latestMeasurement } from './lib/bodyTargets'
import { getHomeBodySetting } from './lib/homeBodySetting'
import { isDemoMode } from './lib/storage'

function Measurements() {
  const [items, setItems] = useState<BodyMeasurement[]>([])
  const [status, setStatus] = useState('読み込み中…')
  useEffect(() => {
    let active = true
    getBodyRepository().listMeasurements().then((records) => {
      if (active) { setItems(records); setStatus('') }
    }).catch(() => { if (active) setStatus('体の記録を読み込めませんでした。') })
    return () => { active = false }
  }, [])
  return <section aria-labelledby="home-body-heading" data-testid="home-body-values">
    <h2 id="home-body-heading">最近の測定値</h2>
    {status ? <p role="status">{status}</p> : items.length === 0 ? <p>体の記録はまだありません。</p> :
      <ul>{(['weightKg', 'bodyFatPercent'] as const).map((key) => {
        const item = latestMeasurement(items, key)
        return <li key={key}>{key === 'weightKg' ? '体重' : '体脂肪率'}：{item ? <>{item[key]} {key === 'weightKg' ? 'kg' : '%'} <small>（{item.date.replaceAll('-', '.')}）</small></> : '未記録'}</li>
      })}</ul>}
  </section>
}

export default function HomeBody() {
  const [setting] = useState(() => getHomeBodySetting(isDemoMode()))
  const [visible, setVisible] = useState(() => {
    try { return setting.load() } catch { return false }
  })
  const [error, setError] = useState('')
  function toggle() {
    try {
      setting.save(!visible)
      setVisible(!visible)
      setError('')
    } catch { setError('表示設定を保存できませんでした。ブラウザの保存設定を確認してください。') }
  }
  return <div className="home-body">
    <details>
      <summary>ホームの表示設定</summary>
      <label className="home-body-toggle"><input type="checkbox" checked={visible} onChange={toggle} />ホームに体重・体脂肪率を表示する</label>
      <p className="field-note">初期設定は非表示です。体の記録タブではいつでも確認できます。</p>
      {error && <p role="alert" className="error">{error}</p>}
    </details>
    {visible && <Measurements />}
  </div>
}
