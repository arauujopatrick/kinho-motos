import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, phone, whatsapp, email, motorcycle, plate, address, observations } = body;

  const rows = await sql`
    UPDATE customers SET
      name = ${name}, phone = ${phone}, whatsapp = ${whatsapp},
      email = ${email}, motorcycle = ${motorcycle}, plate = ${plate},
      address = ${address}, observations = ${observations}
    WHERE id = ${id} RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM customers WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
