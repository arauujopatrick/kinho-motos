import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const rows = await sql`SELECT * FROM daily_tasks ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const rows = await sql`
      INSERT INTO daily_tasks (id, text) VALUES (${id}, ${body.text}) RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao salvar tarefa', { status: 500 });
  }
}
