// Комплекс-Бар показывает разный ассортимент/цены на городских поддоменах
// (naberezhnye-chelny.complexbar.ru и т.д.) — сама структура страницы товара
// (/product/slug/) при этом не меняется, меняется только домен. Список ниже
// снят напрямую с их собственного переключателя города (виджет геолокации
// на complexbar.ru) — если они добавят/переименуют город, этот список стоит
// свериться и обновить вручную.
export type ComplexbarCity = {
  name: string
  host: string
}

export const COMPLEXBAR_CITIES: ComplexbarCity[] = [
  { name: 'Москва', host: 'complexbar.ru' },
  { name: 'Алматы', host: 'complex-bar.kz' },
  { name: 'Архангельск', host: 'arkhangelsk.complexbar.ru' },
  { name: 'Астана', host: 'astana.complex-bar.kz' },
  { name: 'Астрахань', host: 'astrakhan.complexbar.ru' },
  { name: 'Барнаул', host: 'barnaul.complexbar.ru' },
  { name: 'Бишкек', host: 'complexbar.kg' },
  { name: 'Брянск', host: 'bryansk.complexbar.ru' },
  { name: 'Владивосток', host: 'vladivostok.complexbar.ru' },
  { name: 'Владимир', host: 'vladimir.complexbar.ru' },
  { name: 'Волгоград', host: 'volgograd.complexbar.ru' },
  { name: 'Вологда', host: 'vologda.complexbar.ru' },
  { name: 'Воронеж', host: 'voronezh.complexbar.ru' },
  { name: 'Геленджик', host: 'gelendzhik.complexbar.ru' },
  { name: 'Гомель', host: 'gomel.complexbar.by' },
  { name: 'Екатеринбург', host: 'ekb.complexbar.ru' },
  { name: 'Ереван', host: 'complexbar.am' },
  { name: 'Иваново', host: 'ivanovo.complexbar.ru' },
  { name: 'Ижевск', host: 'izhevsk.complexbar.ru' },
  { name: 'Казань', host: 'kazan.complexbar.ru' },
  { name: 'Караганда', host: 'karaganda.complex-bar.kz' },
  { name: 'Киров', host: 'kirov.complexbar.ru' },
  { name: 'Краснодар', host: 'krasnodar.complexbar.ru' },
  { name: 'Красноярск', host: 'krasnoyarsk.complexbar.ru' },
  { name: 'Курск', host: 'kursk.complexbar.ru' },
  { name: 'Липецк', host: 'lipeczk.complexbar.ru' },
  { name: 'Махачкала', host: 'mahachkala.complexbar.ru' },
  { name: 'Минск', host: 'complexbar.by' },
  { name: 'Мурманск', host: 'murmansk.complexbar.ru' },
  { name: 'Набережные Челны', host: 'naberezhnye-chelny.complexbar.ru' },
  { name: 'Нальчик', host: 'nalchik.complexbar.ru' },
  { name: 'Нижний Новгород', host: 'nn.complexbar.ru' },
  { name: 'Новосибирск', host: 'novosibirsk.complexbar.ru' },
  { name: 'Омск', host: 'omsk.complexbar.ru' },
  { name: 'Орел', host: 'orel.complexbar.ru' },
  { name: 'Оренбург', host: 'orenburg.complexbar.ru' },
  { name: 'Пенза', host: 'penza.complexbar.ru' },
  { name: 'Пермь', host: 'perm.complexbar.ru' },
  { name: 'Петрозаводск', host: 'petrozavodsk.complexbar.ru' },
  { name: 'Пятигорск', host: 'pyatigorsk.complexbar.ru' },
  { name: 'Ростов-на-Дону', host: 'rostov.complexbar.ru' },
  { name: 'Рязань', host: 'ryazan.complexbar.ru' },
  { name: 'Самара', host: 'samara.complexbar.ru' },
  { name: 'Санкт-Петербург', host: 'spb.complexbar.ru' },
  { name: 'Саранск', host: 'saransk.complexbar.ru' },
  { name: 'Саратов', host: 'saratov.complexbar.ru' },
  { name: 'Севастополь', host: 'sevastopol.complexbar.ru' },
  { name: 'Симферополь', host: 'simferopol.complexbar.ru' },
  { name: 'Смоленск', host: 'smolensk.complexbar.ru' },
  { name: 'Сочи', host: 'sochi.complexbar.ru' },
  { name: 'Ставрополь', host: 'stavropol.complexbar.ru' },
  { name: 'Сургут', host: 'surgut.complexbar.ru' },
  { name: 'Сыктывкар', host: 'syktyvkar.complexbar.ru' },
  { name: 'Тамбов', host: 'tambov.complexbar.ru' },
  { name: 'Тольятти', host: 'tolyatti.complexbar.ru' },
  { name: 'Тула', host: 'tula.complexbar.ru' },
  { name: 'Тюмень', host: 'tyumen.complexbar.ru' },
  { name: 'Ульяновск', host: 'ulyanovsk.complexbar.ru' },
  { name: 'Уфа', host: 'ufa.complexbar.ru' },
  { name: 'Феодосия', host: 'feodosiya.complexbar.ru' },
  { name: 'Хабаровск', host: 'khabarovsk.complexbar.ru' },
  { name: 'Чебоксары', host: 'cheboksary.complexbar.ru' },
  { name: 'Челябинск', host: 'chelyabinsk.complexbar.ru' },
  { name: 'Южно-Сахалинск', host: 'yuzhno-sakhalinsk.complexbar.ru' },
  { name: 'Ялта', host: 'yalta.complexbar.ru' },
  { name: 'Ярославль', host: 'yaroslavl.complexbar.ru' },
]

// Базовые домены Комплекс-Бар, для которых вообще имеет смысл подставлять
// городской поддомен — ссылку на посторонний сайт трогать нельзя.
const COMPLEXBAR_BASE_HOSTS = ['complexbar.ru', 'complex-bar.kz', 'complexbar.kg', 'complexbar.am', 'complexbar.by']

function isComplexbarHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  return COMPLEXBAR_BASE_HOSTS.some((base) => lower === base || lower.endsWith(`.${base}`))
}

/**
 * Подставляет в ссылку на товар complexbar.ru городской поддомен выбранного
 * пользователем города — путь товара (/product/slug/) от города не зависит,
 * меняется только хост. Ссылки на любые другие сайты не трогает.
 */
export function localizeComplexbarLink(url: string, cityHost: string | null): string {
  if (!cityHost) return url
  try {
    const parsed = new URL(url)
    if (!isComplexbarHost(parsed.hostname)) return url
    parsed.hostname = cityHost
    return parsed.toString()
  } catch {
    return url
  }
}
