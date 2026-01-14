import ProductsTable from '@/components/ProductsTable'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Новинки ассортимента</h1>
          <Link href="/admin" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Админ панель
          </Link>
        </div>
        <ProductsTable />
      </div>
    </div>
  )
}
