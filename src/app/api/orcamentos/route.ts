import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const quotes = await sql`
    SELECT q.*, c.name as customer_name
    FROM quotes q
    LEFT JOIN customers c ON c.id = q.customer_id
    ORDER BY q.created_at DESC
  `;
  const items = await sql`SELECT * FROM quote_items`;

  const result = quotes.map(q => ({
    ...q,
    items: items.filter(i => i.quote_id === q.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, guest_name, guest_phone, motorcycle, plate, description, total_value, valid_until, items } = body;
    const id = uuidv4();

    const rows = await sql`
      INSERT INTO quotes (id, customer_id, guest_name, guest_phone, motorcycle, plate, description, total_value, valid_until)
      VALUES (${id}, ${customer_id || null}, ${guest_name || null}, ${guest_phone || null}, ${motorcycle || null}, ${plate || null}, ${description || null}, ${total_value}, ${valid_until || null})
      RETURNING *
    `;
    const quote = rows[0];

    if (items?.length) {
      for (const item of items) {
        const itemId = uuidv4();
        await sql`INSERT INTO quote_items (id, quote_id, description, price) VALUES (${itemId}, ${quote.id}, ${item.description}, ${item.price})`;
      }
    }

    return NextResponse.json(quote, { status: 201 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao salvar orçamento', { status: 500 });
  }
}
