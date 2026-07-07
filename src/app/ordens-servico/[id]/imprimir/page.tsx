'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ServiceOrder } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ImprimirOS() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/ordens-servico/${id}`).then(async r => {
      if (!r.ok) { setNotFound(true); return; }
      setOrder(await r.json());
    });
  }, [id]);

  useEffect(() => {
    if (order) setTimeout(() => window.print(), 300);
  }, [order]);

  if (notFound) return <p className="p-10 text-center text-zinc-500">Ordem de serviço não encontrada.</p>;
  if (!order) return <p className="p-10 text-center text-zinc-500">Carregando...</p>;

  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + Number(i.price), 0);
  const discount = Number(order.discount) || 0;
  const total = Number(order.total_value);
  const sinal = total / 2;
  const restante = total - sinal;

  return (
    <div className="print-page bg-white text-black max-w-2xl mx-auto p-10 font-sans">
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kinho Motos</h1>
          <p className="text-sm text-zinc-600">Ordem de Serviço</p>
        </div>
        <div className="text-right text-sm">
          <p>OS #{order.id.slice(0, 8).toUpperCase()}</p>
          <p>Entrada: {order.entry_date ? format(new Date(order.entry_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p>
          <p>Entrega: {order.promised_date ? format(new Date(order.promised_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-zinc-500 text-xs uppercase mb-1">Cliente</p>
          <p className="font-medium">{order.guest_name || order.customer_name || '—'}</p>
          <p>{order.customer_contact || order.guest_phone || ''}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs uppercase mb-1">Veículo</p>
          <p className="font-medium">{order.motorcycle || '—'}</p>
          <p>{order.plate || ''}</p>
        </div>
      </div>

      {order.description && (
        <div className="mb-6 text-sm">
          <p className="text-zinc-500 text-xs uppercase mb-1">Observações</p>
          <p>{order.description}</p>
        </div>
      )}

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-2">Serviço / Peça</th>
            <th className="text-right py-2">Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id} className="border-b border-zinc-300">
              <td className="py-2">{i.description}</td>
              <td className="py-2 text-right">R$ {Number(i.price).toFixed(2).replace('.', ',')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-64 text-sm space-y-1 mb-8">
        <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
        {discount > 0 && <div className="flex justify-between"><span>Desconto</span><span>- R$ {discount.toFixed(2).replace('.', ',')}</span></div>}
        <div className="flex justify-between font-bold text-base border-t border-black pt-1"><span>Total</span><span>R$ {total.toFixed(2).replace('.', ',')}</span></div>
      </div>

      <div className="border-2 border-black rounded-lg p-4 mb-8 flex items-center justify-between">
        <div>
          <p className="font-bold">Sinal antecipado (50%)</p>
          <p className="text-xs text-zinc-600">Pagamento necessário para início do serviço</p>
        </div>
        <p className="text-xl font-bold">R$ {sinal.toFixed(2).replace('.', ',')}</p>
      </div>

      <div className="flex justify-between text-sm mb-10">
        <span>Restante na entrega</span>
        <span className="font-medium">R$ {restante.toFixed(2).replace('.', ',')}</span>
      </div>

      <div className="grid grid-cols-2 gap-8 text-sm text-center mt-16">
        <div className="border-t border-black pt-2">Assinatura do Cliente</div>
        <div className="border-t border-black pt-2">Kinho Motos</div>
      </div>
    </div>
  );
}
