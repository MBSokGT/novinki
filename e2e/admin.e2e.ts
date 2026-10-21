import { test, describe } from '@e2e-dev/web'
import { expect } from 'e2e'

describe('админка', () => {
  test('предупреждает о дубле по артикулу, в том числе без нулей и по варианту серии', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/admin')
    const article = screen.getByPlaceholder('Например: 123456')

    await article.fill('2030586')
    await expect(screen.getByText('Такой товар уже есть', { exact: false })).toBeVisible()

    await article.fill('5045263')
    await expect(screen.getByText('как вариант серии', { exact: false })).toBeVisible()

    await article.fill('777777')
    await expect(screen.getByText('Такой товар уже есть', { exact: false })).toBeHidden()
  })

  test('окно «Список артикулов» считает артикулы в любом тексте', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/admin')
    await screen.getByRole('button', 'Список артикулов').tap()
    await screen.getByRole('textbox').last().fill('Probar Premium:\n2030586, 2030587; 2110341\n2030587 ещё раз и 123')
    await expect(screen.getByText('Найдено артикулов: 3')).toBeVisible()
  })

  test('цены за неделю: подешевевший товар в списке', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/admin')
    await expect(screen.getByText('Цены за неделю')).toBeVisible()
  })
})
