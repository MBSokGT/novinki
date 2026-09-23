'use client'

import { useEffect, useState } from 'react'
import { COMPLEXBAR_CITIES } from '@/lib/complexbar-cities'

// Спрашиваем один раз за браузер — если сотрудник отказался или город не
// нашёлся в списке Комплекс-Бар, больше не докучаем (город всегда можно
// выбрать вручную в верхнем левом углу сайта).
const ASKED_KEY = 'complexbar_city_geo_asked'

type Stage = 'hidden' | 'offer' | 'locating' | 'confirm' | 'not_found' | 'error'

function normalize(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').trim()
}

function matchCity(rawName: string) {
  const target = normalize(rawName)
  return (
    COMPLEXBAR_CITIES.find((city) => normalize(city.name) === target) ||
    COMPLEXBAR_CITIES.find((city) => target.includes(normalize(city.name)) || normalize(city.name).includes(target)) ||
    null
  )
}

interface CityLocationPromptProps {
  cityHost: string | null
  setCityHost: (host: string | null) => void
}

export default function CityLocationPrompt({ cityHost, setCityHost }: CityLocationPromptProps) {
  const [stage, setStage] = useState<Stage>('hidden')
  const [detected, setDetected] = useState<{ name: string; host: string } | null>(null)

  useEffect(() => {
    if (cityHost) return
    let asked = false
    try {
      asked = localStorage.getItem(ASKED_KEY) === '1'
    } catch {
      // localStorage недоступен — просто не показываем окно
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- флаг из localStorage доступен только после монтирования
    if (!asked) setStage('offer')
  }, [cityHost])

  const markAsked = () => {
    try {
      localStorage.setItem(ASKED_KEY, '1')
    } catch {
      // ignore
    }
  }

  const dismiss = () => {
    markAsked()
    setStage('hidden')
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setStage('error')
      markAsked()
      return
    }
    setStage('locating')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&accept-language=ru&zoom=10`
          )
          const data = await response.json()
          const rawCity: string | undefined =
            data?.address?.city || data?.address?.town || data?.address?.municipality || data?.address?.village || data?.address?.county
          const match = rawCity ? matchCity(rawCity) : null
          if (match) {
            setDetected({ name: match.name, host: match.host })
            setStage('confirm')
          } else {
            setStage('not_found')
            markAsked()
          }
        } catch {
          setStage('error')
          markAsked()
        }
      },
      () => {
        setStage('error')
        markAsked()
      },
      { timeout: 8000 }
    )
  }

  const confirmYes = () => {
    if (detected) setCityHost(detected.host)
    markAsked()
    setStage('hidden')
  }

  if (stage === 'hidden') return null

  const primaryBtn = 'rounded-md bg-[#9B1B1B] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#7A1515]'
  const secondaryBtn = 'rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700'

  // Не модальное окно, а тонкая плашка под шапкой: сайтом можно пользоваться
  // сразу, не отвечая на вопрос, — плашка просто остаётся, пока её не закрыть.
  return (
    <div className="border-b border-slate-200 bg-[#FAF6F5]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm text-slate-600 sm:px-6">
        <svg className="h-4 w-4 shrink-0 text-[#9B1B1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

        {stage === 'offer' && (
          <>
            <span className="min-w-0 flex-1">
              <span className="sm:hidden">Определить ваш город для ссылок на сайт?</span>
              <span className="hidden sm:inline">Определить ваш город, чтобы ссылки на товары вели на complexbar.ru вашего города?</span>
            </span>
            <button onClick={locate} className={primaryBtn}>Определить</button>
          </>
        )}

        {stage === 'locating' && (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#9B1B1B]" />
            Определяем город…
          </span>
        )}

        {stage === 'confirm' && detected && (
          <>
            <span className="min-w-0 flex-1">Ваш город — <b className="font-semibold text-slate-800">{detected.name}</b>?</span>
            <button onClick={confirmYes} className={primaryBtn}>Да, верно</button>
            <button onClick={() => setStage('not_found')} className={secondaryBtn}>Другой город</button>
          </>
        )}

        {(stage === 'not_found' || stage === 'error') && (
          <span className="min-w-0 flex-1">
            {stage === 'not_found' ? 'Не нашли ваш город в списке Комплекс-Бар.' : 'Не получилось определить город.'} Выберите его вручную — «Ваш город» слева вверху.
          </span>
        )}

        <button onClick={dismiss} aria-label="Закрыть" className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
