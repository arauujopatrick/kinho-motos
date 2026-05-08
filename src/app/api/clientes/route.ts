import { sql } from '@/lib/db';
import {
  getCustomerApiError,
  logCustomerApiError,
  NO_STORE_HEADERS,
  parseCustomerPayload,
} from '@/lib/customer-utils';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM customers ORDER BY name ASC`;
    return NextResponse.json(rows, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logCustomerApiError('listar', error);
    const apiError = getCustomerApiError(error, 'Erro ao buscar clientes no banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = parseCustomerPayload(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.message }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { name, phone, whatsapp, email, motorcycle, plate, address, observations } = parsed.data;
    const id = uuidv4();

    const rows = await sql`
      INSERT INTO customers (id, name, phone, whatsapp, email, motorcycle, plate, address, observations)
      VALUES (${id}, ${name}, ${phone}, ${whatsapp}, ${email}, ${motorcycle}, ${plate}, ${address}, ${observations})
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logCustomerApiError('criar', error);
    const apiError = getCustomerApiError(error, 'Erro ao inserir cliente no banco.');
    return NextResponse.json({ message: apiError.message }, { status: apiError.status, headers: NO_STORE_HEADERS });
  }
}
