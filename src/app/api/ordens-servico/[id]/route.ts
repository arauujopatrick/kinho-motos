import { sql } from '@/lib/db';
import { NO_STORE_HEADERS } from '@/lib/customer-utils';
import {
  getServiceOrderApiError,
  logServiceOrderApiError,
  parseServiceOrderPayload,
} from '@/lib/service-order-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const isBodyRecord = typeof body === 'object' && body !== null;

    if (
      isBodyRecord &&
      typeof body.status === 'string' &&
      !('items' in body) &&
      !('customer_id' in body) &&
      !('motorcycle' in body) &&
      !('promised_date' in body)
    ) {
      const deliveryDate = body.status === 'Finalizado' ? new Date().toISOString() : null;
      const rows = await sql`
        UPDATE service_orders SET
          status = ${body.status},
          delivery_date = CASE
            WHEN ${body.status} = 'Finalizado' THEN ${deliveryDate}
            WHEN ${body.status} <> 'Finalizado' THEN NULL
            ELSE delivery_date
          END
        WHERE id = ${id}
        RETURNING *
      `;

      if (!rows[0]) {
        return NextResponse.json({ message: 'Ordem de serviço não encontrada.' }, { status: 404, headers: NO_STORE_HEADERS });
      }

      return NextResponse.json(rows[0], { headers: NO_STORE_HEADERS });
    }

    const parsed = parseServiceOrderPayload(body);
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
      promised_date,
      payment_method,
      card_installments,
      items,
    } = parsed.data;

    const status = typeof body.status === 'string' ? body.status : undefined;
    const deliveryDate = status === 'Finalizado' ? new Date().toISOString() : null;

    const rows = await sql`
      UPDATE service_orders SET
        status = COALESCE(${status}, status),
        customer_id = ${customer_id},
        guest_name = ${guest_name},
        guest_phone = ${guest_phone},
        customer_contact = ${customer_contact},
        motorcycle = ${motorcycle},
        plate = ${plate},
        description = ${description},
        total_value = ${total_value},
        promised_date = ${promised_date},
        payment_method = ${payment_method},
        card_installments = ${card_installments},
        delivery_date = CASE
          WHEN ${status} = 'Finalizado' THEN ${deliveryDate}
          WHEN ${status} IS NOT NULL AND ${status} <> 'Finalizado' THEN NULL
          ELSE delivery_date
        END
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ message: 'Ordem de serviço não encontrada.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    await sql`DELETE FROM service_order_items WHERE service_order_id = ${id}`;

    const updatedItems = [];
    for (const item of items) {
      const itemId = item.id || crypto.randomUUID();
      const itemRows = await sql`
        INSERT INTO service_order_items (id, service_order_id, description, price)
        VALUES (${itemId}, ${id}, ${item.description}, ${item.price})
        RETURNING *
      `;
      updatedItems.push(itemRows[0]);
    }

    return NextResponse.json({ ...rows[0], items: updatedItems }, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logServiceOrderApiError('atualizar', error);
    const apiError = getServiceOrderApiError(error, 'Erro ao atualizar ordem de serviço no banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await sql`DELETE FROM service_orders WHERE id = ${id} RETURNING id`;

    if (!rows[0]) {
      return NextResponse.json({ message: 'Ordem de serviço não encontrada.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logServiceOrderApiError('remover', error);
    const apiError = getServiceOrderApiError(error, 'Erro ao remover ordem de serviço do banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}
