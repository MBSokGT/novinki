const MIN_LENGTH = 3
const MAX_LENGTH = 80

// Запрос в виде, под которым он попадает в журнал «не нашли»: без регистра,
// лишних пробелов и знаков по краям. Пусто (null) — запрос записывать не надо:
// слишком короткий или длинный, ссылка или разметка.
export function normalizeMissQuery(raw: string): string | null {
  // Разметку и ссылки отсекаем до того, как подчистим края, иначе «<script>» превратится в «script»
  if (/[<>{}]|https?:|www\./i.test(raw)) return null
  const query = raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  return query.length >= MIN_LENGTH && query.length <= MAX_LENGTH ? query : null
}
