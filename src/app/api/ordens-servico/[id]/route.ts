import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Atualização parcial — só os campos enviados
  const {
    status, customer_id, guest_name, guest_phone, customer_contact,
    motorcycle, plate, description, total_value,
    promised_date, payment_method, card_installments, items
  } = body;

  const norm = (v: unknown) => (v === '' || v === undefined ? null : v);
  const cid = customer_id === undefined ? undefined : (customer_id || null);
  const installments = card_installments === undefined ? undefined :
    (card_installments === '' || card_installments === null ? null : parseInt(String(card_installments)));
  const deliveryDate = status === 'Finalizado' ? new Date().toISOString() : null;

  const rows = await sql`
    UPDATE service_orders SET
      status = COALESCE(${norm(status)}, status),
      customer_id = COALESCE(${cid ?? null}::uuid, customer_id),
      guest_name = COALESCE(${norm(guest_name)}, guest_name),
      guest_phone = COALESCE(${norm(guest_phone)}, guest_phone),
      customer_contact = COALESCE(${norm(customer_contact)}, customer_contact),
      motorcycle = COALESCE(${norm(motorcycle)}, motorcycle),
      plate = COALESCE(${norm(plate)}, plate),
      description = COALESCE(${norm(description)}, description),
      total_value = COALESCE(${total_value ?? null}, total_value),
      promised_date = COALESCE(${norm(promised_date)}, promised_date),
      payment_method = COALESCE(${norm(payment_method)}, payment_method),
      card_installments = COALESCE(${installments ?? null}, card_installments),
      delivery_date = COALESCE(${deliveryDate}, delivery_date)
    WHERE id = ${id} RETURNING *
  `;

  if (items) {
    await sql`DELETE FROM service_order_items WHERE service_order_id = ${id}`;
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await sql`INSERT INTO service_order_items (id, service_order_id, description, price) VALUES (${itemId}, ${id}, ${item.description}, ${item.price})`;
    }
  }

  const updatedItems = await sql`SELECT * FROM service_order_items WHERE service_order_id = ${id}`;
  return NextResponse.json({ ...rows[0], items: updatedItems });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM service_orders WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
