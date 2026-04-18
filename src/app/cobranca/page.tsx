'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, CreditCard } from 'lucide-react';
import type { ServiceOrder } from '@/types';

export default function Cobranca() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  useEffect(() => { fetch('/api/ordens-servico').then(r => r.json()).then(setOrders); }, []);

  const pending = orders.filter(o => o.status === 'Finalizado');

  function whatsapp(o: ServiceOrder) {
    const contact = o.customer_contact || o.guest_phone || '';
    const msg = encodeURIComponent(`Olá! Lembramos que sua moto ${o.motorcycle} está disponível para retirada. Valor: R$ ${Number(o.total_value).toFixed(2).replace('.', ',')}.`);
    window.open(`https://wa.me/55${contact.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cobrança</h1>
        <p className="text-zinc-400 text-sm mt-1">{pending.length} OS finalizadas</p>
      </div>

      {pending.length === 0 && <p className="text-center text-zinc-500 py-10">Nenhuma OS finalizada pendente de cobrança</p>}

      <div className="grid gap-4">
        {pending.map(o => (
          <div key={o.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{o.guest_name || o.customer_name || '—'}</p>
              <p className="text-zinc-400 text-sm">{o.motorcycle} {o.plate ? `• ${o.plate}` : ''}</p>
              <p className="text-zinc-500 text-xs mt-1 flex items-center gap-1"><CreditCard size={12} /> {o.payment_method}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xl font-bold text-white">R$ {Number(o.total_value).toFixed(2).replace('.', ',')}</p>
              <button onClick={() => whatsapp(o)} className="flex items-center gap-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-2 rounded-lg text-sm transition-colors">
                <MessageCircle size={16} /> WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
