import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { PdfRejected, extractPdfText } from '@/lib/pdfText'

export const dynamic = 'force-dynamic'

// Админка присылает PDF (анонс, прайс) и получает из него текст — чтобы
// найти артикулы в окне «Артикулы».
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || !user.is_admin) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  const file = (await request.formData().catch(() => null))?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ data: null, error: { message: 'Файл не получен' } }, { status: 400 })
  }

  try {
    const { text, pages } = await extractPdfText(new Uint8Array(await file.arrayBuffer()))
    return NextResponse.json({ data: { text, pages }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof PdfRejected) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 400 })
    throw error
  }
}
