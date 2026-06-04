'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, User, History, ClipboardList, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Customer } from '@/types';
import { formatPhone, normalizePlate } from '@/lib/customer-utils';

type CustomerForm = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  motorcycle: string;
  plate: string;
  address: string;
  observations: string;
};

type HistoricoTab = 'os' | 'agendamentos' | 'orcamentos';

type HistoryItem = {
  id: string;
  description: string;
  price: number | string;
};

type HistoryOrder = {
  id: string;
  status: string;
  promised_date?: string | null;
  motorcycle?: string | null;
  plate?: string | null;
  total_value: number | string;
  payment_method?: string | null;
  items?: HistoryItem[];
};

type HistoryAppointment = {
  id: string;
  service: string;
  date?: string | null;
  time?: string | null;
  notes?: string | null;
  status: string;
};

type HistoryQuote = {
  id: string;
  title?: string | null;
  created_at?: string | null;
  total_value?: number | string | null;
  status?: string | null;
  items?: HistoryItem[];
};

type HistoricoData = {
  orders: HistoryOrder[];
  appointments: HistoryAppointment[];
  quotes: HistoryQuote[];
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

const empty: CustomerForm = {
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
  motorcycle: '',
  plate: '',
  address: '',
  observations: '',
};

const STATUS_COLOR: Record<string, string> = {
  Aberto: 'bg-zinc-700 text-zinc-300',
  'Em andamento': 'bg-blue-500/20 text-blue-400',
  Finalizado: 'bg-green-500/20 text-green-400',
  Agendado: 'bg-yellow-500/20 text-yellow-400',
  Concluído: 'bg-green-500/20 text-green-400',
  Cancelado: 'bg-red-500/20 text-red-400',
};

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

const isValidPhoneDigits = (digits: string) =>
  digits.length === 10 || digits.length === 11;

const formatCurrency = (value: number | string | null | undefined) =>
  `R$ ${Number(value ?? 0).toFixed(2).replace('.', ',')}`;

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
      // Ignore JSON parse errors and fall back to text.
    }
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text;
    }
  } catch {
    // Ignore text parse errors and use fallback.
  }

  return fallbackMessage;
}

async function fetchCustomersFromApi() {
  const response = await fetch('/api/clientes', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, 'Não foi possível carregar os clientes agora.'));
  }

  return (await response.json()) as Customer[];
}

async function fetchHistoricoFromApi(customerId: string) {
  const response = await fetch(`/api/clientes/${customerId}/historico`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await getResponseMessage(response, 'Não foi possível carregar o histórico deste cliente agora.'));
  }

  return (await response.json()) as HistoricoData;
}

