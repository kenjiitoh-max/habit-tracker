import { expect, test } from '@playwright/test'

const key = 'habit-tracker:workout-sets:v1'

test('選んだ種目の日別グラフと表を表示し、未記録日と自重種目を 0 kg にしない', async ({ page }) => {
  const raw = JSON.stringify({ sets: [
    { date: '2026-01-01', exerciseId: 'preset-chest-bench-press', weightKg: 60, reps: 10 },
    { date: '2026-01-01', exerciseId: 'preset-chest-bench-press', weightKg: 62.5, reps: 6 },
    { date: '2026-01-03', exerciseId: 'preset-chest-bench-press', weightKg: 0, reps: 10 },
    { date: '2026-01-02', exerciseId: 'preset-back-pullup', reps: 12 },
  ].map((set, index) => ({ ...set, id: `set-${index}`, createdAt: `${set.date}T12:00:00Z` })) })
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw })
  await page.goto('./')
  await page.getByRole('button', { name: 'グラフ', exact: true }).tap()
  const stats = page.getByRole('region', { name: '筋トレの推移' })
  const select = stats.getByRole('combobox', { name: '種目' })
  await expect(select).toHaveValue('preset-chest-bench-press')

  const weight = stats.getByRole('img', { name: '最大重量（kg）' })
  const volume = stats.getByRole('img', { name: '総挙上量（kg）' })
  await expect(weight.locator('circle title')).toHaveText(['2026-01-01：62.5 kg', '2026-01-03：0 kg'])
  await expect(volume.locator('circle title')).toHaveText(['2026-01-01：975 kg', '2026-01-03：0 kg'])
  await stats.getByText('日別の筋トレデータを見る').tap()
  await expect(stats.getByRole('cell')).toHaveText(['62.5 kg', '975 kg', '0 kg', '0 kg'])
  await expect(stats.getByRole('rowheader', { name: '2026-01-02' })).toHaveCount(0)

  await select.selectOption({ label: '懸垂' })
  await expect(stats.getByRole('img')).toHaveCount(0)
  await expect(stats.getByRole('rowheader')).toHaveText('2026-01-02')
  await expect(stats.getByRole('cell')).toHaveText(['—', '—'])
  await select.selectOption({ label: 'スクワット' })
  await expect(stats.getByText('この種目の記録はまだありません。')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(raw)
})

test('デモの筋トレグラフは実データを読まず、架空の記録だけを表示する', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-02T03:00:00Z') })
  await page.addInitScript((key) => {
    localStorage.setItem(key, '実データ')
    const get = Storage.prototype.getItem
    const set = Storage.prototype.setItem
    Storage.prototype.getItem = function (name) {
      if (name === key) throw new Error('デモが実データを読みました')
      return get.call(this, name)
    }
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error('デモが実データを書きました')
      return set.call(this, name, value)
    }
  }, key)
  await page.goto('./?demo=1')
  await page.getByRole('button', { name: 'グラフ', exact: true }).tap()
  const stats = page.getByRole('region', { name: '筋トレの推移' })
  await expect(stats.getByRole('img', { name: '最大重量（kg）' }).locator('circle title')).toHaveText([
    '2025-12-26：55 kg', '2025-12-30：57.5 kg', '2026-01-01：62.5 kg',
  ])
  await stats.getByText('日別の筋トレデータを見る').tap()
  await expect(stats.getByRole('cell')).toHaveText(['55 kg', '550 kg', '57.5 kg', '575 kg', '62.5 kg', '1,455 kg'])
  const stored = await page.context().storageState()
  expect(stored.origins.flatMap((origin) => origin.localStorage).find((item) => item.name === key)?.value).toBe('実データ')
})
