import { test } from '@e2e-dev/web'
import { expect, credentials } from 'e2e'

// Один раз входим администратором — остальные тесты начинают уже с сессией
test.setup('вход администратора', { sessions: ['admin'] }, async ({ app, screen, session, browser }) => {
  const admin = credentials.user('admin')

  await app.open('/login')
  await screen.getByPlaceholder('Email').fill(admin.username)
  await screen.getByPlaceholder('Пароль').fill(admin.password)
  await screen.getByRole('button', 'Войти').tap()

  // Администратора после входа сразу переносит в админку
  await expect(browser).toHaveURL('/admin')
  await expect(screen.getByRole('button', 'Выйти')).toBeVisible()
  await session.save('admin')
})
