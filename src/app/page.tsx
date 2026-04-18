'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Users, DollarSign, Calendar, CheckSquare, Plus, Trash2, Check } from 'lucide-react';
import type { ServiceOrder, Transaction, Appointment, DailyTask } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/ordens-servico').then(r => r.json()),
      fetch('/api/financeiro').then(r => r.json()),
      fetch('/api/agendamentos').then(r => r.json()),
      fetch('/api/tarefas').then(r => r.json()),
    ]).then(([o, t, a, tk]) => {
      setOrders(o);
      setTransactions(t);
      setAppointments(a);
      setTasks(tk);
      setLoading(false);
    });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayDeliveries = orders.filter(o => o.promised_date?.split('T')[0] === today && o.status !== 'Finalizado');
  const openOrders = orders.filter(o => o.status !== 'Finalizado');
  const monthIncome = transactions
    .filter(t => t.type === 'INCOME' && t.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, t) => sum + Number(t.value), 0);
  const todayAppointments = appointments.filter(a => a.date === today && a.status !== 'Cancelado');

  async function addTask() {
    if (!newTask.trim()) return;
    const res = await fetch('/api/tarefas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newTask }) });
    const task = await res.json();
    setTasks(prev => [task, ...prev]);
    setNewTask('');
  }

  async function toggleTask(task: DailyTask) {
    await fetch(`/api/tarefas/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: !task.completed }) });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>

      {/* Cards métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<ClipboardList size={20} />} label="OS Abertas" value={openOrders.length} color="orange" />
        <MetricCard icon={<Calendar size={20} />} label="Entregas Hoje" value={todayDeliveries.length} color="blue" />
        <MetricCard icon={<DollarSign size={20} />} label="Receita do Mês" value={`R$ ${monthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="green" />
        <MetricCard icon={<Users size={20} />} label="Agendamentos Hoje" value={todayAppointments.length} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entregas do dia */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="font-semibold text-white mb-4">Entregas Previstas Hoje</h2>
          {todayDeliveries.length === 0 ? (
            <p className="text-zinc-500 text-sm">Nenhuma entrega prevista para hoje.</p>
          ) : (
            <ul className="space-y-3">
              {todayDeliveries.map(o => (
                <li key={o.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white font-medium">{o.guest_name || o.customer_name || '—'}</p>
                    <p className="text-zinc-400">{o.motorcycle} {o.plate ? `• ${o.plate}` : ''}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${o.status === 'Em andamento' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-300'}`}>
                    {o.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tarefas do dia */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><CheckSquare size={16} /> Tarefas do Dia</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Nova tarefa..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
            <button onClick={addTask} className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {tasks.map(t => (
              <li key={t.id} className="flex items-center gap-3 group">
                <button onClick={() => toggleTask(t)} className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${t.completed ? 'bg-green-500 border-green-500' : 'border-zinc-600 hover:border-orange-500'}`}>
                  {t.completed && <Check size={12} className="text-white" />}
                </button>
                <span className={`flex-1 text-sm ${t.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{t.text}</span>
                <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-500/10 text-orange-400',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };
  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
