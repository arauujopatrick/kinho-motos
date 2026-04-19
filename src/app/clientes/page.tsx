'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, User, History, ClipboardList, Calendar, FileText } from 'lucide-react';
import type { Customer } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const empty = { name: '', phone: '', whatsapp: '', email: '', motorcycle: '', plate: '', address: '', observations: '' };

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

type HistoricoData = {
  orders: any[];
  appointments: any[];
  quotes: any[];
};

const STATUS_COLOR: Record<string, string> = {
  'Aberto': 'bg-zinc-700 text-zinc-300',
  'Em andamento': 'bg-blue-500/20 text-blue-400',
  'Finalizado': 'bg-green-500/20 text-green-400',
  'Agendado': 'bg-yellow-500/20 text-yellow-400',
  'Concluído': 'bg-green-500/20 text-green-400',
  'Cancelado': 'bg-red-500/20 text-red-400',
};

export default function Clientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Histórico
  const [historico, setHistorico] = useState<HistoricoData | null>(null);
  const [historicoCliente, setHistoricoCliente] = useState<Customer | null>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoTab, setHistoricoTab] = useState<'os' | 'agendamentos' | 'orcamentos'>('os');

  useEffect(() => { fetch('/api/clientes').then(r => r.json()).then(setCustomers); }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.plate || '').toLowerCase().includes(search.toLowerCase())
  );

  function openNew() { setEditing(null); setForm(empty); setError(''); setModal(true); }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, whatsapp: c.whatsapp, email: c.email || '', motorcycle: c.motorcycle || '', plate: c.plate || '', address: c.address || '', observations: c.observations || '' });
    setError('');
    setModal(true);
  }

  async function openHistorico(c: Customer) {
    setHistoricoCliente(c);
    setHistorico(null);
    setHistoricoTab('os');
    setLoadingHistorico(true);
    try {
      const res = await fetch(`/api/clientes/${c.id}/historico`);
      const data = await res.json();
      setHistorico(data);
    } catch {
      setHistorico({ orders: [], appointments: [], quotes: [] });
    } finally {
      setLoadingHistorico(false);
    }
  }

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

  const fmtDate = (d?: string | null) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

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
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-zinc-500">Nenhum cliente encontrado</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => openHistorico(c)}>
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
                  <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openHistorico(c)} className="text-zinc-400 hover:text-orange-400 p-1 rounded transition-colors" title="Histórico"><History size={14} /></button>
                    <button onClick={() => openEdit(c)} className="text-zinc-400 hover:text-white p-1 rounded transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => remove(c.id)} className="text-zinc-400 hover:text-red-400 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Histórico */}
      {historicoCliente && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <User size={16} className="text-orange-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{historicoCliente.name}</h2>
                  <p className="text-zinc-500 text-xs">{historicoCliente.phone} {historicoCliente.motorcycle ? `• ${historicoCliente.motorcycle}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setHistoricoCliente(null)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {[
                { key: 'os', label: 'Ordens de Serviço', icon: <ClipboardList size={14} />, count: historico?.orders.length },
                { key: 'agendamentos', label: 'Agendamentos', icon: <Calendar size={14} />, count: historico?.appointments.length },
                { key: 'orcamentos', label: 'Orçamentos', icon: <FileText size={14} />, count: historico?.quotes.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setHistoricoTab(tab.key as any)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${historicoTab === tab.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
                >
                  {tab.icon} {tab.label}
                  {tab.count !== undefined && <span className="bg-zinc-800 text-zinc-400 text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingHistorico && <p className="text-center text-zinc-500 py-10">Carregando...</p>}

              {/* OS */}
              {!loadingHistorico && historicoTab === 'os' && (
                <div className="space-y-3">
                  {historico?.orders.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Nenhuma OS encontrada</p>}
                  {historico?.orders.map((o: any) => (
                    <div key={o.id} className="bg-zinc-800 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] || 'bg-zinc-700 text-zinc-300'}`}>{o.status}</span>
                            <span className="text-zinc-500 text-xs">Entrega: {fmtDate(o.promised_date)}</span>
                          </div>
                          <p className="text-white text-sm font-medium">{o.motorcycle} {o.plate ? `• ${o.plate}` : ''}</p>
                          {o.items?.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {o.items.map((i: any) => <li key={i.id} className="text-zinc-400 text-xs">• {i.description} — R$ {Number(i.price).toFixed(2)}</li>)}
                            </ul>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold">R$ {Number(o.total_value).toFixed(2).replace('.', ',')}</p>
                          <p className="text-zinc-500 text-xs">{o.payment_method}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Agendamentos */}
              {!loadingHistorico && historicoTab === 'agendamentos' && (
                <div className="space-y-3">
                  {historico?.appointments.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Nenhum agendamento encontrado</p>}
                  {historico?.appointments.map((a: any) => (
                    <div key={a.id} className="bg-zinc-800 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{a.service}</p>
                        <p className="text-zinc-400 text-xs mt-0.5">{fmtDate(a.date)} às {a.time?.slice(0, 5)}</p>
                        {a.notes && <p className="text-zinc-500 text-xs mt-1">{a.notes}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] || 'bg-zinc-700 text-zinc-300'}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Orçamentos */}
              {!loadingHistorico && historicoTab === 'orcamentos' && (
                <div className="space-y-3">
                  {historico?.quotes.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Nenhum orçamento encontrado</p>}
                  {historico?.quotes.map((q: any) => (
                    <div key={q.id} className="bg-zinc-800 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{q.title || 'Orçamento'}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">{fmtDate(q.created_at)}</p>
                          {q.items?.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {q.items.map((i: any) => <li key={i.id} className="text-zinc-400 text-xs">• {i.description} — R$ {Number(i.price).toFixed(2)}</li>)}
                            </ul>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold">R$ {Number(q.total_value || 0).toFixed(2).replace('.', ',')}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[q.status] || 'bg-zinc-700 text-zinc-300'}`}>{q.status || '—'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal novo/editar */}
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
