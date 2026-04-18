import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rows = await sql`SELECT * FROM daily_tasks ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = await sql`
    INSERT INTO daily_tasks (text) VALUES (${body.text}) RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
