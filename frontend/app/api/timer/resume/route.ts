import { NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';

export async function POST() {
  const resp = await grpcApi.resumeSession();
  return NextResponse.json(resp);
}
