# ⚡ Быстрый старт - 5 минут

## Вариант 1: Автоматическая генерация иконок

```bash
cd ios-app

# Установить ImageMagick (если нет)
brew install imagemagick

# Сгенерировать иконки
chmod +x generate-icons.sh
./generate-icons.sh

# Скопировать файлы
cp manifest.json ../public/
cp service-worker.js ../public/
```

## Вариант 2: Онлайн генератор (проще)

1. Откройте https://www.pwabuilder.com/imageGenerator
2. Загрузите любую картинку 512x512px (можно логотип компании)
3. Скачайте ZIP с иконками
4. Распакуйте в `public/icons/`
5. Скопируйте:
```bash
cp manifest.json ../public/
cp service-worker.js ../public/
```

## Добавить в код

### 1. Обновите `app/layout.tsx`:

Найдите секцию `<head>` и добавьте ПЕРЕД закрывающим `</head>`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#8B1538" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Новинки" />
<link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
```

### 2. Создайте `app/register-sw.tsx`:

```tsx
'use client';
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }
  }, []);
  return null;
}
```

### 3. Добавьте в `app/layout.tsx`:

```tsx
import RegisterSW from './register-sw';

// В return, после открывающего <body>:
<body>
  <RegisterSW />
  {/* остальной код */}
</body>
```

## Готово! 🎉

Запустите `npm run dev` и откройте на iPhone в Safari:
1. Кнопка "Поделиться" → "На экран Домой"
2. Приложение установлено!

---

**Нужна помощь?** Смотри полный README.md в этой папке.
