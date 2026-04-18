import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, customer_id, guest_name, guest_phone, motorcycle, plate, description, total_value, valid_until, items } = body;

  const rows = await sql`
    UPDATE quotes SET
      status = COALESCE(${status}, status),
      customer_id = ${customer_id}, guest_name = ${guest_name}, guest_phone = ${guest_phone},
      motorcycle = ${motorcycle}, plate = ${plate}, description = ${description},
      total_value = ${total_value}, valid_until = ${valid_until}
    WHERE id = ${id} RETURNING *
  `;

  if (items) {
    await sql`DELETE FROM quote_items WHERE quote_id = ${id}`;
    for (const item of items) {
      await sql`INSERT INTO quote_items (quote_id, description, price) VALUES (${id}, ${item.description}, ${item.price})`;
    }
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM quotes WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
