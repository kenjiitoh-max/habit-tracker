import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExercisesView from './ExercisesView'
import { createDemoRepository } from './lib/demoRepository'

it('shows an empty filter and keeps input when saving fails', async () => {
  const repository = createDemoRepository('2026-01-02')
  vi.spyOn(repository, 'listExercises').mockResolvedValue([])
  vi.spyOn(repository, 'createExercise').mockRejectedValue(new Error('quota'))
  const user = userEvent.setup()
  render(<ExercisesView repository={repository} />)
  expect(await screen.findByText('まだ種目がありません。追加してみましょう。')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '＋ 種目を追加する' }))
  await user.type(screen.getByLabelText('種目名'), 'ロウ')
  await user.click(screen.getByRole('button', { name: '保存する' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('保存できませんでした')
  expect(screen.getByLabelText('種目名')).toHaveValue('ロウ')
  await user.click(screen.getByRole('button', { name: 'キャンセル' }))
  expect(screen.queryByLabelText('種目名')).not.toBeInTheDocument()
})

it('reports load errors and disables adding', async () => {
  const repository = createDemoRepository('2026-01-02')
  vi.spyOn(repository, 'listExercises').mockRejectedValue(new Error('corrupt'))
  render(<ExercisesView repository={repository} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('種目を読み込めませんでした')
  expect(screen.getByRole('button', { name: '＋ 種目を追加する' })).toBeDisabled()
})
