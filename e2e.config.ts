import type { E2EConfig } from 'e2e'
import { web } from '@e2e-dev/web'

// Автотесты в браузере. Перед запуском нужна сборка (npm run build) — это
// делает `npm run test:e2e`. Приложение поднимается на пустой временной базе
// (e2e/start-app.mjs), с сайтом complexbar.ru тесты не связываются.
const url = `http://127.0.0.1:${process.env.E2E_PORT || '3100'}`
const app = {
  url,
  command: { executable: 'node', args: ['e2e/start-app.mjs'], log: '.e2e/logs/app.log', startupTimeout: 120_000 },
}

export default {
  tests: 'e2e/**/*.e2e.ts',
  // Chromium — основной; WebKit — движок Safari (iPhone), где раньше ломались картинки
  targets: [
    { name: 'chromium', engine: web(), app },
    { name: 'webkit', engine: web({ browser: 'webkit' }), app },
  ],
  credentials: {
    admin: {
      username: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@example.test',
      password: process.env.E2E_ADMIN_PASSWORD || 'e2e-local-password',
    },
  },
} satisfies E2EConfig
