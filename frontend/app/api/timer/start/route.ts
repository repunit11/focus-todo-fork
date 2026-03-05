import { NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';
import { grpcErrorResponse } from '@/app/api/_utils/grpc-error';

export async function POST() {
  try {
    const resp = await grpcApi.startSession();
    return NextResponse.json(resp);
  } catch (err) {
    return grpcErrorResponse(err);
  }
}
