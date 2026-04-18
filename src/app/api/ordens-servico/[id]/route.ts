import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    status, customer_id, guest_name, guest_phone, customer_contact,
    motorcycle, plate, description, total_value,
    promised_date, payment_method, card_installments, items
  } = body;

  const deliveryDate = status === 'Finalizado' ? new Date().toISOString() : null;

  const rows = await sql`
    UPDATE service_orders SET
      status = COALESCE(${status}, status),
      customer_id = ${customer_id}, guest_name = ${guest_name}, guest_phone = ${guest_phone},
      customer_contact = ${customer_contact}, motorcycle = ${motorcycle}, plate = ${plate},
      description = ${description}, total_value = ${total_value}, promised_date = ${promised_date},
      payment_method = ${payment_method}, card_installments = ${card_installments},
      delivery_date = COALESCE(${deliveryDate}, delivery_date)
    WHERE id = ${id} RETURNING *
  `;

  if (items) {
    await sql`DELETE FROM service_order_items WHERE service_order_id = ${id}`;
    for (const item of items) {
      await sql`INSERT INTO service_order_items (service_order_id, description, price) VALUES (${id}, ${item.description}, ${item.price})`;
    }
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM service_orders WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
