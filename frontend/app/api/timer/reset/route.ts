import { NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';
import { grpcErrorResponse } from '@/app/api/_utils/grpc-error';

export async function POST() {
  try {
    await grpcApi.resetSession();
    return NextResponse.json({ ok: true, session: null });
  } catch (err) {
    return grpcErrorResponse(err);
  }
}
