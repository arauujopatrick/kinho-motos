'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import type { ServiceOrder } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Historico() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  useEffect(() => { fetch('/api/ordens-servico').then(r => r.json()).then(setOrders); }, []);

  const finished = orders.filter(o => o.status === 'Finalizado').sort((a, b) => new Date(b.delivery_date || 0).getTime() - new Date(a.delivery_date || 0).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><History size={22} /> Histórico</h1>
        <p className="text-zinc-400 text-sm mt-1">{finished.length} OS finalizadas</p>
      </div>

      {finished.length === 0 && <p className="text-center text-zinc-500 py-10">Nenhuma OS finalizada ainda</p>}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Moto / Placa</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Entrega</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Pagamento</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {finished.map(o => (
              <tr key={o.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-white">{o.guest_name || o.customer_name || '—'}</td>
                <td className="px-4 py-3 text-zinc-300">{o.motorcycle} {o.plate ? `• ${o.plate}` : ''}</td>
                <td className="px-4 py-3 text-zinc-400">{o.delivery_date ? format(new Date(o.delivery_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{o.payment_method}</td>
                <td className="px-4 py-3 text-right text-green-400 font-semibold">R$ {Number(o.total_value).toFixed(2).replace('.', ',')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
