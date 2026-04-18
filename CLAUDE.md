@AGENTS.md

# Kinho Motos — Sistema de Gestão de Oficina

## Visão Geral

Sistema de gestão completo para oficina de motos. Desenvolvido em **Next.js 16 (App Router)** com **React 19**, banco **PostgreSQL via Neon (serverless)**, estilização com **Tailwind CSS v4** e ícones via **Lucide React**.

A interface é escura (dark mode), com cor de destaque laranja (`orange-500`), design responsivo e voltada para uso no balcão da oficina.

---

## Stack Técnica

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Framework    | Next.js 16.2 (App Router)           |
| Linguagem    | TypeScript 5                        |
| UI           | React 19 + Tailwind CSS v4          |
| Ícones       | Lucide React                        |
| Banco        | PostgreSQL (Neon serverless)        |
| ORM/Query    | `@neondatabase/serverless` (raw SQL)|
| PDF          | jsPDF + jspdf-autotable             |
| Datas        | date-fns (locale ptBR)              |
| IDs          | uuid v13                            |

---

## Estrutura de Diretórios

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (rota /)
│   ├── layout.tsx                  # Layout raiz com Sidebar
│   ├── globals.css                 # Estilos globais Tailwind
│   │
│   ├── agendamentos/               # Módulo de agendamentos
│   ├── clientes/                   # Módulo de clientes
│   ├── cobranca/                   # Módulo de cobranças
│   ├── estoque/                    # Módulo de estoque
│   ├── financeiro/                 # Módulo financeiro
│   ├── historico/                  # Histórico de operações
│   ├── orcamentos/                 # Módulo de orçamentos
│   ├── ordens-servico/             # Módulo de ordens de serviço
│   ├── pdv/                        # Ponto de venda (caixa)
│   ├── relatorios/                 # Relatórios e exportação PDF
│   │
│   └── api/                        # Route Handlers (API REST)
│       ├── agendamentos/
│       ├── clientes/
│       ├── estoque/
│       ├── financeiro/
│       ├── orcamentos/
│       ├── ordens-servico/
│       ├── pdv/
│       ├── produtos/
│       └── tarefas/
│
├── components/
│   └── Sidebar.tsx                 # Navegação lateral
│
├── lib/
│   └── db.ts                       # Conexão Neon (sql tag)
│
└── types/
    └── index.ts                    # Tipos TypeScript do domínio
```

---

## Módulos do Sistema

### Dashboard (`/`)
Visão geral da operação do dia:
- **Métricas**: OS abertas, entregas do dia, receita do mês, agendamentos do dia
- **Entregas previstas**: OS com `promised_date` igual a hoje e status ≠ Finalizado
- **Tarefas do dia**: checklist diário (criar, marcar, deletar)

### Clientes (`/clientes`)
CRUD de clientes. Cada cliente tem nome, telefone, WhatsApp, e-mail, moto, placa e endereço.

### Ordens de Serviço (`/ordens-servico`)
Módulo principal da oficina:
- Criar OS para clientes cadastrados ou avulsos (sem cadastro)
- Status: `Aberto` → `Em andamento` → `Finalizado`
- Itens de serviço com descrição e preço
- Data de entrada e data prometida de entrega
- Formas de pagamento: Dinheiro, Pix, Cartão (com parcelamento)
- Ao finalizar, lança entrada no financeiro automaticamente

### Orçamentos (`/orcamentos`)
Orçamentos independentes das OS:
- Status: `Pendente` → `Aprovado` → `Recusado`
- Pode ser convertido em OS
- Validade configurável

### Agendamentos (`/agendamentos`)
Agenda de serviços:
- Status: `Agendado` → `Confirmado` → `Concluido` / `Cancelado`
- Associado a cliente cadastrado ou avulso
- Campo de serviço e horário

### Estoque (`/estoque`)
Gestão de peças e produtos:
- Cadastro com categoria, preço e quantidade
- Movimentações de entrada (`IN`) e saída (`OUT`)
- Alerta visual para estoque baixo

### PDV — Ponto de Venda (`/pdv`)
Caixa rápido para vendas diretas:
- Busca de produtos por nome
- Carrinho com quantidade e subtotal
- Finalização com forma de pagamento
- Lança no financeiro automaticamente

### Financeiro (`/financeiro`)
Controle de caixa:
- Transações do tipo `INCOME` (entrada) e `EXPENSE` (saída)
- Origem rastreável via `source_id`
- Filtros por período e tipo

### Cobrança (`/cobranca`)
Gestão de cobranças pendentes e em atraso (vinculado às OS finalizadas sem pagamento registrado ou com parcelas pendentes).

### Relatórios (`/relatorios`)
Exportação de dados em PDF usando jsPDF + autotable:
- Relatório de OS por período
- Relatório financeiro
- Relatório de estoque

### Histórico (`/historico`)
Log de operações realizadas — OS finalizadas, transações e movimentações de estoque.

---

## Tipos do Domínio (`src/types/index.ts`)

```typescript
// Entidades principais
Customer       // Cliente com moto e placa
Product        // Produto/peça do estoque
CartItem       // Item no carrinho do PDV
StockMovement  // Movimentação de estoque (IN | OUT)
ServiceItem    // Item de serviço em OS ou orçamento
ServiceOrder   // Ordem de Serviço (OSStatus)
Quote          // Orçamento (QuoteStatus)
Transaction    // Transação financeira (INCOME | EXPENSE)
Appointment    // Agendamento (AppointmentStatus)
DailyTask      // Tarefa diária do dashboard

