import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { addDays, today } from './lib/date'
import { createWorkoutSetRepository } from './lib/workoutSets'
import { getRepository } from './lib/storage'

describe('workout sets UI', () => {
  it('prefills the previous session and repeats it even after editing the inputs', async () => {
    const repo = createWorkoutSetRepository()
    repo.addSet(addDays(today(), -2), { exerciseId: 'preset-chest-bench-press', weightKg: 62.5, reps: 8 }, false)
    repo.addSet(addDays(today(), -1), { exerciseId: 'preset-back-pullup', reps: 12 }, true)
    const user = userEvent.setup()
    render(<App />)
    const section = within(screen.getByRole('region', { name: '今日の筋トレ' }))
    await section.findByRole('option', { name: 'ベンチプレス' })
    await user.selectOptions(section.getByLabelText('種目'), 'preset-chest-bench-press')
    expect(section.getByLabelText('重量（kg）')).toHaveValue(62.5)
    expect(section.getByLabelText('回数')).toHaveValue(8)
    await user.clear(section.getByLabelText('回数'))
    await user.type(section.getByLabelText('回数'), '9')
    await user.click(section.getByRole('button', { name: '前回と同じ' }))
    expect(repo.listSets(today())[0]).toMatchObject({ weightKg: 62.5, reps: 8 })
    await user.selectOptions(section.getByLabelText('種目'), 'preset-back-pullup')
    expect(section.getByLabelText('回数')).toHaveValue(12)
    expect(section.queryByLabelText('重量（kg）')).not.toBeInTheDocument()
    await user.click(section.getByRole('button', { name: '前回と同じ' }))
    expect(repo.listSets(today())[1]).toMatchObject({ reps: 12 })
    await user.selectOptions(section.getByLabelText('種目'), 'preset-legs-squat')
    expect(section.queryByRole('button', { name: '前回と同じ' })).not.toBeInTheDocument()
    expect(section.getByLabelText('回数')).toHaveValue(null)
    expect(section.getByLabelText('重量（kg）')).toHaveValue(null)
  })

  it('shows a save error without losing previous values', async () => {
    const repo = createWorkoutSetRepository()
    repo.addSet(addDays(today(), -1), { exerciseId: 'preset-back-pullup', reps: 12 }, true)
    const user = userEvent.setup()
    render(<App />)
    const repeat = await screen.findByRole('button', { name: '前回と同じ' })
    localStorage.setItem('habit-tracker:workout-sets:v1', 'broken')
    await user.click(repeat)
    expect(screen.getByRole('alert')).toHaveTextContent('セットを保存できませんでした')
    expect(screen.getByLabelText('回数')).toHaveValue(12)
    expect(localStorage.getItem('habit-tracker:workout-sets:v1')).toBe('broken')
  })
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  })

  it('adds, edits and deletes sets, with reps only for bodyweight exercises', async () => {
    const user = userEvent.setup()
    const legacy = JSON.stringify({ habits: [{ id: 'legacy', name: '筋トレ', unit: '回', createdAt: '2025-12-31T00:00:00Z', order: 0 }], logs: [{ habitId: 'legacy', date: today(), done: true, value: 30 }] })
    localStorage.setItem('habit-tracker:v1', legacy)
    render(<App />)
    const section = within(screen.getByRole('region', { name: '今日の筋トレ' }))
    const exercise = section.getByLabelText('種目')
    await section.findByRole('option', { name: 'ベンチプレス' })
    await user.selectOptions(exercise, 'preset-chest-bench-press')
    await user.type(section.getByLabelText('重量（kg）'), '60')
    await user.type(section.getByLabelText('回数'), '10')
    await user.click(section.getByRole('button', { name: '＋ セットを追加' }))
    await user.clear(section.getByLabelText('回数'))
    await user.type(section.getByLabelText('回数'), '8')
    await user.click(section.getByRole('button', { name: '＋ セットを追加' }))
    const bench = within(section.getByRole('list', { name: 'ベンチプレスのセット' }))
    expect(bench.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('60 kg × 10回'), expect.stringContaining('60 kg × 8回'),
    ])

    await user.selectOptions(exercise, 'preset-back-pullup')
    expect(section.queryByLabelText('重量（kg）')).not.toBeInTheDocument()
    await user.clear(section.getByLabelText('回数'))
    await user.type(section.getByLabelText('回数'), '12')
    await user.click(section.getByRole('button', { name: '＋ セットを追加' }))
    expect(section.getByRole('list', { name: '懸垂のセット' })).toHaveTextContent('12回')

    await user.click(section.getByRole('button', { name: 'ベンチプレス 2セット目を編集' }))
    const edit = within(section.getByRole('form', { name: 'ベンチプレス 2セット目を編集' }))
    await user.clear(edit.getByLabelText('重量（kg）'))
    await user.type(edit.getByLabelText('重量（kg）'), '62.5')
    await user.click(edit.getByRole('button', { name: '保存' }))
    expect(bench.getAllByRole('listitem')[1]).toHaveTextContent('62.5 kg × 8回')
    await user.click(section.getByRole('button', { name: 'ベンチプレス 1セット目を削除' }))
    expect(bench.getAllByRole('listitem')).toHaveLength(1)

    const stored = createWorkoutSetRepository().listSets(today())
    expect(stored.map(({ exerciseId, weightKg, reps }) => ({ exerciseId, weightKg, reps }))).toEqual([
      { exerciseId: 'preset-chest-bench-press', weightKg: 62.5, reps: 8 },
      { exerciseId: 'preset-back-pullup', weightKg: undefined, reps: 12 },
    ])
    const { habits, logs } = JSON.parse(localStorage.getItem('habit-tracker:v1')!)
    expect({ habits, logs }).toEqual(JSON.parse(legacy))
    expect(screen.getByRole('spinbutton', { name: '筋トレの今日の数値（回）' })).toHaveValue(30)
  })

  it('keeps a saved weight when the exercise is later changed to bodyweight', async () => {
    const user = userEvent.setup()
    createWorkoutSetRepository().addSet(today(), { exerciseId: 'preset-chest-bench-press', reps: 10, weightKg: 60 }, false)
    await getRepository().updateExercise('preset-chest-bench-press', { bodyweight: true })
    render(<App />)
    const section = within(screen.getByRole('region', { name: '今日の筋トレ' }))
    await user.click(await section.findByRole('button', { name: 'ベンチプレス 1セット目を編集' }))
    const edit = within(section.getByRole('form', { name: 'ベンチプレス 1セット目を編集' }))
    expect(edit.getByLabelText('重量（kg）')).toHaveValue(60)
    await user.clear(edit.getByLabelText('回数'))
    await user.type(edit.getByLabelText('回数'), '9')
    await user.click(edit.getByRole('button', { name: '保存' }))
    expect(createWorkoutSetRepository().listSets(today())[0]).toMatchObject({ weightKg: 60, reps: 9 })
  })

  it('shows yesterday’s sets in the review', async () => {
    const user = userEvent.setup()
    const repo = createWorkoutSetRepository()
    const yesterday = addDays(today(), -1)
    repo.addSet(yesterday, { exerciseId: 'preset-chest-bench-press', weightKg: 60, reps: 10 }, false)
    repo.addSet(yesterday, { exerciseId: 'preset-chest-bench-press', weightKg: 60, reps: 8 }, false)
    repo.addSet(yesterday, { exerciseId: 'preset-chest-pushup', reps: 20 }, true)
    repo.addSet(today(), { exerciseId: 'preset-legs-squat', weightKg: 80, reps: 5 }, false)
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '昨日の記録' }))
    expect((await screen.findByText('ベンチプレス')).nextElementSibling).toHaveTextContent('60 kg × 10回 / 60 kg × 8回')
    expect(screen.getByText('腕立て伏せ').nextElementSibling).toHaveTextContent('20回')
    expect(screen.queryByText('スクワット')).not.toBeInTheDocument()
    expect(screen.queryByText('昨日の記録はありません。')).not.toBeInTheDocument()
  })
})
