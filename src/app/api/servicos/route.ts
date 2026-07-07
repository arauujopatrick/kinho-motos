import { sql } from '@/lib/db';
import { NO_STORE_HEADERS } from '@/lib/customer-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM services ORDER BY name ASC`;
    return NextResponse.json(rows, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[servicos:listar]', error);
    return NextResponse.json({ message: 'Erro ao buscar serviços no banco.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = Number(body.price ?? 0);

    if (!name) {
      return NextResponse.json({ message: 'Informe o nome do serviço.' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ message: 'Informe um preço válido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const id = crypto.randomUUID();
    const rows = await sql`
      INSERT INTO services (id, name, price)
      VALUES (${id}, ${name}, ${price})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[servicos:criar]', error);
    return NextResponse.json({ message: 'Erro ao criar serviço no banco.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
