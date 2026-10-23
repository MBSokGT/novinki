import { test, describe } from '@e2e-dev/web'
import { expect } from 'e2e'

describe('вендоры', () => {
  test('новый вендор показывается первым, дальше — по порядку добавления', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/?tab=vendors')
    const names = screen.getByRole('heading', { level: 3 })
    await expect(names).toHaveCount(3)
    // Добавлены по очереди Alpha → Bravo → Charlie, значит сверху последний
    expect(await names.allTextContents()).toEqual(['Вендор Charlie', 'Вендор Bravo', 'Вендор Alpha'])
  })
})
