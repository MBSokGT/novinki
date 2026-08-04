// Максимально прощающий поиск: находит нужное, даже если запрос набран с
// опечаткой ("Мила" → "Милла"), в другой раскладке клавиатуры ("Пробар"
// набран как "Ghj,fh" — ЙЦУКЕН вместо QWERTY, или наоборот) или транслитом
// ("mila" вместо "мила").
//
// Стратегия: генерируем несколько вариантов запроса (как набрано, и как
// набрано в другой раскладке) и сравниваем каждый с текстом товара — как
// напрямую, так и с транслитерированной в латиницу версией текста. Внутри
// сравнения слово-в-слово допускаем небольшое редакционное расстояние
// (Левенштейн), чтобы прощать пропущенные/лишние/перепутанные буквы.

// Раскладка ЙЦУКЕН ⇄ QWERTY, по физическому положению клавиш.
const EN_TO_RU_LAYOUT: Record<string, string> = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
  '[': 'х', ']': 'ъ',
  a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д', ';': 'ж', "'": 'э',
  z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь', ',': 'б', '.': 'ю', '/': '.',
  '`': 'ё',
}
const RU_TO_EN_LAYOUT: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_RU_LAYOUT).map(([en, ru]) => [ru, en])
)

function swapLayout(text: string, map: Record<string, string>): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
}

// Транслитерация кириллицы в латиницу (для сравнения с текстом, набранным
// на латинице по звучанию: "mila" должно найти "милла").
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

function transliterateToLatin(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[n]
}

// Сколько опечаток прощаем — тем больше, чем длиннее слово (иначе короткие
// запросы вроде "чай" находили бы половину каталога).
function toleranceFor(len: number): number {
  if (len <= 3) return 0
  if (len <= 6) return 1
  if (len <= 10) return 2
  return 3
}

function splitWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((w) => w.length > 0)
}

function wordFuzzyMatches(queryWord: string, textWords: string[], fullText: string): boolean {
  if (fullText.includes(queryWord)) return true
  if (queryWord.length < 3) return false

  const tolerance = toleranceFor(queryWord.length)
  return textWords.some((word) => {
    if (Math.abs(word.length - queryWord.length) > tolerance) return false
    return levenshtein(word, queryWord) <= tolerance
  })
}

/**
 * Проверяет, соответствует ли текст товара (собранный из name/brand/...)
 * поисковому запросу — с допуском на опечатки, неверную раскладку
 * клавиатуры и транслит.
 */
export function fuzzyMatches(fields: Array<string | null | undefined>, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true

  const text = fields.filter(Boolean).join(' ').toLowerCase()
  if (!text) return false

  const textVariants = [
    { text, words: splitWords(text) },
    // Транслит нужен, только если в тексте вообще есть кириллица.
    ...(/[а-яё]/i.test(text)
      ? [{ text: transliterateToLatin(text), words: splitWords(transliterateToLatin(text)) }]
      : []),
  ]

  const queryVariants = Array.from(
    new Set([query, swapLayout(query, EN_TO_RU_LAYOUT), swapLayout(query, RU_TO_EN_LAYOUT)])
  )

  return queryVariants.some((qVariant) => {
    const qWords = splitWords(qVariant)
    if (qWords.length === 0) return false
    return textVariants.some(({ text: tText, words: tWords }) =>
      qWords.every((qw) => wordFuzzyMatches(qw, tWords, tText))
    )
  })
}
