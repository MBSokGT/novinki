# Статус настройки (Cloudflare D1)

## Выполнено
- проект переведен на `Cloudflare D1`
- добавлен `wrangler.jsonc`
- добавлен `open-next.config.ts`
- создана D1 база `my-db-name`
- применена миграция [migrations/0001_initial.sql](/Users/admin/Desktop/Новинки/novinki-app/migrations/0001_initial.sql)
- фронт переведен с PocketBase-клиента на внутренний fetch-клиент к D1 route handlers
- runtime-ориентация на Vercel убрана
- `logo.png` подключен как browser icon

## Ключевые runtime-файлы
- [lib/d1.ts](/Users/admin/Desktop/Новинки/novinki-app/lib/d1.ts)
- [lib/supabase.ts](/Users/admin/Desktop/Новинки/novinki-app/lib/supabase.ts)
- [app/api/internal/auth/route.ts](/Users/admin/Desktop/Новинки/novinki-app/app/api/internal/auth/route.ts)
- [app/api/internal/data/route.ts](/Users/admin/Desktop/Новинки/novinki-app/app/api/internal/data/route.ts)
- [app/api/internal/rpc/route.ts](/Users/admin/Desktop/Новинки/novinki-app/app/api/internal/rpc/route.ts)
- [wrangler.jsonc](/Users/admin/Desktop/Новинки/novinki-app/wrangler.jsonc)

## Проверка
- `npm run build` проходит
- удаленная D1 схема создана и применена
