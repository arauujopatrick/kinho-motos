import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const rows = await sql`SELECT * FROM products ORDER BY name ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, price, stock, barcode, cost } = body;
    const id = uuidv4();

    const rows = await sql`
      INSERT INTO products (id, name, category, price, stock, barcode, cost)
      VALUES (${id}, ${name}, ${category}, ${price}, ${stock ?? 0}, ${barcode ?? null}, ${cost ?? 0})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao salvar produto', { status: 500 });
  }
}
