import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { executeDataRequest, type DataRequestPayload } from '@/lib/d1'

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as DataRequestPayload
    const result = await executeDataRequest(request, payload)
    const status = result.error ? (result.error.message === 'Authentication required' ? 401 : result.error.message === 'Forbidden' ? 403 : 400) : 200
    return NextResponse.json(result, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown data error' },
        count: null,
      },
      { status: 400 }
    )
  }
}
