import { NextRequest, NextResponse } from 'next/server';
import { upsertRoomType, deleteRoomType } from '@/lib/availability-store';

interface Params { params: Promise<{ id: string; roomId: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const { id, roomId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, base_price, max_guests, amenities, count } = body as {
    name: string;
    base_price: number;
    max_guests: number;
    amenities: string[];
    count: number;
  };

  const room = upsertRoomType({
    id: roomId,
    listing_id: id,
    name,
    base_price: Number(base_price),
    max_guests: Number(max_guests),
    amenities: amenities ?? [],
    count: Number(count ?? 1),
  });

  return NextResponse.json({ data: room });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { roomId } = await params;
  const deleted = deleteRoomType(roomId);
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
