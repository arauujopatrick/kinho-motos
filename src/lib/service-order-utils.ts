import type { PaymentMethod } from '@/types';
import { formatPhone, isUuid, normalizePlate } from '@/lib/customer-utils';

const PAYMENT_METHODS: PaymentMethod[] = ['Dinheiro', 'Pix', 'Cartão'];

type ServiceOrderItemInput = {
  id: string;
  description: string;
  price: number;
  product_id: string | null;
  quantity: number | null;
};

export type ServiceOrderPayload = {
  customer_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  customer_contact: string;
  motorcycle: string;
  plate: string | null;
  description: string | null;
  total_value: number;
  discount: number;
  entry_date: string;
  promised_date: string;
  payment_method: PaymentMethod;
  card_installments: number | null;
  items: ServiceOrderItemInput[];
};

type ValidationSuccess = {
  success: true;
  data: ServiceOrderPayload;
};

type ValidationFailure = {
  success: false;
  message: string;
};

type ValidationResult = ValidationSuccess | ValidationFailure;

type DatabaseErrorLike = {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized ? normalized.slice(0, maxLength) : null;
};

const toDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11);

const isValidPhoneDigits = (value: string) =>
  value.length === 10 || value.length === 11;

const normalizeCustomerId = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
};

const isPaymentMethod = (value: string): value is PaymentMethod =>
  PAYMENT_METHODS.includes(value as PaymentMethod);

export function parseServiceOrderPayload(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { success: false, message: 'Dados da OS inválidos.' };
  }

  const customerId = normalizeCustomerId(input.customer_id);
  const guestName = normalizeOptionalText(input.guest_name, 120);
  const guestPhoneDigits = toDigits(typeof input.guest_phone === 'string' ? input.guest_phone : '');
  const customerContactDigits = toDigits(typeof input.customer_contact === 'string' ? input.customer_contact : '');
  const motorcycle = normalizeOptionalText(input.motorcycle, 120);
  const plate = normalizePlate(input.plate);
  const paymentMethod = typeof input.payment_method === 'string' ? input.payment_method : '';
  const rawInstallments = typeof input.card_installments === 'string' || typeof input.card_installments === 'number'
    ? String(input.card_installments).trim()
    : '';
  const promisedDateRaw = typeof input.promised_date === 'string' ? input.promised_date : '';
  const totalValue = Number(input.total_value ?? 0);
  const discountValue = Number(input.discount ?? 0);
  const description = normalizeOptionalText(input.description, 500);

  if (!customerId && !guestName) {
    return { success: false, message: 'Selecione um cliente ou informe o nome do cliente avulso.' };
  }

  if (customerId && !isUuid(customerId)) {
    return { success: false, message: 'Cliente inválido. Atualize a página e selecione o cliente novamente.' };
  }

  if (!customerId && !isValidPhoneDigits(guestPhoneDigits)) {
    return { success: false, message: 'Informe um telefone válido para o cliente avulso.' };
  }

  if (!isValidPhoneDigits(customerContactDigits)) {
    return { success: false, message: 'O contato principal da OS precisa ter um telefone válido.' };
  }

  if (!motorcycle) {
    return { success: false, message: 'Informe a moto desta ordem de serviço.' };
  }

  if (plate && plate.length !== 7) {
    return { success: false, message: 'A placa deve ter exatamente 7 caracteres.' };
  }

  if (!isPaymentMethod(paymentMethod)) {
    return { success: false, message: 'Selecione um método de pagamento válido.' };
  }

  if (!promisedDateRaw) {
    return { success: false, message: 'Informe a data de entrega da OS.' };
  }

  const promisedDate = new Date(promisedDateRaw);
  if (Number.isNaN(promisedDate.getTime())) {
    return { success: false, message: 'A data de entrega informada é inválida.' };
  }

  if (!Number.isFinite(totalValue) || totalValue < 0) {
    return { success: false, message: 'O valor total da OS é inválido.' };
  }

  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return { success: false, message: 'O valor do desconto da OS é inválido.' };
  }

  const itemsInput = Array.isArray(input.items) ? input.items : [];
  const items = itemsInput
    .filter(isRecord)
    .map((item) => {
      const normalizedDescription = normalizeOptionalText(item.description, 160);
      const price = Number(item.price);

      if (!normalizedDescription || !Number.isFinite(price) || price < 0) {
        return null;
      }

      const productId = typeof item.product_id === 'string' && isUuid(item.product_id) ? item.product_id : null;
      const quantityRaw = Number(item.quantity);
      const quantity = productId && Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : null;

      return {
        id: isUuid(item.id) ? item.id : crypto.randomUUID(),
        description: normalizedDescription,
        price,
        product_id: productId,
        quantity,
      };
    })
    .filter((item): item is ServiceOrderItemInput => item !== null);

  if (items.length === 0) {
    return { success: false, message: 'Adicione pelo menos um item à ordem de serviço.' };
  }

  const parsedInstallments = rawInstallments ? Number.parseInt(rawInstallments, 10) : null;
  const cardInstallments =
    paymentMethod === 'Cartão' && parsedInstallments && Number.isFinite(parsedInstallments)
      ? parsedInstallments
      : null;

  return {
    success: true,
    data: {
      customer_id: customerId,
      guest_name: guestName,
      guest_phone: guestPhoneDigits ? formatPhone(guestPhoneDigits) : null,
      customer_contact: formatPhone(customerContactDigits),
      motorcycle,
      plate,
      description: description || items.map((item) => item.description).join(', ').slice(0, 500),
      total_value: totalValue,
      discount: discountValue,
      entry_date: new Date().toISOString(),
      promised_date: promisedDate.toISOString(),
      payment_method: paymentMethod,
      card_installments: cardInstallments,
      items,
    },
  };
}

const getConstraintLabel = (error: DatabaseErrorLike) => {
  const fingerprint = `${error.constraint ?? ''} ${error.detail ?? ''} ${error.message ?? ''}`.toLowerCase();

  if (fingerprint.includes('customer_id')) {
    return 'cliente';
  }

  if (fingerprint.includes('promised_date')) {
    return 'data de entrega';
  }

  if (fingerprint.includes('payment_method')) {
    return 'método de pagamento';
  }

  return null;
};

export function getServiceOrderApiError(error: unknown, fallbackMessage: string) {
  const dbError = isRecord(error) ? (error as DatabaseErrorLike) : {};

  switch (dbError.code) {
    case '23503': {
      const fieldLabel = getConstraintLabel(dbError);
      return {
        status: 409,
        message: fieldLabel
          ? `O valor informado para ${fieldLabel} não existe mais no banco.`
          : 'A OS faz referência a um registro que não existe mais no banco.',
      };
    }
    case '23502':
      return {
        status: 400,
        message: 'Faltam campos obrigatórios para criar a OS.',
      };
    case '22001':
      return {
        status: 400,
        message: 'Um dos campos da OS ultrapassou o tamanho permitido.',
      };
    case '22P02':
      return {
        status: 400,
        message: 'Um dos campos da OS está em formato inválido.',
      };
    default:
      return {
        status: 500,
        message: fallbackMessage,
      };
  }
}

export function logServiceOrderApiError(action: string, error: unknown) {
  if (isRecord(error)) {
    console.error(`[ordens-servico:${action}]`, {
      code: typeof error.code === 'string' ? error.code : undefined,
      constraint: typeof error.constraint === 'string' ? error.constraint : undefined,
      detail: typeof error.detail === 'string' ? error.detail : undefined,
      message: typeof error.message === 'string' ? error.message : undefined,
    });
    return;
  }

  console.error(`[ordens-servico:${action}]`, error);
}