// Status types
OSStatus          = 'Aberto' | 'Em andamento' | 'Finalizado'
QuoteStatus       = 'Pendente' | 'Aprovado' | 'Recusado'
AppointmentStatus = 'Agendado' | 'Confirmado' | 'Cancelado' | 'Concluido'
PaymentMethod     = 'Dinheiro' | 'Pix' | 'Cartão'
```

---

## Banco de Dados

**Conexão** via `src/lib/db.ts`:
```typescript
import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL!);
```

**Uso nas Route Handlers** (SQL direto com template literals):
```typescript
import { sql } from '@/lib/db';
const rows = await sql`SELECT * FROM customers ORDER BY name`;
```

**Variável de ambiente obrigatória:**
```
DATABASE_URL=postgresql://user:password@host.neon.tech/kinho?sslmode=require
```

### Tabelas Principais

| Tabela            | Descrição                           |
|-------------------|-------------------------------------|
| `customers`       | Clientes cadastrados                |
| `products`        | Produtos/peças do estoque           |
| `stock_movements` | Entradas e saídas de estoque        |
| `service_orders`  | Ordens de serviço                   |
| `service_items`   | Itens de cada OS ou orçamento       |
| `quotes`          | Orçamentos                          |
| `transactions`    | Movimentos financeiros              |
| `appointments`    | Agendamentos                        |
| `daily_tasks`     | Tarefas diárias do dashboard        |

---

## Padrões de Código

### Route Handlers (API)
Cada módulo tem sua pasta em `src/app/api/` com arquivos `route.ts`:
```typescript
// GET — listar
export async function GET() {
  const rows = await sql`SELECT * FROM tabela ORDER BY created_at DESC`;
  return Response.json(rows);
}

// POST — criar
export async function POST(req: Request) {
  const body = await req.json();
  const [row] = await sql`
    INSERT INTO tabela (id, campo1, campo2)
    VALUES (${crypto.randomUUID()}, ${body.campo1}, ${body.campo2})
    RETURNING *
  `;
  return Response.json(row);
}
```

Rotas dinâmicas ficam em `api/modulo/[id]/route.ts` para PUT e DELETE.

### Componentes de Página
- Todos os componentes de página são `'use client'` (dados via `fetch` no `useEffect`)
- Formulários com estado local via `useState`
- Loading state exibido durante fetch inicial
- Nenhum componente Server usa cookies/auth — sistema single-tenant

### Design System
```
Fundo geral:    bg-zinc-950
Cards/Painéis:  bg-zinc-900, border border-zinc-800, rounded-xl
Inputs:         bg-zinc-800, border-zinc-700, focus:border-orange-500
Botão primário: bg-orange-500 hover:bg-orange-600
Texto primário: text-white
Texto secundário: text-zinc-400
Cor de ação/destaque: orange-500
```

### Clientes Avulsos (Guest)
OS, Orçamentos e Agendamentos suportam clientes sem cadastro:
- `customer_id` = null (ou não vinculado)
- `guest_name` + `guest_phone` preenchidos manualmente

---

## Scripts

```bash
npm run dev      # Inicia servidor de desenvolvimento (porta 3000)
npm run build    # Build de produção
npm run start    # Inicia servidor de produção
npm run lint     # ESLint
```

---

## Regras de Desenvolvimento

1. **Nunca use `any`** — todos os tipos devem seguir `src/types/index.ts`
2. **SQL direto** — sem ORM; usar template literals do Neon (`sql\`...\``)
3. **IDs sempre UUID** — usar `crypto.randomUUID()` ou `uuid` lib
4. **Sem autenticação** — sistema single-tenant, sem login
5. **Dark mode fixo** — não implementar tema claro
6. **Cor de destaque** — sempre `orange-500` para ações primárias
7. **Transações financeiras** — ao finalizar OS ou venda no PDV, **sempre** lançar em `transactions`
8. **Validação** — validar no servidor (Route Handler) antes de inserir no banco
9. **Leitura do Next.js** — antes de usar qualquer API do Next.js 16, ler `node_modules/next/dist/docs/` (regra do AGENTS.md)
