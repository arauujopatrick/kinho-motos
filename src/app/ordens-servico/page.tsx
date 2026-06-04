'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, X, MessageCircle, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import type { ServiceOrder, Customer, ServiceItem } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhone, normalizePlate } from '@/lib/customer-utils';

const SERVICES = ['Troca de Óleo', 'Revisão Geral', 'Pastilha de Freio', 'Pneu', 'Relação', 'Vela', 'Filtro de Ar', 'Corrente', 'Amortecedor', 'Elétrica'];
const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão'];
const STATUS_OPTIONS = ['Aberto', 'Em andamento', 'Finalizado'];

const emptyForm = { customer_id: '', guest_name: '', guest_phone: '', motorcycle: '', plate: '', description: '', promised_date: '', payment_method: 'Dinheiro', card_installments: '', items: [] as ServiceItem[] };

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

const isValidPhoneDigits = (value: string) =>
  value.length === 10 || value.length === 11;

const safeFormatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return format(date, 'dd/MM/yyyy', { locale: ptBR });
};

const formatCurrency = (value: unknown) => {
  const number = Number(value);
  const safeNumber = Number.isFinite(number) ? number : 0;
  return `R$ ${safeNumber.toFixed(2).replace('.', ',')}`;
};

async function getResponseMessage(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const data = (await response.json()) as ApiErrorResponse;
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }
      if (typeof data.error === 'string' && data.error.trim()) {
        return data.error;
      }
    } catch {
      // Ignore parse errors and fall back to plain text.
    }
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text;
    }
  } catch {
    // Ignore parse errors and use fallback.
  }

  return fallbackMessage;
}

async function fetchOrdersFromApi() {
  const response = await fetch('/api/ordens-servico', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, 'Não foi possível carregar as ordens de serviço agora.'));
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('A API de ordens de serviço retornou um formato inválido.');
  }

  return data as ServiceOrder[];
}

async function fetchCustomersFromApi() {
  const response = await fetch('/api/clientes', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, 'Não foi possível carregar os clientes agora.'));
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('A API de clientes retornou um formato inválido.');
  }

  return data as Customer[];
}

