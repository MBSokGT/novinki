import type { Metadata } from 'next'

// Подборки для клиентов открываются только по ссылке — в поиске им делать нечего
export const metadata: Metadata = {
  title: 'Подборка — Комплекс-Бар',
  robots: { index: false, follow: false },
}

export default function SelectionLayout({ children }: { children: React.ReactNode }) {
  return children
}
