/// <reference types="@cloudflare/workers-types" />

export {}

declare global {
  interface CloudflareEnv {
    DB: D1Database
    APP_URL?: string
    REQUEST_WEBHOOK_URL?: string
    PASSWORD_RESET_WEBHOOK_URL?: string
  }
}
