const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export type CustomerWritePayload = {
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  motorcycle: string | null;
  plate: string | null;
  address: string | null;
  observations: string | null;
};

type ValidationSuccess = {
  success: true;
  data: CustomerWritePayload;
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

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const toDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11);

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized ? normalized.slice(0, maxLength) : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isValidPhoneDigits = (digits: string) =>
  digits.length === 10 || digits.length === 11;

export function formatPhone(value: string) {
  const digits = toDigits(value);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : '';
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function normalizePlate(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return normalized || null;
}

export function parseCustomerPayload(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { success: false, message: 'Dados do cliente inválidos.' };
  }

  const name = normalizeOptionalText(input.name, 120);
  if (!name || name.length < 2) {
    return { success: false, message: 'Informe o nome completo do cliente.' };
  }

  const phoneDigits = toDigits(typeof input.phone === 'string' ? input.phone : '');
  if (!isValidPhoneDigits(phoneDigits)) {
    return { success: false, message: 'Informe um telefone com DDD válido.' };
  }

  const whatsappDigits = toDigits(typeof input.whatsapp === 'string' ? input.whatsapp : '');
  if (whatsappDigits && !isValidPhoneDigits(whatsappDigits)) {
    return { success: false, message: 'Informe um WhatsApp válido ou deixe o campo em branco.' };
  }

  const email = normalizeOptionalText(input.email, 160);
  if (email && !EMAIL_REGEX.test(email)) {
    return { success: false, message: 'Informe um e-mail válido.' };
  }

  const plate = normalizePlate(input.plate);
  if (plate && plate.length !== 7) {
    return { success: false, message: 'A placa deve ter exatamente 7 caracteres.' };
  }

  return {
    success: true,
    data: {
      name,
      phone: formatPhone(phoneDigits),
      whatsapp: whatsappDigits ? formatPhone(whatsappDigits) : null,
      email: email ? email.toLowerCase() : null,
      motorcycle: normalizeOptionalText(input.motorcycle, 120),
      plate,
      address: normalizeOptionalText(input.address, 200),
      observations: normalizeOptionalText(input.observations, 500),
    },
  };
}

const getUniqueFieldLabel = (error: DatabaseErrorLike) => {
  const fingerprint = `${error.constraint ?? ''} ${error.detail ?? ''} ${error.message ?? ''}`.toLowerCase();

  if (fingerprint.includes('phone')) {
    return 'telefone';
  }

  if (fingerprint.includes('whatsapp')) {
    return 'WhatsApp';
  }

  if (fingerprint.includes('plate')) {
    return 'placa';
  }

  if (fingerprint.includes('email')) {
    return 'e-mail';
  }

  return null;
};

export function getCustomerApiError(error: unknown, fallbackMessage: string) {
  const dbError = isRecord(error) ? (error as DatabaseErrorLike) : {};

  switch (dbError.code) {
    case '23505': {
      const fieldLabel = getUniqueFieldLabel(dbError);
      return {
        status: 409,
        message: fieldLabel
          ? `Ja existe um cliente com este ${fieldLabel}.`
          : 'Ja existe um cliente com estes dados.',
      };
    }
    case '23502':
      return {
        status: 400,
        message: 'Preencha os campos obrigatórios do cliente.',
      };
    case '22001':
      return {
        status: 400,
        message: 'Um dos campos do cliente ultrapassou o tamanho permitido.',
      };
    case '22P02':
      return {
        status: 400,
        message: 'Um dos campos do cliente está em formato inválido.',
      };
    default:
      return {
        status: 500,
        message: fallbackMessage,
      };
  }
}

export function logCustomerApiError(action: string, error: unknown) {
  if (isRecord(error)) {
    console.error(`[clientes:${action}]`, {
      code: typeof error.code === 'string' ? error.code : undefined,
      constraint: typeof error.constraint === 'string' ? error.constraint : undefined,
      detail: typeof error.detail === 'string' ? error.detail : undefined,
      message: typeof error.message === 'string' ? error.message : undefined,
    });
    return;
  }

  console.error(`[clientes:${action}]`, error);
}
