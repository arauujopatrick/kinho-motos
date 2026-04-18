import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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
  const body = await req.json();
  const { customer_id, guest_name, guest_phone, motorcycle, plate, description, total_value, valid_until, items } = body;

  const rows = await sql`
    INSERT INTO quotes (customer_id, guest_name, guest_phone, motorcycle, plate, description, total_value, valid_until)
    VALUES (${customer_id}, ${guest_name}, ${guest_phone}, ${motorcycle}, ${plate}, ${description}, ${total_value}, ${valid_until})
    RETURNING *
  `;
  const quote = rows[0];

  if (items?.length) {
    for (const item of items) {
      await sql`INSERT INTO quote_items (quote_id, description, price) VALUES (${quote.id}, ${item.description}, ${item.price})`;
    }
  }

  return NextResponse.json(quote, { status: 201 });
}
