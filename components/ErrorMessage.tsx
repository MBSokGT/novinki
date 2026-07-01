interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <svg className="w-14 h-14 mx-auto mb-4 text-[#9B1B1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Ошибка</h2>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="space-x-3">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition"
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