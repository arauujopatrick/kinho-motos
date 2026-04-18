import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rows = await sql`SELECT * FROM customers ORDER BY name ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, whatsapp, email, motorcycle, plate, address, observations } = body;

  const rows = await sql`
    INSERT INTO customers (name, phone, whatsapp, email, motorcycle, plate, address, observations)
    VALUES (${name}, ${phone}, ${whatsapp}, ${email}, ${motorcycle}, ${plate}, ${address}, ${observations})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
