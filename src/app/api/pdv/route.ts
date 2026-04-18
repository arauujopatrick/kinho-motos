import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
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

      const movId = uuidv4();
      await sql`
        INSERT INTO stock_movements (id, product_id, type, quantity, reason)
        VALUES (${movId}, ${item.product_id}, 'OUT', ${item.quantity}, ${'Venda PDV'})
      `;
    }

    // Lança no financeiro
    const desc = customer_name ? `Venda PDV - ${customer_name}` : 'Venda PDV';
    const txId = uuidv4();
    const transaction = await sql`
      INSERT INTO transactions (id, description, type, value, payment_method)
      VALUES (${txId}, ${desc}, 'INCOME', ${total}, ${payment_method})
      RETURNING *
    `;

    return NextResponse.json({ transaction: transaction[0], total }, { status: 201 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao processar venda', { status: 500 });
  }
}
