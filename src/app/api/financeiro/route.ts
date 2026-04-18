import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rows = await sql`SELECT * FROM transactions ORDER BY date DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, type, value, payment_method, source_id, date } = body;

  const rows = await sql`
    INSERT INTO transactions (description, type, value, payment_method, source_id, date)
    VALUES (${description}, ${type}, ${value}, ${payment_method}, ${source_id}, ${date ?? new Date().toISOString()})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
