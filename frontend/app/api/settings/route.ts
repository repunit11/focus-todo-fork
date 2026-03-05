import { NextRequest, NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';

export async function GET() {
  const resp = await grpcApi.getSettings();
  return NextResponse.json(resp);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const resp = await grpcApi.updateSettings(body);
  return NextResponse.json(resp);
}
