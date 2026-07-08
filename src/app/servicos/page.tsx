'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Wrench } from 'lucide-react';
import type { Service } from '@/types';

export default function Servicos() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [editingService, setEditingService] = useState<{ id: string; name: string; price: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/servicos')
      .then(r => r.json())
      .then(setServices)
      .finally(() => setLoading(false));
  }, []);

  async function addService() {
    const name = newServiceName.trim();
    if (!name) return;
    setError('');
    try {
      const res = await fetch('/api/servicos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price: parseFloat(newServicePrice) || 0 }) });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setServices(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewServiceName('');
      setNewServicePrice('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar serviço');
    }
  }

  async function deleteService(id: string) {
    if (!confirm('Remover este serviço?')) return;
    const res = await fetch(`/api/servicos/${id}`, { method: 'DELETE' });
    if (res.ok) setServices(prev => prev.filter(s => s.id !== id));
  }

  function startEdit(s: Service) {
    setEditingService({ id: s.id, name: s.name, price: String(s.price) });
  }

  async function confirmEdit() {
    if (!editingService) return;
    const name = editingService.name.trim();
    if (!name) return;
    setError('');
    try {
      const res = await fetch(`/api/servicos/${editingService.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price: parseFloat(editingService.price) || 0 }) });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setServices(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingService(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao editar serviço');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Serviços</h1>
        <p className="text-zinc-400 text-sm mt-1">{services.length} serviços cadastrados</p>
      </div>

      <div className="flex gap-3">
        <input
          value={newServiceName}
          onChange={e => setNewServiceName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addService()}
          placeholder="Nome do serviço..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
        <input
          value={newServicePrice}
          onChange={e => setNewServicePrice(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addService()}
          placeholder="R$ (opcional)"
          type="number"
          className="w-36 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
        <button onClick={addService} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Adicionar
        </button>
      </div>
      {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {loading && <p className="text-center text-zinc-500 py-10">Carregando...</p>}
        {!loading && services.length === 0 && <p className="text-center text-zinc-500 py-10">Nenhum serviço cadastrado</p>}
        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
            {editingService?.id === s.id ? (
              <>
                <input
                  autoFocus
                  value={editingService.name}
                  onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingService(null); }}
                  className="flex-1 bg-zinc-800 border border-orange-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                />
                <input
                  value={editingService.price}
                  onChange={e => setEditingService({ ...editingService, price: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingService(null); }}
                  type="number"
                  className="w-28 bg-zinc-800 border border-orange-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                />
                <button onClick={confirmEdit} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors">Salvar</button>
                <button onClick={() => setEditingService(null)} className="text-zinc-400 hover:text-white text-xs px-2 py-1.5">Cancelar</button>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Wrench size={14} className="text-orange-400" />
                </div>
                <span className="flex-1 text-white text-sm">{s.name}</span>
                <span className="text-zinc-400 text-sm">{s.price ? `R$ ${Number(s.price).toFixed(2).replace('.', ',')}` : '—'}</span>
                <button onClick={() => startEdit(s)} className="text-zinc-400 hover:text-white p-1 rounded transition-colors"><Pencil size={14} /></button>
                <button onClick={() => deleteService(s.id)} className="text-zinc-400 hover:text-red-400 p-1 rounded transition-colors"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-zinc-600 text-xs">Os serviços deste catálogo aparecem no dropdown ao criar agendamentos, ordens de serviço e orçamentos.</p>
    </div>
  );
}
