import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, customer_id, guest_name, guest_phone, motorcycle, plate, description, total_value, valid_until, items } = body;

    const norm = (v: unknown) => (v === '' || v === undefined ? null : v);

    const rows = await sql`
      UPDATE quotes SET
        status = COALESCE(${norm(status)}, status),
        customer_id = COALESCE(${norm(customer_id)}::uuid, customer_id),
        guest_name = COALESCE(${norm(guest_name)}, guest_name),
        guest_phone = COALESCE(${norm(guest_phone)}, guest_phone),
        motorcycle = COALESCE(${norm(motorcycle)}, motorcycle),
        plate = COALESCE(${norm(plate)}, plate),
        description = COALESCE(${norm(description)}, description),
        total_value = COALESCE(${total_value ?? null}, total_value),
        valid_until = COALESCE(${norm(valid_until)}, valid_until)
      WHERE id = ${id} RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ message: 'Orçamento não encontrado.' }, { status: 404 });
    }

    if (items) {
      await sql`DELETE FROM quote_items WHERE quote_id = ${id}`;
      for (const item of items) {
        await sql`INSERT INTO quote_items (quote_id, description, price) VALUES (${id}, ${item.description}, ${item.price})`;
      }
    }

    return NextResponse.json(rows[0]);
  } catch (error: unknown) {
    console.error('[orcamentos:atualizar]', error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar orçamento no banco.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM quotes WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
