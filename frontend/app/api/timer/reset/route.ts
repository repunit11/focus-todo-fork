import { NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';
import { grpcErrorResponse } from '@/app/api/_utils/grpc-error';

export async function POST() {
  try {
    const active = (await grpcApi.getActiveSession()) as { session?: { id?: string } };
    if (!active?.session?.id) {
      return NextResponse.json({ ok: true, session: null });
    }

    const resp = (await grpcApi.stopSession()) as { session?: unknown };
    return NextResponse.json({ ok: true, session: resp.session ?? null });
  } catch (err) {
    return grpcErrorResponse(err);
  }
}
