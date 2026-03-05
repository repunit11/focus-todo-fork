import { NextRequest, NextResponse } from 'next/server';
import { grpcApi } from '@/lib/grpc';

export async function GET() {
  const resp = await grpcApi.listTasks(true);
  return NextResponse.json(resp);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const resp = await grpcApi.createTask(body);
  return NextResponse.json(resp);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const resp = await grpcApi.completeTask(body.id);
  return NextResponse.json(resp);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const resp = await grpcApi.deleteTask(body.id);
  return NextResponse.json(resp);
}
