type MercadoPagoItem = {
  id?: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

type CreatePreferenceInput = {
  externalReference: string;
  notificationUrl: string;
  items: MercadoPagoItem[];
  metadata?: Record<string, unknown>;
};

type MercadoPagoPaymentResponse = {
  id: string | number;
  status: string;
  external_reference?: string | null;
  metadata?: Record<string, unknown>;
  transaction_amount?: number;
  date_approved?: string | null;
};

const getAccessToken = () => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
  }

  return accessToken;
};

export const getAppBaseUrl = () => {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
};

const mercadoPagoRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
};

export const createMercadoPagoPreference = async (input: CreatePreferenceInput) => {
  return mercadoPagoRequest<{
    id: string;
    init_point: string;
    sandbox_init_point?: string;
    status: string;
  }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: input.items,
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      metadata: input.metadata,
    }),
  });
};

export const fetchMercadoPagoPayment = async (paymentId: string | number) => {
  return mercadoPagoRequest<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`);
};

export const refundMercadoPagoPayment = async (paymentId: string | number) => {
  return mercadoPagoRequest<{ id: string | number; status: string }>(`/v1/payments/${paymentId}/refunds`, {
    method: "POST",
  });
};
