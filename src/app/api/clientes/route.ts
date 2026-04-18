import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const rows = await sql`SELECT * FROM customers ORDER BY name ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, whatsapp, email, motorcycle, plate, address, observations } = body;
    
    const id = uuidv4();

    const rows = await sql`
      INSERT INTO customers (id, name, phone, whatsapp, email, motorcycle, plate, address, observations)
      VALUES (${id}, ${name}, ${phone}, ${whatsapp}, ${email}, ${motorcycle}, ${plate}, ${address}, ${observations})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao inserir no banco', { status: 500 });
  }
}

