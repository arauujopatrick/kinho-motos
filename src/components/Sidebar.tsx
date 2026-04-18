'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardList, FileText,
  Calendar, Package, DollarSign, CreditCard,
  BarChart2, History, Wrench, ShoppingCart
} from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pdv', label: 'PDV', icon: ShoppingCart },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/ordens-servico', label: 'Ordens de Serviço', icon: ClipboardList },
  { href: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { href: '/agendamentos', label: 'Agendamentos', icon: Calendar },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/cobranca', label: 'Cobrança', icon: CreditCard },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart2 },
  { href: '/historico', label: 'Histórico', icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-zinc-900 text-white flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-700">
        <div className="bg-orange-500 p-2 rounded-lg">
          <Wrench size={20} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">Kinho</p>
          <p className="text-zinc-400 text-xs">Oficina de Motos</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-orange-500 text-white font-medium'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
