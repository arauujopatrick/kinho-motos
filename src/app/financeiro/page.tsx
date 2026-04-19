'use client';

import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão', 'N/A'];

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(key: string) {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return format(d, "MMMM 'de' yyyy", { locale: ptBR });
}

export default function Financeiro() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(getMonthKey(new Date()));
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ description: '', type: 'INCOME', value: '', payment_method: 'Dinheiro' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/financeiro').then(r => r.json()).then(setAllTransactions); }, []);

  // Filtra por mês selecionado
  const transactions = allTransactions.filter(t => {
    if (!t.date) return false;
    return t.date.startsWith(month);
  });

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.value), 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.value), 0);
  const balance = income - expense;
  const profit = income - expense;

  function changeMonth(offset: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setMonth(getMonthKey(d));
  }

  function openNew() {
    setEditing(null);
    setForm({ description: '', type: 'INCOME', value: '', payment_method: 'Dinheiro' });
    setError('');
    setModal(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setForm({ description: t.description, type: t.type, value: String(t.value), payment_method: t.payment_method as string });
    setError('');
    setModal(true);
  }

  async function save() {
    if (!form.description.trim() || !form.value.trim()) {
      setError('Preencha descrição e valor.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const res = await fetch(`/api/financeiro/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, value: parseFloat(form.value) }),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        setAllTransactions(prev => prev.map(t => t.id === editing.id ? updated : t));
      } else {
        const res = await fetch('/api/financeiro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, value: parseFloat(form.value) }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        setAllTransactions(prev => [created, ...prev]);
      }
      setModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await fetch(`/api/financeiro/${id}`, { method: 'DELETE' });
      setAllTransactions(prev => prev.filter(t => t.id !== id));
    } catch {
      alert('Erro ao excluir lançamento');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-zinc-400 text-sm mt-1">{transactions.length} lançamentos no mês</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Lançamento
        </button>
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

      <div className="grid grid-cols-4 gap-4">
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
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-2">
            {profit >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
            <span className="text-zinc-400 text-sm">Lucro Líquido</span>
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-zinc-500">Nenhum lançamento neste mês</td></tr>}
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(t)} className="text-zinc-400 hover:text-white p-1 rounded transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => remove(t.id)} className="text-zinc-400 hover:text-red-400 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                  </div>
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
              <h2 className="font-semibold text-white">{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
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
              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
