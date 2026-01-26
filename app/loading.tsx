export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-800 mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Загрузка новинок...</p>
      </div>
    </div>
  )
}