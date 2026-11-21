import { expect, test } from '@playwright/test'

test('今日の種目ごとにセットを保存・修正でき、昨日の振り返りで確認できる。従来の筋トレ（回）は残る', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') })
  const legacy = JSON.stringify({
    habits: [{ id: 'legacy-workout', name: '筋トレ', unit: '回', createdAt: '2025-12-31T00:00:00Z', order: 0 }],
    logs: [{ habitId: 'legacy-workout', date: '2026-01-01', done: true, value: 30 }],
  })
  await page.addInitScript((data) => {
    if (localStorage.getItem('habit-tracker:v1') === null) localStorage.setItem('habit-tracker:v1', data)
  }, legacy)
  await page.goto('./')

  const section = page.getByRole('region', { name: '今日の筋トレ' })
  const add = section.getByRole('button', { name: '＋ セットを追加' })
  await section.getByLabel('種目').selectOption({ label: 'ベンチプレス' })
  await section.getByLabel('重量（kg）').fill('60')
  await section.getByLabel('回数').fill('10')
  await add.tap()
  await section.getByLabel('回数').fill('8')
  await add.tap()
  await section.getByLabel('種目').selectOption({ label: '懸垂' })
  await expect(section.getByLabel('重量（kg）')).toHaveCount(0)
  await section.getByLabel('回数').fill('12')
  await add.tap()

  await page.reload()
  const bench = section.getByRole('list', { name: 'ベンチプレスのセット' })
  await expect(bench.getByRole('listitem')).toHaveText([/1セット目60 kg × 10回/, /2セット目60 kg × 8回/])
  await expect(section.getByRole('list', { name: '懸垂のセット' })).toContainText('12回')
  await section.getByRole('button', { name: 'ベンチプレス 2セット目を編集' }).tap()
  const edit = section.getByRole('form', { name: 'ベンチプレス 2セット目を編集' })
  await edit.getByLabel('重量（kg）').fill('62.5')
  await edit.getByRole('button', { name: '保存' }).tap()
  await page.reload()
  await expect(bench.getByRole('listitem').nth(1)).toContainText('62.5 kg × 8回')
  await expect(page.getByRole('spinbutton', { name: '筋トレの今日の数値（回）' })).toHaveValue('30')
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('habit-tracker:v1')))!)
  const { habits, logs } = JSON.parse(legacy)
  expect({ habits: stored.habits, logs: stored.logs }).toEqual({ habits, logs })

  await page.clock.fastForward('24:00:00')
  await page.getByRole('button', { name: '昨日の記録' }).tap()
  await expect(page.getByText('ベンチプレス').locator('+ dd')).toHaveText('60 kg × 10回 / 62.5 kg × 8回')
  await expect(page.getByText('懸垂').locator('+ dd')).toHaveText('12回')
})

test('デモの筋トレ履歴で初回と自己ベスト更新を区別し、同値や再読み込みでは祝わない', async ({ page }) => {
  const key = 'habit-tracker:workout-sets:v1'
  const realData = JSON.stringify({ sets: [{
    id: 'real-bench', date: '2025-12-31', exerciseId: 'preset-chest-bench-press',
    reps: 100, weightKg: 999, createdAt: '2025-12-31T12:00:00Z',
  }] })
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') })
  await page.addInitScript(({ key, realData }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, realData)
  }, { key, realData })
  await page.goto('./?demo=1')

  const section = page.getByRole('region', { name: '今日の筋トレ' })
  const form = section.getByRole('form', { name: 'セットを追加' })
  const status = section.getByRole('status')
  await form.getByLabel('種目').selectOption({ label: 'ラットプルダウン' })
  await form.getByLabel('重量（kg）').fill('45')
  await form.getByLabel('回数').fill('10')
  await form.getByRole('button', { name: '＋ セットを追加' }).tap()
  await expect(status).toContainText('初めての記録')
  await expect(status).toContainText('総挙上量：450 kg')

  await form.getByLabel('種目').selectOption({ label: 'ベンチプレス' })
  await form.getByLabel('重量（kg）').fill('65')
  await form.getByLabel('回数').fill('12')
  await form.getByRole('button', { name: '＋ セットを追加' }).tap()
  await expect(status).toContainText('自己ベスト更新！')
  await expect(status).toContainText('最大重量：65 kg')
  await expect(status).toContainText('最大回数：12回')
  await expect(status).not.toContainText('総挙上量')
  await form.getByRole('button', { name: '＋ セットを追加' }).tap()
  await expect(status).toContainText('総挙上量：1,560 kg')
  await expect(status).not.toContainText('最大重量')
  await expect(status).not.toContainText('最大回数')

  await section.getByRole('button', { name: 'ベンチプレス 2セット目を編集' }).tap()
  await section.getByRole('form', { name: 'ベンチプレス 2セット目を編集' }).getByRole('button', { name: '保存' }).tap()
  await expect(status).toBeEmpty()
  await page.reload()
  await expect(status).toBeEmpty()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toEqual(realData)
})
