import { sql } from '@/lib/db';
import {
  getServiceOrderApiError,
  logServiceOrderApiError,
  parseServiceOrderPayload,
} from '@/lib/service-order-utils';
import { NO_STORE_HEADERS } from '@/lib/customer-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const orders = await sql`
      SELECT os.*, c.name as customer_name
      FROM service_orders os
      LEFT JOIN customers c ON c.id = os.customer_id
      ORDER BY os.entry_date DESC
    `;
    const items = await sql`SELECT * FROM service_order_items`;

    const result = orders.map((order) => ({
      ...order,
      items: items.filter((item) => item.service_order_id === order.id),
    }));

    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logServiceOrderApiError('listar', error);
    const apiError = getServiceOrderApiError(error, 'Erro ao buscar ordens de serviço no banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = parseServiceOrderPayload(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.message }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const {
      customer_id,
      guest_name,
      guest_phone,
      customer_contact,
      motorcycle,
      plate,
      description,
      total_value,
      entry_date,
      promised_date,
      payment_method,
      card_installments,
      items,
    } = parsed.data;

    const id = crypto.randomUUID();

    const rows = await sql`
      INSERT INTO service_orders (
        id, customer_id, guest_name, guest_phone, customer_contact,
        motorcycle, plate, description, total_value, entry_date,
        promised_date, payment_method, card_installments
      )
      VALUES (
        ${id}, ${customer_id}, ${guest_name}, ${guest_phone}, ${customer_contact},
        ${motorcycle}, ${plate}, ${description}, ${total_value}, ${entry_date},
        ${promised_date}, ${payment_method}, ${card_installments}
      )
      RETURNING *
    `;
    const order = rows[0];

    const createdItems = [];
    for (const item of items) {
      const itemId = crypto.randomUUID();
      const itemRows = await sql`
        INSERT INTO service_order_items (id, service_order_id, description, price)
        VALUES (${itemId}, ${order.id}, ${item.description}, ${item.price})
        RETURNING *
      `;
      createdItems.push(itemRows[0]);
    }

    return NextResponse.json({ ...order, items: createdItems }, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logServiceOrderApiError('criar', error);
    const apiError = getServiceOrderApiError(error, 'Erro ao criar ordem de serviço no banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}
