'use client'

import { useEffect } from 'react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => {})
    }
  }, [])

  return null
}
