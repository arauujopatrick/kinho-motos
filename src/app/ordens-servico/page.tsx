'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, X, MessageCircle, CheckCircle } from 'lucide-react';
import type { ServiceOrder, Customer, ServiceItem } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SERVICES = ['Troca de Óleo', 'Revisão Geral', 'Pastilha de Freio', 'Pneu', 'Relação', 'Vela', 'Filtro de Ar', 'Corrente', 'Amortecedor', 'Elétrica'];
const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão'];
const STATUS_OPTIONS = ['Aberto', 'Em andamento', 'Finalizado'];

const emptyForm = { customer_id: '', guest_name: '', guest_phone: '', motorcycle: '', plate: '', description: '', promised_date: '', payment_method: 'Dinheiro', card_installments: '', items: [] as ServiceItem[] };

export default function OrdensServico() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/ordens-servico').then(r => r.json()),
      fetch('/api/clientes').then(r => r.json()),
    ]).then(([o, c]) => { setOrders(o); setCustomers(c); });
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = (o.guest_name || o.customer_name || '').toLowerCase().includes(search.toLowerCase()) || (o.plate || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function addItem() {
    if (!itemDesc || !itemPrice) return;
    setForm(f => ({ ...f, items: [...f.items, { id: crypto.randomUUID(), description: itemDesc, price: parseFloat(itemPrice) }] }));
    setItemDesc(''); setItemPrice('');
  }

  function removeItem(id: string) { setForm(f => ({ ...f, items: f.items.filter(i => i.id !== id) })); }

  const subtotal = form.items.reduce((s, i) => s + i.price, 0);
  const cardFee = form.payment_method === 'Cartão' ? 3 : 0;
  const total = subtotal + cardFee;

  async function save() {
    if (!form.promised_date) { setError('Informe a data de entrega'); return; }
    if (form.items.length === 0) { setError('Adicione ao menos um serviço/peça'); return; }
    if (!form.customer_id && !form.guest_name) { setError('Selecione um cliente ou informe o nome'); return; }
    setSaving(true);
    setError('');
    try {
      const customer = customers.find(c => c.id === form.customer_id);
      const body = { ...form, total_value: total, customer_contact: customer ? (customer.whatsapp || customer.phone) : form.guest_phone, motorcycle: form.motorcycle || customer?.motorcycle || '', plate: form.plate || customer?.plate || '' };
      const res = await fetch('/api/ordens-servico', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setOrders(prev => [created, ...prev]);
      setModal(false);
      setForm(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/ordens-servico/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const updated = await res.json();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));

    if (status === 'Finalizado') {
      const order = orders.find(o => o.id === id);
      if (order) {
        await fetch('/api/financeiro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: `OS - ${order.motorcycle} ${order.plate || ''}`.trim(), type: 'INCOME', value: order.total_value, payment_method: order.payment_method, source_id: id, date: new Date().toISOString() }) });
      }
    }
  }

  function whatsapp(o: ServiceOrder) {
    const contact = o.customer_contact || o.guest_phone || '';
    const msg = encodeURIComponent(`Olá! Sua moto ${o.motorcycle} está pronta para retirada. Valor: R$ ${Number(o.total_value).toFixed(2).replace('.', ',')}`);
    window.open(`https://wa.me/55${contact.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }

  const statusColor: Record<string, string> = { 'Aberto': 'bg-zinc-700 text-zinc-300', 'Em andamento': 'bg-blue-500/20 text-blue-400', 'Finalizado': 'bg-green-500/20 text-green-400' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ordens de Serviço</h1>
          <p className="text-zinc-400 text-sm mt-1">{orders.filter(o => o.status !== 'Finalizado').length} OS abertas</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal(true); }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nova OS
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente ou placa..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500">
          <option>Todos</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 && <p className="text-center text-zinc-500 py-10">Nenhuma OS encontrada</p>}
        {filtered.map(o => (
          <div key={o.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[o.status]}`}>{o.status}</span>
                  <span className="text-zinc-500 text-xs">Entrega: {o.promised_date ? format(new Date(o.promised_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</span>
                </div>
                <p className="text-white font-semibold">{o.guest_name || o.customer_name || '—'}</p>
                <p className="text-zinc-400 text-sm">{o.motorcycle} {o.plate ? `• ${o.plate}` : ''}</p>
                {o.items && o.items.length > 0 && (
                  <ul className="mt-2 space-y-1">{o.items.map(i => <li key={i.id} className="text-zinc-400 text-xs">• {i.description} — R$ {Number(i.price).toFixed(2)}</li>)}</ul>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-white">R$ {Number(o.total_value).toFixed(2).replace('.', ',')}</p>
                <p className="text-zinc-500 text-xs">{o.payment_method}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
              <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500">
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              {o.status === 'Finalizado' && (
                <button onClick={() => whatsapp(o)} className="flex items-center gap-1.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition-colors">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              )}
              {o.status !== 'Finalizado' && (
                <button onClick={() => updateStatus(o.id, 'Finalizado')} className="flex items-center gap-1.5 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 px-3 py-1.5 rounded-lg transition-colors">
                  <CheckCircle size={14} /> Finalizar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <h2 className="font-semibold text-white">Nova Ordem de Serviço</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Cliente cadastrado</label>
                <select value={form.customer_id} onChange={e => {
                  const cid = e.target.value;
                  const c = customers.find(x => x.id === cid);
                  setForm(f => ({ ...f, customer_id: cid, motorcycle: c?.motorcycle || '', plate: c?.plate || '' }));
                }} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                  <option value="">— Selecionar (opcional) —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!form.customer_id && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nome do cliente" value={form.guest_name} onChange={v => setForm(f => ({ ...f, guest_name: v }))} />
                  <Field label="Telefone" value={form.guest_phone} onChange={v => setForm(f => ({ ...f, guest_phone: v }))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Moto" value={form.motorcycle} onChange={v => setForm(f => ({ ...f, motorcycle: v }))} />
                <Field label="Placa" value={form.plate} onChange={v => setForm(f => ({ ...f, plate: v.toUpperCase() }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Data de entrega *" value={form.promised_date} onChange={v => setForm(f => ({ ...f, promised_date: v }))} type="date" />
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Pagamento</label>
                  <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Serviços / Peças</label>
                <div className="flex gap-2 mb-2">
                  <select value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                    <option value="">Selecionar serviço...</option>
                    {SERVICES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="ou digitar" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                  <input value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="R$" type="number" className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                  <button onClick={addItem} className="bg-orange-500 hover:bg-orange-600 text-white px-3 rounded-lg text-sm transition-colors">+</button>
                </div>
                {form.items.length > 0 && (
                  <ul className="space-y-1.5">
                    {form.items.map(i => (
                      <li key={i.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2 text-sm">
                        <span className="text-zinc-200">{i.description}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">R$ {i.price.toFixed(2)}</span>
                          <button onClick={() => removeItem(i.id)} className="text-zinc-500 hover:text-red-400"><X size={14} /></button>
                        </div>
                      </li>
                    ))}
                    {cardFee > 0 && (
                      <li className="flex items-center justify-between text-sm pt-1">
                        <span className="text-zinc-400">Subtotal</span>
                        <span className="text-zinc-300">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                      </li>
                    )}
                    {cardFee > 0 && (
                      <li className="flex items-center justify-between text-sm">
                        <span className="text-yellow-400">Taxa Cartão</span>
                        <span className="text-yellow-400">+ R$ 3,00</span>
                      </li>
                    )}
                    <li className="flex justify-end pt-1 text-sm font-semibold text-white">Total: R$ {total.toFixed(2).replace('.', ',')}</li>
                  </ul>
                )}
              </div>
            </div>
            {error && <p className="mx-5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">{saving ? 'Salvando...' : 'Criar OS'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
    </div>
  );
}
