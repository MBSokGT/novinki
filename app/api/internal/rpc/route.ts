import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { executeRpc } from '@/lib/d1'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, any>
    const functionName = String(body?.functionName || '')
    const result = await executeRpc(request, functionName, body?.params)
    const status = result.error ? (result.error.message === 'Forbidden' ? 403 : 400) : 200
    return NextResponse.json(result, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown RPC error' },
      },
      { status: 400 }
    )
  }
}
