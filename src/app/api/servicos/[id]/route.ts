import { sql } from '@/lib/db';
import { isUuid, NO_STORE_HEADERS } from '@/lib/customer-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ message: 'Identificador do serviço inválido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = Number(body.price ?? 0);

    if (!name) {
      return NextResponse.json({ message: 'Informe o nome do serviço.' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ message: 'Informe um preço válido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const rows = await sql`
      UPDATE services SET name = ${name}, price = ${price}
      WHERE id = ${id} RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(rows[0], { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[servicos:atualizar]', error);
    return NextResponse.json({ message: 'Erro ao atualizar serviço no banco.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ message: 'Identificador do serviço inválido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const rows = await sql`DELETE FROM services WHERE id = ${id} RETURNING id`;

    if (!rows[0]) {
      return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[servicos:remover]', error);
    return NextResponse.json({ message: 'Erro ao remover serviço no banco.' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
