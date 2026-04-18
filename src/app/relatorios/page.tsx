'use client';

import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, TrendingDown, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction, ServiceOrder } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(key: string) {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return format(d, "MMMM 'de' yyyy", { locale: ptBR });
}

export default function Relatorios() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allOrders, setAllOrders] = useState<ServiceOrder[]>([]);
  const [month, setMonth] = useState(getMonthKey(new Date()));

  useEffect(() => {
    Promise.all([
      fetch('/api/financeiro').then(r => r.json()),
      fetch('/api/ordens-servico').then(r => r.json()),
    ]).then(([t, o]) => { setAllTransactions(t); setAllOrders(o); });
  }, []);

  function changeMonth(offset: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setMonth(getMonthKey(d));
  }

  // Filtro por mês
  const transactions = allTransactions.filter(t => t.date?.startsWith(month));
  const orders = allOrders.filter(o => o.entry_date?.startsWith(month));

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.value), 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.value), 0);
  const totalOS = orders.length;
  const finishedOS = orders.filter(o => o.status === 'Finalizado').length;
  const avgTicket = finishedOS > 0 ? orders.filter(o => o.status === 'Finalizado').reduce((s, o) => s + Number(o.total_value), 0) / finishedOS : 0;

  const paymentCount = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.payment_method] = (acc[t.payment_method] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart2 size={22} /> Relatórios</h1>
        <p className="text-zinc-400 text-sm mt-1">Visão geral do negócio</p>
      </div>

      {/* Seletor de mês */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => changeMonth(-1)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="text-white font-semibold text-lg capitalize min-w-[220px] text-center">
          {formatMonth(month)}
        </span>
        <button onClick={() => changeMonth(1)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Receita" value={`R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<TrendingUp size={18} />} color="green" />
        <Stat label="Despesas" value={`R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<TrendingDown size={18} />} color="red" />
        <Stat label="Total de OS" value={totalOS} icon={<ClipboardList size={18} />} color="blue" />
        <Stat label="Ticket Médio" value={`R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<BarChart2 size={18} />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="font-semibold text-white mb-4">OS por Status</h2>
          {['Aberto', 'Em andamento', 'Finalizado'].map(status => {
            const count = orders.filter(o => o.status === status).length;
            const pct = totalOS > 0 ? (count / totalOS) * 100 : 0;
            return (
              <div key={status} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{status}</span>
                  <span className="text-zinc-400">{count}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full"><div className="h-2 bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          {totalOS === 0 && <p className="text-zinc-500 text-sm">Sem OS neste mês</p>}
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h2 className="font-semibold text-white mb-4">Formas de Pagamento</h2>
          {Object.entries(paymentCount).map(([method, count]) => (
            <div key={method} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">{method}</span>
                <span className="text-zinc-400">{count}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full"><div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${(count / transactions.length) * 100}%` }} /></div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-zinc-500 text-sm">Sem dados neste mês</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = { green: 'bg-green-500/10 text-green-400', red: 'bg-red-500/10 text-red-400', blue: 'bg-blue-500/10 text-blue-400', orange: 'bg-orange-500/10 text-orange-400' };
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
