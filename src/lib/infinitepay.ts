type InfinitePayItem = {
  name: string;
  quantity: number;
  price: number;
};

type CreateCheckoutInput = {
  externalReference: string;
  notificationUrl: string;
  items: InfinitePayItem[];
  payerEmail?: string;
  payerName?: string;
  metadata?: Record<string, unknown>;
};

type InfinitePayCheckoutResponse = {
  id: string;
  status: string;
  url: string;
  qrCode?: string;
};

type InfinitePayTransactionResponse = {
  id: string;
  status: string;
  amount: number;
  reference?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  approvedAt?: string | null;
};

type InfinitePayCheckoutMode = "sandbox" | "production";

const getInfiniteTag = () => {
  const tag = process.env.INFINITEPAY_TAG;

  if (!tag) {
    throw new Error("INFINITEPAY_TAG is not configured");
  }

  return tag;
};

export const getAppBaseUrl = () => {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
};

export const getInfinitePayCheckoutMode = (): InfinitePayCheckoutMode => {
  const configuredMode = process.env.INFINITEPAY_MODE?.toLowerCase();

  if (configuredMode === "sandbox" || configuredMode === "production") {
    return configuredMode;
  }

  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
};

const getApiBaseUrl = () => {
  const mode = getInfinitePayCheckoutMode();
  return mode === "sandbox"
    ? "https://api-sandbox.infinitepay.io"
    : "https://api.infinitepay.io";
};

const infinitePayRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`InfinitePay API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
};

export const createInfinitePayCheckout = async (input: CreateCheckoutInput) => {
  const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return infinitePayRequest<InfinitePayCheckoutResponse>("/v1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      reference: input.externalReference,
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "BRL",
      items: input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Math.round(item.price * 100), // Convert to cents
      })),
      customer: {
        email: input.payerEmail,
        name: input.payerName,
      },
      redirectUrl: {
        success: `${getAppBaseUrl()}/?payment=success`,
        cancel: `${getAppBaseUrl()}/?payment=cancel`,
        pending: `${getAppBaseUrl()}/?payment=pending`,
      },
      webhookUrl: input.notificationUrl,
      metadata: input.metadata,
    }),
  });
};

export const fetchInfinitePayTransaction = async (transactionId: string) => {
  return infinitePayRequest<InfinitePayTransactionResponse>(`/v1/transactions/${transactionId}`);
};

export const refundInfinitePayTransaction = async (transactionId: string, amount?: number) => {
  return infinitePayRequest<{ id: string; status: string }>(`/v1/transactions/${transactionId}/refund`, {
    method: "POST",
    body: JSON.stringify({
      amount: amount ? Math.round(amount * 100) : undefined, // Partial refund or full
    }),
  });
};
