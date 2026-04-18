import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rows = await sql`
    SELECT a.*, c.name as customer_name
    FROM appointments a
    LEFT JOIN customers c ON c.id = a.customer_id
    ORDER BY a.date DESC, a.time ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_id, guest_name, guest_phone, motorcycle, plate, service, date, time } = body;

  const rows = await sql`
    INSERT INTO appointments (customer_id, guest_name, guest_phone, motorcycle, plate, service, date, time)
    VALUES (${customer_id}, ${guest_name}, ${guest_phone}, ${motorcycle}, ${plate}, ${service}, ${date}, ${time})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
