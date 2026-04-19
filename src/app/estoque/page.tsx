'use client';

import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp, TrendingDown, Package, Pencil, Trash2 } from 'lucide-react';
import type { Product } from '@/types';

export default function Estoque() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState<'product' | 'edit' | 'movement' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '', price: '', cost: '', stock: '', barcode: '' });
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [movForm, setMovForm] = useState({ type: 'IN', quantity: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/produtos').then(r => r.json()).then(setProducts); }, []);

  async function saveProduct() {
    if (!form.name.trim() || !form.price.trim()) {
      setError('Preencha o nome e o preço do produto.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { name: form.name, category: form.category, price: parseFloat(form.price), cost: parseFloat(form.cost) || 0, stock: parseInt(form.stock) || 0, barcode: form.barcode || null };
      const res = await fetch('/api/produtos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setProducts(prev => [created, ...prev]);
      setModal(null);
      setForm({ name: '', category: '', price: '', cost: '', stock: '', barcode: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!selectedProduct || !form.name.trim() || !form.price.trim()) {
      setError('Preencha o nome e o preço do produto.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { name: form.name, category: form.category, price: parseFloat(form.price), cost: parseFloat(form.cost) || 0, stock: parseInt(form.stock) || 0, barcode: form.barcode || null };
      const res = await fetch(`/api/produtos/${selectedProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? updated : p));
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao editar produto');
    } finally {
      setSaving(false);
    }
  }

  async function saveMovement() {
    if (!selectedProduct || !movForm.quantity.trim()) {
      setError('Informe a quantidade.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/estoque', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: selectedProduct.id, type: movForm.type, quantity: parseInt(movForm.quantity), reason: movForm.reason }) });
      if (!res.ok) throw new Error(await res.text());
      const qty = parseInt(movForm.quantity);
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, stock: movForm.type === 'IN' ? p.stock + qty : Math.max(0, p.stock - qty) } : p));
      setModal(null);
      setMovForm({ type: 'IN', quantity: '', reason: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  }

  function openNew() {
    setForm({ name: '', category: '', price: '', cost: '', stock: '', barcode: '' });
    setError('');
    setModal('product');
  }

  function openEdit(p: Product) {
    setSelectedProduct(p);
    setForm({ name: p.name, category: p.category, price: String(p.price), cost: String(p.cost ?? ''), stock: String(p.stock), barcode: p.barcode || '' });
    setError('');
    setModal('edit');
  }

  function openMovement(p: Product, type = 'IN') {
    setSelectedProduct(p);
    setMovForm({ type, quantity: '', reason: '' });
    setError('');
    setModal('movement');
  }

  async function removeProduct(id: string) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Erro ao excluir produto');
    }
  }

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const visibleProducts = filterCategory === 'Todos' ? products : products.filter(p => p.category === filterCategory);

  const formFields = [
    ['Nome *', 'name', 'text'],
    ['Preço de Venda *', 'price', 'number'],
    ['Custo', 'cost', 'number'],
    ['Estoque', 'stock', 'number'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Estoque</h1>
          <p className="text-zinc-400 text-sm mt-1">{products.length} produtos cadastrados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {/* Filtros de categoria */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === cat
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Produto</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Categoria</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Cód. Barras</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">Preço</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">Estoque</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-zinc-500">Nenhum produto</td></tr>}
            {visibleProducts.map(p => (
              <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center"><Package size={14} className="text-zinc-400" /></div>
                    <span className="text-white font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.category}</td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{p.barcode || '—'}</td>
                <td className="px-4 py-3 text-right text-white">R$ {Number(p.price).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-semibold ${p.stock <= 2 ? 'text-red-400' : p.stock <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>{p.stock}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(p)} className="text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 px-2 py-1 rounded flex items-center gap-1"><Pencil size={12} /> Editar</button>
                    <button onClick={() => openMovement(p, 'IN')} className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-2 py-1 rounded flex items-center gap-1"><TrendingUp size={12} /> Entrada</button>
                    <button onClick={() => openMovement(p, 'OUT')} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded flex items-center gap-1"><TrendingDown size={12} /> Saída</button>
                    <button onClick={() => removeProduct(p.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded flex items-center gap-1"><Trash2 size={12} /> Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal novo/editar produto */}
      {(modal === 'product' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">{modal === 'edit' ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setModal(null)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {formFields.map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                  <input type={type} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
                </div>
              ))}
              {/* Categoria com sugestões */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Categoria</label>
                <input
                  list="category-list"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Digite ou selecione..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
                <datalist id="category-list">
                  {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Código de Barras</label>
                <input
                  value={form.barcode}
                  onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  placeholder="Escaneie ou digite o código"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button onClick={modal === 'edit' ? saveEdit : saveProduct} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal movimentação */}
      {modal === 'movement' && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Movimentação — {selectedProduct.name}</h2>
              <button onClick={() => setModal(null)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                <select value={movForm.type} onChange={e => setMovForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                  <option value="IN">Entrada</option>
                  <option value="OUT">Saída</option>
                </select>
              </div>
              <div><label className="block text-xs text-zinc-400 mb-1">Quantidade *</label><input type="number" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Motivo</label><input value={movForm.reason} onChange={e => setMovForm(f => ({ ...f, reason: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" /></div>
              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button onClick={saveMovement} disabled={saving} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
