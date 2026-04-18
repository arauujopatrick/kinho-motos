import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, payment_method, customer_name } = body;
  // items: [{ product_id, name, quantity, unit_price, subtotal }]

  const total = items.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0);

  // Baixa estoque de cada item
  for (const item of items) {
    const product = await sql`SELECT stock FROM products WHERE id = ${item.product_id}`;
    if (!product[0]) continue;

    const newStock = Math.max(0, product[0].stock - item.quantity);
    await sql`UPDATE products SET stock = ${newStock} WHERE id = ${item.product_id}`;
    await sql`
      INSERT INTO stock_movements (product_id, type, quantity, reason)
      VALUES (${item.product_id}, 'OUT', ${item.quantity}, ${'Venda PDV'})
    `;
  }

  // Lança no financeiro
  const desc = customer_name ? `Venda PDV - ${customer_name}` : 'Venda PDV';
  const transaction = await sql`
    INSERT INTO transactions (description, type, value, payment_method)
    VALUES (${desc}, 'INCOME', ${total}, ${payment_method})
    RETURNING *
  `;

  return NextResponse.json({ transaction: transaction[0], total }, { status: 201 });
}
