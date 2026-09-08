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

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={dismiss}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {stage === 'offer' && (
          <>
            <div className="mb-1 flex items-center gap-2 text-slate-900">
              <svg className="h-5 w-5 shrink-0 text-[#9B1B1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <h3 className="text-lg font-bold">Определить ваш город?</h3>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Тогда ссылки «Посмотреть товар» будут сразу вести на страницу вашего города на complexbar.ru. Можно и не сейчас — город всегда можно выбрать вручную в верхнем левом углу сайта.
            </p>
            <div className="flex gap-2">
              <button onClick={locate} className="flex-1 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515]">
                Определить
              </button>
              <button onClick={dismiss} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Не сейчас
              </button>
            </div>
          </>
        )}

        {stage === 'locating' && (
          <div className="flex items-center justify-center gap-3 py-4">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#9B1B1B]" />
            <span className="text-sm text-slate-600">Определяем город…</span>
          </div>
        )}

        {stage === 'confirm' && detected && (
          <>
            <h3 className="mb-1 text-lg font-bold text-slate-900">Ваш город — {detected.name}?</h3>
            <p className="mb-4 text-sm text-slate-500">Ссылки на товары будут вести на страницу этого города.</p>
            <div className="flex gap-2">
              <button onClick={confirmYes} className="flex-1 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515]">
                Да, верно
              </button>
              <button onClick={() => setStage('not_found')} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Другой город
              </button>
            </div>
          </>
        )}

        {(stage === 'not_found' || stage === 'error') && (
          <>
            <h3 className="mb-1 text-lg font-bold text-slate-900">
              {stage === 'not_found' ? 'Не нашли ваш город в списке Комплекс-Бар' : 'Не получилось определить город'}
            </h3>
            <p className="mb-4 text-sm text-slate-500">Выберите его вручную — «Ваш город» есть в верхнем левом углу сайта.</p>
            <button onClick={dismiss} className="w-full rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515]">
              Понятно
            </button>
          </>
        )}
      </div>
    </div>
  )
}
