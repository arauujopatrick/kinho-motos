import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const rows = await sql`
    SELECT * FROM products WHERE barcode = ${code} AND stock > 0 LIMIT 1
  `;

  if (!rows[0]) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
