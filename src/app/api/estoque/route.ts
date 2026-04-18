import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rows = await sql`
    SELECT sm.*, p.name as product_name
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    ORDER BY sm.date DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { product_id, type, quantity, reason } = body;

  const product = await sql`SELECT stock FROM products WHERE id = ${product_id}`;
  if (!product[0]) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

  const currentStock = product[0].stock;
  const newStock = type === 'IN' ? currentStock + quantity : Math.max(0, currentStock - quantity);
  const actualQty = type === 'OUT' ? currentStock - newStock : quantity;

  await sql`UPDATE products SET stock = ${newStock} WHERE id = ${product_id}`;

  const rows = await sql`
    INSERT INTO stock_movements (product_id, type, quantity, reason)
    VALUES (${product_id}, ${type}, ${actualQty}, ${reason})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
