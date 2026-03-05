import { NextResponse } from 'next/server';

export function grpcErrorResponse(err: unknown) {
  const anyErr = err as { code?: number; details?: string; message?: string };
  const code = anyErr?.code;
  const details = anyErr?.details || anyErr?.message || 'grpc request failed';

  const statusMap: Record<number, number> = {
    3: 400,
    5: 404,
    6: 409,
    9: 409,
    13: 500,
    14: 503
  };

  const status = statusMap[code ?? 13] ?? 500;
  return NextResponse.json({ error: details, grpcCode: code ?? 13 }, { status });
}
