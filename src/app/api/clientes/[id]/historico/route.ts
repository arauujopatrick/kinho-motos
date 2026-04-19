import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [orders, appointments, quotes] = await Promise.all([
      sql`
        SELECT os.*, 
          COALESCE(json_agg(si.*) FILTER (WHERE si.id IS NOT NULL), '[]') as items
        FROM service_orders os
        LEFT JOIN service_order_items si ON si.service_order_id = os.id
        WHERE os.customer_id = ${id}
        GROUP BY os.id
        ORDER BY os.entry_date DESC
      `,
      sql`
        SELECT * FROM appointments
        WHERE customer_id = ${id}
        ORDER BY date DESC, time DESC
      `,
      sql`
        SELECT q.*,
          COALESCE(json_agg(qi.*) FILTER (WHERE qi.id IS NOT NULL), '[]') as items
        FROM quotes q
        LEFT JOIN quote_items qi ON qi.quote_id = q.id
        WHERE q.customer_id = ${id}
        GROUP BY q.id
        ORDER BY q.created_at DESC
      `,
    ]);

    return NextResponse.json({ orders, appointments, quotes });
  } catch (error: any) {
    return new Response(error.message || 'Erro ao buscar histórico', { status: 500 });
  }
}
