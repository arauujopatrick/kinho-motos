export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  motorcycle?: string;
  plate?: string;
  address?: string;
  observations?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  reason?: string;
}

export type OSStatus = 'Aberto' | 'Em andamento' | 'Finalizado';
export type PaymentMethod = 'Dinheiro' | 'Pix' | 'Cartão';

export interface ServiceItem {
  id: string;
  service_order_id?: string;
  quote_id?: string;
  description: string;
  price: number;
}

export interface ServiceOrder {
  id: string;
  customer_id?: string;
  customer_name?: string;
  guest_name?: string;
  guest_phone?: string;
  customer_contact: string;
  motorcycle: string;
  plate?: string;
  description?: string;
  total_value: number;
  entry_date: string;
  promised_date: string;
  delivery_date?: string;
  status: OSStatus;
  payment_method: PaymentMethod;
  card_installments?: 'À vista' | '2x' | '3x';
  items?: ServiceItem[];
  customer?: Customer;
}

export type QuoteStatus = 'Pendente' | 'Aprovado' | 'Recusado';

export interface Quote {
  id: string;
  customer_id?: string;
  customer_name?: string;
  guest_name?: string;
  guest_phone?: string;
  motorcycle?: string;
  plate?: string;
  description?: string;
  total_value: number;
  created_at: string;
  valid_until: string;
  status: QuoteStatus;
  items?: ServiceItem[];
  customer?: Customer;
}

export interface Transaction {
  id: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  value: number;
  payment_method: PaymentMethod | 'N/A';
  date: string;
  source_id?: string;
}

export type AppointmentStatus = 'Agendado' | 'Confirmado' | 'Cancelado' | 'Concluido';

export interface Appointment {
  id: string;
  customer_id?: string;
  customer_name?: string;
  guest_name?: string;
  guest_phone?: string;
  motorcycle: string;
  plate?: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  created_at: string;
  customer?: Customer;
}

export interface DailyTask {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
}
