# 📱 iOS Приложение (PWA)

Превращаем веб-приложение в нативное iOS приложение через PWA (Progressive Web App).

## 🚀 Быстрая установка

### Шаг 1: Скопировать файлы

```bash
# Из папки ios-app скопировать в public/
cp ios-app/manifest.json public/
cp ios-app/service-worker.js public/
```

### Шаг 2: Создать иконки

Создайте папку `public/icons/` и добавьте иконки:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

**Быстрый способ:** Используйте онлайн генератор:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

Загрузите одну картинку 512x512px, получите все размеры.

### Шаг 3: Обновить layout.tsx

Добавьте в `app/layout.tsx` в секцию `<head>`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#8B1538" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Новинки" />
<link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
```

### Шаг 4: Зарегистрировать Service Worker

Создайте файл `app/register-sw.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log('SW registered'))
        .catch((err) => console.log('SW registration failed', err));
    }
  }, []);

  return null;
}
```

Добавьте в `app/layout.tsx`:

```tsx
import RegisterSW from './register-sw';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
```

### Шаг 5: Обновить next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... существующие настройки
  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## 📲 Установка на iPhone/iPad

1. Откройте сайт в Safari (обязательно Safari!)
2. Нажмите кнопку "Поделиться" (квадрат со стрелкой вверх)
3. Прокрутите вниз и выберите "На экран «Домой»"
4. Нажмите "Добавить"
5. Готово! Иконка появится на главном экране

## ✨ Что получаем:

✅ Иконка на главном экране iPhone/iPad
✅ Запуск как нативное приложение (без браузерной панели)
✅ Работа офлайн (базовая)
✅ Splash screen при запуске
✅ Бордовая тема (#8B1538)
✅ Портретная ориентация
✅ Полноэкранный режим

## 🔧 Дополнительные улучшения:

### Push-уведомления (опционально)

Для push-уведомлений нужен сервис типа OneSignal или Firebase Cloud Messaging.

### Улучшенный офлайн режим

Отредактируйте `service-worker.js` для кеширования изображений и API запросов.

## 📝 Примечания:

- **iOS требует HTTPS** для PWA (на localhost работает)
- Safari на iOS имеет ограничения по сравнению с Android
- Нет доступа к App Store (это веб-приложение)
- Обновления происходят автоматически при открытии

## 🐛 Troubleshooting:

**Не появляется кнопка "На экран Домой":**
- Убедитесь, что используете Safari (не Chrome/Firefox)
- Проверьте, что manifest.json доступен по /manifest.json
- Очистите кеш Safari

**Иконка не отображается:**
- Проверьте путь к иконкам в manifest.json
- Убедитесь, что файлы существуют в public/icons/

**Service Worker не регистрируется:**
- Проверьте консоль браузера на ошибки
- Убедитесь, что файл доступен по /service-worker.js

## 🚀 Деплой:

После деплоя на Vercel/Netlify приложение автоматически станет PWA.
Пользователи смогут установить его на свои устройства.
