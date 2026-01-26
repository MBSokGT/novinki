interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Ошибка</h2>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="space-x-3">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition"
            >
              Повторить
            </button>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    </div>
  )
}