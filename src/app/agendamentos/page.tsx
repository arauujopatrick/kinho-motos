'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Calendar, ClipboardList } from 'lucide-react';
import type { Appointment, Customer } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SERVICES = ['Troca de Óleo', 'Revisão Geral', 'Pastilha de Freio', 'Pneu', 'Relação', 'Vela', 'Filtro de Ar', 'Corrente', 'Amortecedor', 'Elétrica'];
const STATUS_COLOR: Record<string, string> = { 'Agendado': 'bg-blue-500/20 text-blue-400', 'Confirmado': 'bg-green-500/20 text-green-400', 'Cancelado': 'bg-red-500/20 text-red-400', 'Concluido': 'bg-zinc-700 text-zinc-400' };

export default function Agendamentos() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customer_id: '', guest_name: '', guest_phone: '', motorcycle: '', plate: '', service: '', date: '', time: '' });

  useEffect(() => {
    Promise.all([
      fetch('/api/agendamentos').then(r => r.json()),
      fetch('/api/clientes').then(r => r.json()),
    ]).then(([a, c]) => { setAppointments(a); setCustomers(c); });
  }, []);

  async function save() {
    if (!form.service || !form.date || !form.time) return;
    const res = await fetch('/api/agendamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const created = await res.json();
    setAppointments(prev => [created, ...prev]);
    setModal(false);
    setForm({ customer_id: '', guest_name: '', guest_phone: '', motorcycle: '', plate: '', service: '', date: '', time: '' });
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/agendamentos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: status as Appointment['status'] } : a));
  }

  async function convertToOS(app: Appointment) {
    await updateStatus(app.id, 'Concluido');
    await fetch('/api/ordens-servico', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: app.customer_id, guest_name: app.guest_name, guest_phone: app.guest_phone, customer_contact: app.guest_phone || '', motorcycle: app.motorcycle, plate: app.plate, items: [{ id: crypto.randomUUID(), description: app.service, price: 0 }], total_value: 0, promised_date: app.date, payment_method: 'Dinheiro' })
    });
    alert('Agendamento convertido em OS!');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agendamentos</h1>
          <p className="text-zinc-400 text-sm mt-1">{appointments.filter(a => a.status === 'Agendado').length} agendamentos ativos</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Agendamento
        </button>
      </div>

      <div className="grid gap-3">
        {appointments.length === 0 && <p className="text-center text-zinc-500 py-10">Nenhum agendamento</p>}
        {appointments.map(a => (
          <div key={a.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center gap-4">
            <div className="bg-zinc-800 rounded-lg p-3 text-center min-w-14">
              <p className="text-orange-400 text-xs font-medium">{a.date ? format(new Date(a.date), 'MMM', { locale: ptBR }).toUpperCase() : '—'}</p>
              <p className="text-white text-xl font-bold leading-none">{a.date ? format(new Date(a.date), 'dd') : '—'}</p>
              <p className="text-zinc-400 text-xs">{a.time}</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status]}`}>{a.status}</span>
              </div>
              <p className="text-white font-medium">{a.guest_name || a.customer_name || '—'}</p>
              <p className="text-zinc-400 text-sm">{a.service} • {a.motorcycle} {a.plate ? `• ${a.plate}` : ''}</p>
            </div>
            <div className="flex gap-2">
              {a.status === 'Agendado' && (
                <>
                  <button onClick={() => updateStatus(a.id, 'Confirmado')} className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition-colors">Confirmar</button>
                  <button onClick={() => convertToOS(a)} className="flex items-center gap-1.5 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 px-3 py-1.5 rounded-lg transition-colors"><ClipboardList size={12} /> OS</button>
                  <button onClick={() => updateStatus(a.id, 'Cancelado')} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors">Cancelar</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><Calendar size={16} /> Novo Agendamento</h2>
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
                <div><label className="block text-xs text-zinc-400 mb-1">Placa</label><input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Serviço *</label>
                <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                  <option value="">Selecionar serviço...</option>
                  {SERVICES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-zinc-400 mb-1">Data *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Hora *</label><input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">Agendar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
