'use client';

import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { Transaction } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão', 'N/A'];

export default function Financeiro() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ description: '', type: 'INCOME', value: '', payment_method: 'Dinheiro' });

  useEffect(() => { fetch('/api/financeiro').then(r => r.json()).then(setTransactions); }, []);

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.value), 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.value), 0);
  const balance = income - expense;

  async function save() {
    if (!form.description || !form.value) return;
    const res = await fetch('/api/financeiro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, value: parseFloat(form.value) }) });
    const created = await res.json();
    setTransactions(prev => [created, ...prev]);
    setModal(false);
    setForm({ description: '', type: 'INCOME', value: '', payment_method: 'Dinheiro' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-zinc-400 text-sm mt-1">{transactions.length} lançamentos</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-green-400" /><span className="text-zinc-400 text-sm">Receitas</span></div>
          <p className="text-2xl font-bold text-green-400">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={16} className="text-red-400" /><span className="text-zinc-400 text-sm">Despesas</span></div>
          <p className="text-2xl font-bold text-red-400">R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={16} className="text-orange-400" /><span className="text-zinc-400 text-sm">Saldo</span></div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Descrição</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Data</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Pagamento</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-zinc-500">Nenhum lançamento</td></tr>}
            {transactions.map(t => (
              <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.type === 'INCOME' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-white">{t.description}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{t.date ? format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{t.payment_method}</td>
                <td className={`px-4 py-3 text-right font-semibold ${t.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'INCOME' ? '+' : '-'} R$ {Number(t.value).toFixed(2).replace('.', ',')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Novo Lançamento</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs text-zinc-400 mb-1">Descrição *</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                    <option value="INCOME">Receita</option>
                    <option value="EXPENSE">Despesa</option>
                  </select>
                </div>
                <div><label className="block text-xs text-zinc-400 mb-1">Valor *</label><input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Forma de pagamento</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
