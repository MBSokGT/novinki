export default function ProductSkeleton({ viewMode = 'cards' }: { viewMode?: 'cards' | 'table' }) {
  if (viewMode === 'table') {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="lg:hidden divide-y divide-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 p-4 animate-pulse">
              <div className="w-16 h-16 shrink-0 bg-slate-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Фото</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Название</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Бренд</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Описание</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Преимущества</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Внимание</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="w-20 h-20 bg-slate-200 rounded-lg"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-8 bg-slate-200 rounded w-24 mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
          <div className="h-36 bg-slate-200"></div>
          <div className="p-3 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            <div className="h-3 bg-slate-200 rounded w-full"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
            <div className="h-8 bg-slate-200 rounded w-full mt-2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
