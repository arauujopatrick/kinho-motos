import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { description, type, value, payment_method } = body;

    const rows = await sql`
      UPDATE transactions SET
        description = ${description}, type = ${type},
        value = ${value}, payment_method = ${payment_method}
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return new Response(error.message || 'Erro ao atualizar transação', { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await sql`DELETE FROM transactions WHERE id = ${id}`;
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao excluir transação', { status: 500 });
  }
}
