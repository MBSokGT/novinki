// Ссылки на сайт вводятся вручную в админке (и приходят из Excel-импорта),
// поэтому нельзя доверять их напрямую как готовый href — иначе можно вставить
// javascript:/data: и получить исполняемую "ссылку" в карточке товара/вендора.

/** Приводит введённую пользователем ссылку к безопасному виду для сохранения в БД. */
export function normalizeLink(link?: string): string {
  const trimmed = (link || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // Отклоняем прочие схемы (javascript:, data:, vbscript: и т.д.) — вместо
  // них считаем, что это просто домен без протокола, и подставляем https://.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return ''
  return `https://${trimmed}`
}

/** Возвращает href только если ссылка безопасна для рендера, иначе null. */
export function safeHref(url?: string | null): string | null {
  const trimmed = (url || '').trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}
