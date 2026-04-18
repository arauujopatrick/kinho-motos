import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const orders = await sql`
    SELECT os.*, c.name as customer_name
    FROM service_orders os
    LEFT JOIN customers c ON c.id = os.customer_id
    ORDER BY os.entry_date DESC
  `;
  const items = await sql`SELECT * FROM service_order_items`;

  const result = orders.map(o => ({
    ...o,
    items: items.filter(i => i.service_order_id === o.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    customer_id, guest_name, guest_phone, customer_contact,
    motorcycle, plate, description, total_value,
    promised_date, payment_method, card_installments, items
  } = body;

  const rows = await sql`
    INSERT INTO service_orders (customer_id, guest_name, guest_phone, customer_contact, motorcycle, plate, description, total_value, promised_date, payment_method, card_installments)
    VALUES (${customer_id}, ${guest_name}, ${guest_phone}, ${customer_contact}, ${motorcycle}, ${plate}, ${description}, ${total_value}, ${promised_date}, ${payment_method}, ${card_installments})
    RETURNING *
  `;
  const order = rows[0];

  if (items?.length) {
    for (const item of items) {
      await sql`INSERT INTO service_order_items (service_order_id, description, price) VALUES (${order.id}, ${item.description}, ${item.price})`;
    }
  }

  return NextResponse.json(order, { status: 201 });
}
