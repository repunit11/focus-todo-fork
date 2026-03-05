import { NextRequest, NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const focusSeconds = Number(body?.focusSeconds ?? 0);
  const completedPomodoro = Boolean(body?.completedPomodoro);

  if (!Number.isFinite(focusSeconds) || focusSeconds <= 0) {
    return NextResponse.json({ error: 'focusSeconds must be positive' }, { status: 400 });
  }

  const resp = await grpcApi.logFocusSession(focusSeconds, completedPomodoro);
  return NextResponse.json(resp);
}