export default function OrdensServico() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([fetchOrdersFromApi(), fetchCustomersFromApi()])
      .then(([loadedOrders, loadedCustomers]) => {
        if (!isMounted) {
          return;
        }

        setOrders(loadedOrders);
        setCustomers(loadedCustomers);
        setPageError('');
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setPageError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados de ordens de serviço agora.');
      })
      .finally(() => {
        if (isMounted) {
          setLoadingData(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = orders.filter((order) => {
    const name = order.guest_name || order.customer_name || '';
    const plate = order.plate || '';
    const status = order.status || 'Aberto';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || plate.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || status === filterStatus;
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

  async function refreshOrders(showLoader = false) {
    if (showLoader) {
      setLoadingData(true);
    }

    try {
      const latestOrders = await fetchOrdersFromApi();
      setOrders(latestOrders);
      setPageError('');
      return latestOrders;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Não foi possível carregar as ordens de serviço agora.';
      setPageError(message);
      throw loadError;
    } finally {
      if (showLoader) {
        setLoadingData(false);
      }
    }
  }

  async function save() {
    const customer = customers.find((item) => item.id === form.customer_id);
    const guestPhoneDigits = normalizeDigits(form.guest_phone);
    const motorcycle = (form.motorcycle || customer?.motorcycle || '').trim();
    const plate = normalizePlate(form.plate || customer?.plate || '') || '';

    if (!form.customer_id && !form.guest_name.trim()) {
      setError('Selecione um cliente ou informe o nome do cliente avulso.');
      return;
    }

    if (!form.customer_id && !isValidPhoneDigits(guestPhoneDigits)) {
      setError('Informe um telefone válido para o cliente avulso.');
      return;
    }

    if (!motorcycle) {
      setError('Informe a moto desta ordem de serviço.');
      return;
    }

    if (!form.promised_date) {
      setError('Informe a data de entrega da OS.');
      return;
    }

    if (form.items.length === 0) {
      setError('Adicione pelo menos um item à OS.');
      return;
    }

    setSaving(true);
    setError('');

    const body = {
      ...form,
      guest_name: form.guest_name.trim(),
      guest_phone: guestPhoneDigits ? formatPhone(guestPhoneDigits) : '',
      motorcycle,
      plate,
      total_value: total,
      customer_contact: customer ? (customer.whatsapp || customer.phone) : formatPhone(guestPhoneDigits),
    };
    const url = editingId ? `/api/ordens-servico/${editingId}` : '/api/ordens-servico';
    const method = editingId ? 'PUT' : 'POST';
    const fallbackMessage = editingId
      ? 'Não foi possível atualizar a ordem de serviço agora.'
      : 'Não foi possível cadastrar a ordem de serviço agora.';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await getResponseMessage(response, fallbackMessage));
      }

      const saved = (await response.json()) as ServiceOrder;
      setOrders((currentOrders) =>
        editingId
          ? currentOrders.map((order) => order.id === editingId ? { ...order, ...saved } : order)
          : [saved, ...currentOrders]
      );
      setModal(false);
      setEditingId(null);
      setForm(emptyForm);
      setItemDesc('');
      setItemPrice('');

      void refreshOrders().catch(() => {
        setPageError('OS salva, mas não foi possível atualizar a listagem agora.');
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : fallbackMessage);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(order: ServiceOrder) {
    setEditingId(order.id);
    setForm({
      customer_id: order.customer_id || '',
      guest_name: order.guest_name || '',
      guest_phone: order.guest_phone || '',
      motorcycle: order.motorcycle || '',
      plate: order.plate || '',
      description: order.description || '',
      promised_date: order.promised_date ? String(order.promised_date).slice(0, 10) : '',
      payment_method: order.payment_method || 'Dinheiro',
      card_installments: order.card_installments ? String(order.card_installments) : '',
      items: Array.isArray(order.items) ? order.items : [],
    });
    setItemDesc('');
    setItemPrice('');
    setError('');
    setModal(true);
  }

  async function removeOrder(id: string) {
    if (!confirm('Excluir esta OS?')) {
      return;
    }

    setPageError('');

    try {
      const response = await fetch(`/api/ordens-servico/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await getResponseMessage(response, 'Não foi possível excluir esta OS.'));
      }

      setOrders((currentOrders) => currentOrders.filter((order) => order.id !== id));
    } catch (removeError) {
      setPageError(removeError instanceof Error ? removeError.message : 'Não foi possível excluir esta OS.');
    }
  }

  async function updateStatus(id: string, status: string) {
    setPageError('');

    try {
      const response = await fetch(`/api/ordens-servico/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await getResponseMessage(response, 'Não foi possível atualizar o status desta OS.'));
      }

      const updated = (await response.json()) as ServiceOrder;
      setOrders((currentOrders) => currentOrders.map((order) => order.id === id ? { ...order, ...updated } : order));

      if (status === 'Finalizado') {
        const order = orders.find((item) => item.id === id);
        if (order) {
          await fetch('/api/financeiro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: `OS - ${order.motorcycle} ${order.plate || ''}`.trim(), type: 'INCOME', value: order.total_value, payment_method: order.payment_method, source_id: id, date: new Date().toISOString() }),
          });
        }
      }
    } catch (statusError) {
      setPageError(statusError instanceof Error ? statusError.message : 'Não foi possível atualizar o status desta OS.');
    }
  }

  function whatsapp(o: ServiceOrder) {
    const contact = o.customer_contact || o.guest_phone || '';
    const msg = encodeURIComponent(`Olá! Sua moto ${o.motorcycle || ''} está pronta para retirada. Valor: ${formatCurrency(o.total_value)}`);
    window.open(`https://wa.me/55${contact.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }

  const statusColor: Record<string, string> = { 'Aberto': 'bg-zinc-700 text-zinc-300', 'Em andamento': 'bg-blue-500/20 text-blue-400', 'Finalizado': 'bg-green-500/20 text-green-400' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ordens de Serviço</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {loadingData ? 'Carregando ordens de serviço...' : `${orders.filter((order) => (order.status || 'Aberto') !== 'Finalizado').length} OS abertas`}
          </p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(emptyForm); setItemDesc(''); setItemPrice(''); setError(''); setModal(true); }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nova OS
        </button>
      </div>

      {pageError && (
        <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">
          <span>{pageError}</span>
          <button onClick={() => void refreshOrders(true)} className="text-xs font-medium text-red-200 hover:text-white transition-colors">
            Tentar novamente
          </button>
        </div>
      )}

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
        {loadingData && orders.length === 0 && <p className="text-center text-zinc-500 py-10">Carregando ordens de serviço...</p>}
        {!loadingData && filtered.length === 0 && <p className="text-center text-zinc-500 py-10">Nenhuma OS encontrada</p>}
        {filtered.map((order) => {
          const status = order.status || 'Aberto';
          const items = Array.isArray(order.items) ? order.items : [];

          return (
          <div key={order.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[status] || 'bg-zinc-700 text-zinc-300'}`}>{status}</span>
                  <span className="text-zinc-500 text-xs">Entrega: {safeFormatDate(order.promised_date)}</span>
                </div>
                <p className="text-white font-semibold">{order.guest_name || order.customer_name || '—'}</p>
                <p className="text-zinc-400 text-sm">{order.motorcycle || '—'} {order.plate ? `• ${order.plate}` : ''}</p>
                {items.length > 0 && (
                  <ul className="mt-2 space-y-1">{items.map((item) => <li key={item.id} className="text-zinc-400 text-xs">• {item.description} — {formatCurrency(item.price)}</li>)}</ul>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-white">{formatCurrency(order.total_value)}</p>
                <p className="text-zinc-500 text-xs">{order.payment_method || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
              <select value={status} onChange={e => updateStatus(order.id, e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500">
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              {status === 'Finalizado' && (
                <button onClick={() => whatsapp(order)} className="flex items-center gap-1.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition-colors">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              )}
              {status !== 'Finalizado' && (
                <button onClick={() => updateStatus(order.id, 'Finalizado')} className="flex items-center gap-1.5 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 px-3 py-1.5 rounded-lg transition-colors">
                  <CheckCircle size={14} /> Finalizar
                </button>
              )}
              <button onClick={() => openEdit(order)} className="flex items-center gap-1.5 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white px-3 py-1.5 rounded-lg transition-colors ml-auto">
                <Pencil size={14} /> Editar
              </button>
              <button onClick={() => removeOrder(order.id)} className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <h2 className="font-semibold text-white">{editingId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h2>
              <button onClick={() => { setModal(false); setEditingId(null); setError(''); }} className="text-zinc-400 hover:text-white"><X size={18} /></button>
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
              <button onClick={() => { setModal(false); setEditingId(null); setError(''); }} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">
                {saving ? 'Salvando...' : (editingId ? 'Salvar' : 'Criar OS')}
              </button>
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
