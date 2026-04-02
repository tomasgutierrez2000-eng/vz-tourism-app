import { NextRequest, NextResponse } from 'next/server';
import { getRoomTypes, upsertRoomType } from '@/lib/availability-store';
import { randomUUID } from 'crypto';

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const data = getRoomTypes(id);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

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

  if (!name || !base_price || !max_guests) {
    return NextResponse.json(
      { error: 'name, base_price, and max_guests are required' },
      { status: 400 }
    );
  }

  const room = upsertRoomType({
    id: randomUUID(),
    listing_id: id,
    name,
    base_price: Number(base_price),
    max_guests: Number(max_guests),
    amenities: amenities ?? [],
    count: Number(count ?? 1),
  });

  return NextResponse.json({ data: room }, { status: 201 });
}
