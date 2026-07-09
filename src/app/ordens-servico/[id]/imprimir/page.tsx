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

  return (
    <div className="os-print-wrapper bg-white text-black max-w-3xl mx-auto">
      <Via order={order} label="1ª via — Cliente" />
      <div className="print-cut border-t-2 border-dashed border-zinc-400 relative">
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] text-zinc-500">✂ corte aqui</span>
      </div>
      <Via order={order} label="2ª via — Oficina" />
    </div>
  );
}

function Via({ order, label }: { order: ServiceOrder; label: string }) {
  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + Number(i.price), 0);
  const discount = Number(order.discount) || 0;
  const total = Number(order.total_value);
  const sinal = total / 2;
  const restante = total - sinal;

  return (
    <div className="print-via p-5 text-[13px]">
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <div>
          <h1 className="text-lg font-bold">Kinho Motos</h1>
          <p className="text-xs text-zinc-600">Ordem de Serviço — {label}</p>
        </div>
        <div className="text-right text-xs">
          <p>OS #{order.id.slice(0, 8).toUpperCase()}</p>
          <p>Entrada: {order.entry_date ? format(new Date(order.entry_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p>
          <p>Entrega: {order.promised_date ? format(new Date(order.promised_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <p className="text-zinc-500 uppercase mb-0.5">Cliente</p>
          <p className="font-medium">{order.guest_name || order.customer_name || '—'}</p>
          <p>{order.customer_contact || order.guest_phone || ''}</p>
        </div>
        <div>
          <p className="text-zinc-500 uppercase mb-0.5">Veículo</p>
          <p className="font-medium">{order.motorcycle || '—'}</p>
          <p>{order.plate || ''}</p>
        </div>
      </div>

      {order.description && (
        <div className="mb-3 text-xs">
          <p className="text-zinc-500 uppercase mb-0.5">Observações</p>
          <p>{order.description}</p>
        </div>
      )}

      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Serviço / Peça</th>
            <th className="text-right py-1">Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id} className="border-b border-zinc-300">
              <td className="py-1">{i.description}</td>
              <td className="py-1 text-right">R$ {Number(i.price).toFixed(2).replace('.', ',')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-56 text-xs space-y-0.5 mb-3">
        <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
        {discount > 0 && <div className="flex justify-between"><span>Desconto</span><span>- R$ {discount.toFixed(2).replace('.', ',')}</span></div>}
        <div className="flex justify-between font-bold text-sm border-t border-black pt-0.5"><span>Total</span><span>R$ {total.toFixed(2).replace('.', ',')}</span></div>
      </div>

      <div className="border-2 border-black rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-xs">Sinal antecipado (50%)</p>
          <p className="text-[10px] text-zinc-600">Pagamento necessário para início do serviço</p>
        </div>
        <p className="text-base font-bold">R$ {sinal.toFixed(2).replace('.', ',')}</p>
      </div>

      <div className="flex justify-between text-xs mb-4">
        <span>Restante na entrega</span>
        <span className="font-medium">R$ {restante.toFixed(2).replace('.', ',')}</span>
      </div>

      <div className="grid grid-cols-2 gap-6 text-[11px] text-center mt-6">
        <div className="border-t border-black pt-1">Assinatura do Cliente</div>
        <div className="border-t border-black pt-1">Kinho Motos</div>
      </div>
    </div>
  );
}
