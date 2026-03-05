import { NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';
import { grpcErrorResponse } from '@/app/api/_utils/grpc-error';

export async function GET() {
  try {
    const resp = await grpcApi.getActiveSession();
    return NextResponse.json(resp);
  } catch (err) {
    return grpcErrorResponse(err);
  }
}
