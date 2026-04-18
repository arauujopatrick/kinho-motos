import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const rows = await sql`SELECT * FROM transactions ORDER BY date DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, type, value, payment_method, source_id, date } = body;
    const id = uuidv4();

    const rows = await sql`
      INSERT INTO transactions (id, description, type, value, payment_method, source_id, date)
      VALUES (${id}, ${description}, ${type}, ${value}, ${payment_method}, ${source_id}, ${date ?? new Date().toISOString()})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao salvar transação', { status: 500 });
  }
}
