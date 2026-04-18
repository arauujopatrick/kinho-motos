'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, User } from 'lucide-react';
import type { Customer } from '@/types';

const empty = { name: '', phone: '', whatsapp: '', email: '', motorcycle: '', plate: '', address: '', observations: '' };

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Clientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/clientes').then(r => r.json()).then(setCustomers); }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.plate || '').toLowerCase().includes(search.toLowerCase())
  );

  function openNew() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(c: Customer) { setEditing(c); setForm({ name: c.name, phone: c.phone, whatsapp: c.whatsapp, email: c.email || '', motorcycle: c.motorcycle || '', plate: c.plate || '', address: c.address || '', observations: c.observations || '' }); setModal(true); }

  async function save() {
    if (!form.name || !form.phone) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const res = await fetch(`/api/clientes/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        setCustomers(prev => prev.map(c => c.id === editing.id ? updated : c));
      } else {
        const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        setCustomers(prev => [created, ...prev]);
      }
      setModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remover cliente?')) return;
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    setCustomers(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-zinc-400 text-sm mt-1">{customers.length} clientes cadastrados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou placa..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500" />
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Nome</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Telefone</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Moto / Placa</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-zinc-500">Nenhum cliente encontrado</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-orange-400" />
                    </div>
                    <span className="text-white font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{c.phone}</td>
                <td className="px-4 py-3 text-zinc-300">{c.motorcycle || '—'}{c.plate ? ` • ${c.plate}` : ''}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(c)} className="text-zinc-400 hover:text-white p-1 rounded transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => remove(c.id)} className="text-zinc-400 hover:text-red-400 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="Nome *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} span />
              <Field label="Telefone *" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: maskPhone(v) }))} placeholder="(00) 00000-0000" />
              <Field label="WhatsApp" value={form.whatsapp} onChange={v => setForm(f => ({ ...f, whatsapp: maskPhone(v) }))} placeholder="(00) 00000-0000" />
              <Field label="E-mail" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
              <Field label="Moto" value={form.motorcycle} onChange={v => setForm(f => ({ ...f, motorcycle: v }))} />
              <Field label="Placa" value={form.plate} onChange={v => setForm(f => ({ ...f, plate: v.toUpperCase() }))} />
              <Field label="Endereço" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} span />
              <Field label="Observações" value={form.observations} onChange={v => setForm(f => ({ ...f, observations: v }))} span />
              {error && <p className="col-span-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
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

function Field({ label, value, onChange, span, placeholder }: { label: string; value: string; onChange: (v: string) => void; span?: boolean; placeholder?: string }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500" />
    </div>
  );
}
