#!/bin/bash

# Скрипт для генерации иконок из SVG
# Требует ImageMagick: brew install imagemagick

echo "🎨 Генерация иконок для iOS PWA..."

# Создаем папку для иконок
mkdir -p ../public/icons

# Размеры иконок
sizes=(72 96 128 144 152 192 384 512)

# Генерируем PNG из SVG
for size in "${sizes[@]}"
do
  echo "Создаю icon-${size}x${size}.png..."
  convert -background none -resize ${size}x${size} icon-template.svg ../public/icons/icon-${size}x${size}.png
done

echo "✅ Готово! Иконки созданы в public/icons/"
echo ""
echo "📱 Следующий шаг: скопируйте manifest.json и service-worker.js в public/"
echo "   cp manifest.json ../public/"
echo "   cp service-worker.js ../public/"
