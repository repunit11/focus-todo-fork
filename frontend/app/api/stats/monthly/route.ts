import { NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';

export async function GET() {
  const resp = await grpcApi.monthlyStats();
  return NextResponse.json(resp);
}
