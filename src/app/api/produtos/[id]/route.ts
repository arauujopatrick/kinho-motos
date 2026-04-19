import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, category, price, stock, barcode, cost } = body;

  const rows = await sql`
    UPDATE products SET name = ${name}, category = ${category}, price = ${price}, stock = ${stock}, barcode = ${barcode ?? null}, cost = ${cost ?? 0}
    WHERE id = ${id} RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM products WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
