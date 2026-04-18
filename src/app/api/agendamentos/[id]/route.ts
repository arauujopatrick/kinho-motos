import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, customer_id, guest_name, guest_phone, motorcycle, plate, service, date, time } = body;

  const rows = await sql`
    UPDATE appointments SET
      status = COALESCE(${status}, status),
      customer_id = ${customer_id}, guest_name = ${guest_name}, guest_phone = ${guest_phone},
      motorcycle = ${motorcycle}, plate = ${plate}, service = ${service},
      date = ${date}, time = ${time}
    WHERE id = ${id} RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM appointments WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
