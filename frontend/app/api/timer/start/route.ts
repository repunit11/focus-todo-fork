import { NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';

export async function POST() {
  const resp = await grpcApi.startSession();
  return NextResponse.json(resp);
}
