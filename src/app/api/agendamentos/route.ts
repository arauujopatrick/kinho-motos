import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

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
  try {
    const body = await req.json();
    const { customer_id, guest_name, guest_phone, motorcycle, plate, service, date, time } = body;
    const id = uuidv4();

    const rows = await sql`
      INSERT INTO appointments (id, customer_id, guest_name, guest_phone, motorcycle, plate, service, date, time)
      VALUES (${id}, ${customer_id || null}, ${guest_name || null}, ${guest_phone || null}, ${motorcycle || null}, ${plate || null}, ${service || null}, ${date}, ${time})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao salvar agendamento', { status: 500 });
  }
}
