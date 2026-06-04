import { sql } from '@/lib/db';
import {
  getCustomerApiError,
  logCustomerApiError,
  NO_STORE_HEADERS,
  parseCustomerPayload,
} from '@/lib/customer-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = parseCustomerPayload(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.message }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { name, phone, whatsapp, email, motorcycle, plate, address, observations } = parsed.data;

    const rows = await sql`
      UPDATE customers SET
        name = ${name}, phone = ${phone}, whatsapp = ${whatsapp},
        email = ${email}, motorcycle = ${motorcycle}, plate = ${plate},
        address = ${address}, observations = ${observations}
      WHERE id = ${id} RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ message: 'Cliente não encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(rows[0], { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logCustomerApiError('atualizar', error);
    const apiError = getCustomerApiError(error, 'Erro ao atualizar cliente no banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id`;

    if (!rows[0]) {
      return NextResponse.json({ message: 'Cliente não encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logCustomerApiError('remover', error);
    const apiError = getCustomerApiError(error, 'Erro ao remover cliente do banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}
