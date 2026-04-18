import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rows = await sql`SELECT * FROM products ORDER BY name ASC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, price, stock } = body;

  const rows = await sql`
    INSERT INTO products (name, category, price, stock)
    VALUES (${name}, ${category}, ${price}, ${stock ?? 0})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
