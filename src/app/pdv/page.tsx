'use client';

import { useEffect, useRef, useState } from 'react';
import { Barcode, Search, Trash2, Plus, Minus, ShoppingCart, CheckCircle, X } from 'lucide-react';
import type { CartItem, Product } from '@/types';

const PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Cartão'];

export default function PDV() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [customerName, setCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/produtos').then(r => r.json()).then(setProducts);
    fetch('/api/clientes').then(r => r.json()).then(setCustomers);
    barcodeRef.current?.focus();
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  ).slice(0, 6);

  // Foca no campo de barcode quando clicar fora de inputs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      barcodeRef.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const cardFee = paymentMethod === 'Cartão' ? 3 : 0;
  const total = subtotal + cardFee;
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && p.stock > 0
  );

  function addToCart(product: Product, qty = 1) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, product.stock);
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: newQty, subtotal: newQty * Number(product.price) }
          : i
        );
      }
      return [...prev, { product, quantity: qty, subtotal: qty * Number(product.price) }];
    });
    setError('');
  }

  async function handleBarcode(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const code = barcodeInput.trim();
    if (!code) return;

    const res = await fetch(`/api/produtos/barcode?code=${encodeURIComponent(code)}`);
    if (!res.ok) {
      setError(`Código "${code}" não encontrado`);
      setBarcodeInput('');
      return;
    }
    const product = await res.json();
    addToCart(product);
    setBarcodeInput('');
  }

  function changeQty(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => {
        if (i.product.id !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > i.product.stock) return i;
        return { ...i, quantity: newQty, subtotal: newQty * Number(i.product.price) };
      })
      .filter(Boolean) as CartItem[]
    );
  }

  function removeItem(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }

  async function finalize() {
    if (cart.length === 0) return;

    const items = cart.map(i => ({
      product_id: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      unit_price: Number(i.product.price),
      subtotal: i.subtotal,
    }));

    const res = await fetch('/api/pdv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, payment_method: paymentMethod, customer_name: customerName, card_fee: cardFee }),
    });

    if (res.ok) {
      setSuccess(true);
      setCart([]);
      setCustomerName('');
      // Atualiza estoque local
      setProducts(prev => prev.map(p => {
        const item = cart.find(i => i.product.id === p.id);
        return item ? { ...p, stock: p.stock - item.quantity } : p;
      }));
      setTimeout(() => { setSuccess(false); barcodeRef.current?.focus(); }, 3000);
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* Painel esquerdo — produtos */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart size={22} /> PDV — Ponto de Venda
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Escaneie o código de barras ou busque o produto</p>
        </div>

        {/* Input de barcode — foco principal */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
            <input
              ref={barcodeRef}
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcode}
              placeholder="Aguardando código de barras..."
              className="w-full bg-zinc-900 border-2 border-orange-500/50 focus:border-orange-500 rounded-lg pl-9 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto pelo nome..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-lg">
            <X size={14} /> {error}
          </div>
        )}

        {/* Grid de produtos */}
        <div className="flex-1 overflow-y-auto">
          {search && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.length === 0 && (
                <p className="col-span-3 text-center text-zinc-500 py-8">Nenhum produto encontrado</p>
              )}
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-xl p-4 text-left transition-all group"
                >
                  <p className="text-white font-medium text-sm leading-tight group-hover:text-orange-400 transition-colors">{p.name}</p>
                  <p className="text-zinc-500 text-xs mt-1">{p.category}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-orange-400 font-bold">R$ {Number(p.price).toFixed(2).replace('.', ',')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock <= 2 ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {p.stock} un
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!search && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <Barcode size={48} className="mb-3 opacity-30" />
              <p className="text-sm">Escaneie um produto ou use a busca</p>
            </div>
          )}
        </div>
      </div>

      {/* Painel direito — carrinho */}
      <div className="w-80 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white">Carrinho</h2>
          <p className="text-zinc-500 text-xs">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</p>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 && (
            <p className="text-center text-zinc-600 text-sm py-8">Carrinho vazio</p>
          )}
          {cart.map(item => (
            <div key={item.product.id} className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-white text-sm font-medium leading-tight flex-1">{item.product.name}</p>
                <button onClick={() => removeItem(item.product.id)} className="text-zinc-500 hover:text-red-400 flex-shrink-0 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(item.product.id, -1)} className="w-6 h-6 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center text-white transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => changeQty(item.product.id, 1)} className="w-6 h-6 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center text-white transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
                <p className="text-orange-400 font-semibold text-sm">R$ {item.subtotal.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Finalização */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="relative">
            <input
              value={customerSearch || customerName}
              onChange={e => {
                const v = e.target.value;
                setCustomerSearch(v);
                setCustomerName(v);
                setShowCustomerList(true);
              }}
              onFocus={() => setShowCustomerList(true)}
              onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
              placeholder="Cliente (opcional)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
            {showCustomerList && filteredCustomers.length > 0 && (
              <ul className="absolute bottom-full mb-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl z-10">
                {filteredCustomers.map(c => (
                  <li
                    key={c.id}
                    onMouseDown={() => {
                      setCustomerName(c.name);
                      setCustomerSearch('');
                      setShowCustomerList(false);
                    }}
                    className="px-3 py-2 text-sm text-white hover:bg-zinc-700 cursor-pointer"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-zinc-500 text-xs ml-2">{c.phone}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
          >
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>

          <div className="border-t border-zinc-700 pt-2 space-y-1">
            {cardFee > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Subtotal</span>
                  <span className="text-zinc-300 text-sm">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 text-sm">Taxa Cartão</span>
                  <span className="text-yellow-400 text-sm">+ R$ 3,00</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between py-1">
              <span className="text-zinc-400 text-sm">Total</span>
              <span className="text-xl font-bold text-white">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <button
            onClick={finalize}
            disabled={cart.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} /> Finalizar Venda
          </button>
        </div>
      </div>

      {/* Toast de sucesso */}
      {success && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <CheckCircle size={18} /> Venda finalizada com sucesso!
        </div>
      )}
    </div>
  );
}
