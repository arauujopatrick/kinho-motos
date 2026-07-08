'use client';

import { useEffect, useState } from 'react';
import { Plus, X, FileText, Check, XCircle } from 'lucide-react';
import type { Quote, Customer, ServiceItem, Service } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColor: Record<string, string> = { 'Pendente': 'bg-yellow-500/20 text-yellow-400', 'Aprovado': 'bg-green-500/20 text-green-400', 'Recusado': 'bg-red-500/20 text-red-400' };

export default function Orcamentos() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customer_id: '', guest_name: '', guest_phone: '', motorcycle: '', plate: '', valid_until: '', items: [] as ServiceItem[] });
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/orcamentos').then(r => r.json()),
      fetch('/api/clientes').then(r => r.json()),
      fetch('/api/servicos').then(r => r.json()),
    ]).then(([q, c, s]) => { setQuotes(q); setCustomers(c); setServices(s); });
  }, []);

  const total = form.items.reduce((s, i) => s + i.price, 0);

  function addItem() {
    if (!itemDesc || !itemPrice) return;
    setForm(f => ({ ...f, items: [...f.items, { id: crypto.randomUUID(), description: itemDesc, price: parseFloat(itemPrice) }] }));
    setItemDesc(''); setItemPrice('');
  }

  async function save() {
    if (!form.valid_until) { setError('Informe a validade'); return; }
    if (form.items.length === 0) { setError('Adicione ao menos um item'); return; }
    if (!form.customer_id && !form.guest_name) { setError('Selecione um cliente ou informe o nome'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/orcamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, total_value: total }) });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setQuotes(prev => [{ ...created, items: form.items }, ...prev]);
      setModal(false);
      setForm({ customer_id: '', guest_name: '', guest_phone: '', motorcycle: '', plate: '', valid_until: '', items: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/orcamentos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: status as Quote['status'] } : q));
  }

  async function approveAndConvert(quote: Quote) {
    setPageError('');
    setConvertingId(quote.id);
    try {
      const customer = customers.find(c => c.id === quote.customer_id);
      const body = {
        customer_id: quote.customer_id || '',
        guest_name: quote.guest_name || '',
        guest_phone: quote.guest_phone || '',
        customer_contact: customer ? (customer.whatsapp || customer.phone) : (quote.guest_phone || ''),
        motorcycle: quote.motorcycle || customer?.motorcycle || '',
        plate: quote.plate || customer?.plate || '',
        description: quote.description || '',
        items: quote.items || [],
        total_value: quote.total_value,
        discount: 0,
        promised_date: quote.valid_until ? String(quote.valid_until).slice(0, 10) : new Date().toISOString().slice(0, 10),
        payment_method: 'Dinheiro',
      };

      const res = await fetch('/api/ordens-servico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const createdOrder = await res.json();

      const statusRes = await fetch(`/api/orcamentos/${quote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Aprovado' }),
      });

      if (!statusRes.ok) {
        throw new Error(await statusRes.text());
      }

      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'Aprovado' } : q));

      window.open(`/ordens-servico/${createdOrder.id}/imprimir`, '_blank');
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Não foi possível converter o orçamento em OS. Confira se a moto e o telefone do cliente estão preenchidos.');
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orçamentos</h1>
          <p className="text-zinc-400 text-sm mt-1">{quotes.filter(q => q.status === 'Pendente').length} pendentes</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      {pageError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">
          {pageError}
        </div>
      )}

      <div className="grid gap-4">
        {quotes.filter(q => q.status !== 'Aprovado').length === 0 && <p className="text-center text-zinc-500 py-10">Nenhum orçamento</p>}
        {quotes.filter(q => q.status !== 'Aprovado').map(q => (
          <div key={q.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[q.status]}`}>{q.status}</span>
                  <span className="text-zinc-500 text-xs flex items-center gap-1"><FileText size={12} /> Válido até {q.valid_until ? format(new Date(q.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</span>
                </div>
                <p className="text-white font-semibold">{q.guest_name || q.customer_name || '—'}</p>
                <p className="text-zinc-400 text-sm">{q.motorcycle || '—'} {q.plate ? `• ${q.plate}` : ''}</p>
                {q.items && q.items.length > 0 && (
                  <ul className="mt-2 space-y-1">{q.items.map(i => <li key={i.id} className="text-zinc-400 text-xs">• {i.description} — R$ {Number(i.price).toFixed(2)}</li>)}</ul>
                )}
              </div>
              <p className="text-xl font-bold text-white">R$ {Number(q.total_value).toFixed(2).replace('.', ',')}</p>
            </div>
            {q.status === 'Pendente' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
                <button onClick={() => approveAndConvert(q)} disabled={convertingId === q.id} className="flex items-center gap-1.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Check size={14} /> {convertingId === q.id ? 'Gerando OS...' : 'Aprovar e gerar OS'}
                </button>
                <button onClick={() => updateStatus(q.id, 'Recusado')} className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors">
                  <XCircle size={14} /> Recusar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <h2 className="font-semibold text-white">Novo Orçamento</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Cliente cadastrado</label>
                <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                  <option value="">— Selecionar (opcional) —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!form.customer_id && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-zinc-400 mb-1">Nome</label><input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Telefone</label><input value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-zinc-400 mb-1">Moto</label><input value={form.motorcycle} onChange={e => setForm(f => ({ ...f, motorcycle: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Validade *</label><input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Itens</label>
                <div className="flex gap-2 mb-2">
                  <select value={itemDesc} onChange={e => {
                    const chosen = services.find(s => s.name === e.target.value);
                    setItemDesc(e.target.value);
                    if (chosen && chosen.price) setItemPrice(String(chosen.price));
                  }} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                    <option value="">Selecionar...</option>
                    {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <input value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="R$" type="number" className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                  <button onClick={addItem} className="bg-orange-500 hover:bg-orange-600 text-white px-3 rounded-lg text-sm transition-colors">+</button>
                </div>
                {form.items.map(i => (
                  <div key={i.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2 text-sm mb-1.5">
                    <span className="text-zinc-200">{i.description}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white">R$ {i.price.toFixed(2)}</span>
                      <button onClick={() => setForm(f => ({ ...f, items: f.items.filter(x => x.id !== i.id) }))} className="text-zinc-500 hover:text-red-400"><X size={14} /></button>
                    </div>
                  </div>
                ))}
                {form.items.length > 0 && <p className="text-right text-sm font-semibold text-white mt-2">Total: R$ {total.toFixed(2)}</p>}
              </div>
            </div>
            {error && <p className="mx-5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