export default function Clientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [historico, setHistorico] = useState<HistoricoData | null>(null);
  const [historicoCliente, setHistoricoCliente] = useState<Customer | null>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoTab, setHistoricoTab] = useState<HistoricoTab>('os');

  useEffect(() => {
    let isMounted = true;

    void fetchCustomersFromApi()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setCustomers(data);
        setPageError('');
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }
        setPageError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os clientes agora.');
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCustomers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = customers.filter((customer) => {
    const searchValue = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchValue) ||
      customer.phone.includes(search) ||
      (customer.plate || '').toLowerCase().includes(searchValue)
    );
  });

  const fmtDate = (value?: string | null) =>
    value ? format(new Date(value), 'dd/MM/yyyy', { locale: ptBR }) : '—';

  async function refreshCustomers(showLoader = false) {
    if (showLoader) {
      setLoadingCustomers(true);
    }

    try {
      const latestCustomers = await fetchCustomersFromApi();
      setCustomers(latestCustomers);
      setPageError('');
      return latestCustomers;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Não foi possível carregar os clientes agora.';
      setPageError(message);
      throw loadError;
    } finally {
      if (showLoader) {
        setLoadingCustomers(false);
      }
    }
  }

  function closeModal() {
    setModal(false);
    setEditing(null);
    setForm(empty);
    setError('');
  }

  function openNew() {
    setEditing(null);
    setForm(empty);
    setError('');
    setModal(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp || '',
      email: customer.email || '',
      motorcycle: customer.motorcycle || '',
      plate: customer.plate || '',
      address: customer.address || '',
      observations: customer.observations || '',
    });
    setError('');
    setModal(true);
  }

  async function openHistorico(customer: Customer) {
    setHistoricoCliente(customer);
    setHistorico(null);
    setHistoricoTab('os');
    setLoadingHistorico(true);

    try {
      const data = await fetchHistoricoFromApi(customer.id);
      setHistorico(data);
    } catch {
      setHistorico({ orders: [], appointments: [], quotes: [] });
    } finally {
      setLoadingHistorico(false);
    }
  }

  async function save() {
    const name = form.name.trim();
    const phoneDigits = normalizeDigits(form.phone);
    const whatsappDigits = normalizeDigits(form.whatsapp);
    const plate = normalizePlate(form.plate);

    if (!name) {
      setError('Informe o nome do cliente.');
      return;
    }

    if (!isValidPhoneDigits(phoneDigits)) {
      setError('Informe um telefone com DDD válido.');
      return;
    }

    if (whatsappDigits && !isValidPhoneDigits(whatsappDigits)) {
      setError('Informe um WhatsApp válido ou deixe o campo em branco.');
      return;
    }

    if (plate && plate.length !== 7) {
      setError('A placa deve ter exatamente 7 caracteres.');
      return;
    }

    const payload: CustomerForm = {
      name,
      phone: formatPhone(phoneDigits),
      whatsapp: whatsappDigits ? formatPhone(whatsappDigits) : '',
      email: form.email.trim(),
      motorcycle: form.motorcycle.trim(),
      plate: plate || '',
      address: form.address.trim(),
      observations: form.observations.trim(),
    };

    setSaving(true);
    setError('');

    try {
      const endpoint = editing ? `/api/clientes/${editing.id}` : '/api/clientes';
      const method = editing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getResponseMessage(response, 'Não foi possível salvar o cliente agora.'));
      }

      const savedCustomer = (await response.json()) as Customer;
      setCustomers((currentCustomers) =>
        editing
          ? currentCustomers.map((customer) => customer.id === editing.id ? savedCustomer : customer)
          : [savedCustomer, ...currentCustomers]
      );

      const refreshFallback = editing
        ? 'Cliente atualizado, mas não foi possível recarregar a lista agora.'
        : 'Cliente salvo, mas não foi possível recarregar a lista agora.';

      closeModal();

      void refreshCustomers().catch(() => {
        setPageError(refreshFallback);
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o cliente agora.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remover cliente?')) {
      return;
    }

    setPageError('');

    try {
      const response = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await getResponseMessage(response, 'Não foi possível remover o cliente agora.'));
      }

      setCustomers((currentCustomers) => currentCustomers.filter((customer) => customer.id !== id));

      if (historicoCliente?.id === id) {
        setHistoricoCliente(null);
      }

      void refreshCustomers().catch(() => {
        setPageError('Cliente removido, mas não foi possível recarregar a lista agora.');
      });
    } catch (removeError) {
      setPageError(removeError instanceof Error ? removeError.message : 'Não foi possível remover o cliente agora.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {loadingCustomers ? 'Carregando clientes...' : `${customers.length} clientes cadastrados`}
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {pageError && (
        <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">
          <span>{pageError}</span>
          <button onClick={() => void refreshCustomers(true)} className="text-xs font-medium text-red-200 hover:text-white transition-colors">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone ou placa..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500" />
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
            {loadingCustomers && customers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-zinc-500">Carregando clientes...</td>
              </tr>
            )}
            {!loadingCustomers && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-zinc-500">Nenhum cliente encontrado</td>
              </tr>
            )}
            {filtered.map((customer) => (
              <tr key={customer.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => openHistorico(customer)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-orange-400" />
                    </div>
                    <span className="text-white font-medium">{customer.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{customer.phone}</td>
                <td className="px-4 py-3 text-zinc-300">{customer.motorcycle || '—'}{customer.plate ? ` • ${customer.plate}` : ''}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end" onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => openHistorico(customer)} className="text-zinc-400 hover:text-orange-400 p-1 rounded transition-colors" title="Histórico"><History size={14} /></button>
                    <button onClick={() => openEdit(customer)} className="text-zinc-400 hover:text-white p-1 rounded transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => remove(customer.id)} className="text-zinc-400 hover:text-red-400 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

            <div className="flex border-b border-zinc-800">
              {[
                { key: 'os' as const, label: 'Ordens de Serviço', icon: <ClipboardList size={14} />, count: historico?.orders.length },
                { key: 'agendamentos' as const, label: 'Agendamentos', icon: <Calendar size={14} />, count: historico?.appointments.length },
                { key: 'orcamentos' as const, label: 'Orçamentos', icon: <FileText size={14} />, count: historico?.quotes.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setHistoricoTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${historicoTab === tab.key ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
                >
                  {tab.icon} {tab.label}
                  {tab.count !== undefined && <span className="bg-zinc-800 text-zinc-400 text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingHistorico && <p className="text-center text-zinc-500 py-10">Carregando...</p>}

              {!loadingHistorico && historicoTab === 'os' && (
                <div className="space-y-3">
                  {historico?.orders.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Nenhuma OS encontrada</p>}
                  {historico?.orders.map((order) => (
                    <div key={order.id} className="bg-zinc-800 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] || 'bg-zinc-700 text-zinc-300'}`}>{order.status}</span>
                            <span className="text-zinc-500 text-xs">Entrega: {fmtDate(order.promised_date)}</span>
                          </div>
                          <p className="text-white text-sm font-medium">{order.motorcycle} {order.plate ? `• ${order.plate}` : ''}</p>
                          {order.items && order.items.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {order.items.map((item) => <li key={item.id} className="text-zinc-400 text-xs">• {item.description} — {formatCurrency(item.price)}</li>)}
                            </ul>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold">{formatCurrency(order.total_value)}</p>
                          <p className="text-zinc-500 text-xs">{order.payment_method}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingHistorico && historicoTab === 'agendamentos' && (
                <div className="space-y-3">
                  {historico?.appointments.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Nenhum agendamento encontrado</p>}
                  {historico?.appointments.map((appointment) => (
                    <div key={appointment.id} className="bg-zinc-800 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{appointment.service}</p>
                        <p className="text-zinc-400 text-xs mt-0.5">{fmtDate(appointment.date)} às {appointment.time?.slice(0, 5)}</p>
                        {appointment.notes && <p className="text-zinc-500 text-xs mt-1">{appointment.notes}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[appointment.status] || 'bg-zinc-700 text-zinc-300'}`}>{appointment.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {!loadingHistorico && historicoTab === 'orcamentos' && (
                <div className="space-y-3">
                  {historico?.quotes.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Nenhum orçamento encontrado</p>}
                  {historico?.quotes.map((quote) => (
                    <div key={quote.id} className="bg-zinc-800 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{quote.title || 'Orçamento'}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">{fmtDate(quote.created_at)}</p>
                          {quote.items && quote.items.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {quote.items.map((item) => <li key={item.id} className="text-zinc-400 text-xs">• {item.description} — {formatCurrency(item.price)}</li>)}
                            </ul>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold">{formatCurrency(quote.total_value)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[quote.status || ''] || 'bg-zinc-700 text-zinc-300'}`}>{quote.status || '—'}</span>
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

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="Nome *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} span />
              <Field label="Telefone *" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: formatPhone(value) }))} placeholder="(00) 00000-0000" />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(value) => setForm((current) => ({ ...current, whatsapp: formatPhone(value) }))} placeholder="(00) 00000-0000" />
              <Field label="E-mail" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              <Field label="Moto" value={form.motorcycle} onChange={(value) => setForm((current) => ({ ...current, motorcycle: value }))} />
              <Field label="Placa" value={form.plate} onChange={(value) => setForm((current) => ({ ...current, plate: value.toUpperCase() }))} />
              <Field label="Endereço" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} span />
              <Field label="Observações" value={form.observations} onChange={(value) => setForm((current) => ({ ...current, observations: value }))} span />
              {error && <p className="col-span-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
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

function Field({ label, value, onChange, span, placeholder }: { label: string; value: string; onChange: (value: string) => void; span?: boolean; placeholder?: string }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500" />
    </div>
  );
}
