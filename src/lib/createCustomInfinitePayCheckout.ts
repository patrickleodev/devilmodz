import { createCheckoutLink, getAppBaseUrl } from "./infinitepay";
import { PLAN_OPTIONS as OPTIONS } from "./planosOptions";

export async function createCustomInfinitePayCheckout(total: number, opcoes: string[]): Promise<string> {
  // Monta os itens do checkout a partir das opções selecionadas
  const items = opcoes.map((id) => {
    const found = OPTIONS.find((o) => o.id === id);
    const price = found ? found.valor : Math.round(total);
    const description = found ? found.label : "Plano Personalizado";
    return {
      quantity: 1,
      price: Math.round(price * 100), // centavos
      description,
    };
  });

  if (items.length === 0) {
    // fallback: single item with total
    items.push({ quantity: 1, price: Math.round(total * 100), description: "Plano Personalizado" });
  }

  const handle = process.env.INFINITEPAY_TAG;
  if (!handle) throw new Error("INFINITEPAY_TAG is not configured");

  const payload: Record<string, unknown> = {
    handle,
    items,
    redirect_url: `${getAppBaseUrl()}/`,
    order_nsu: `custom-plan-${Date.now()}`,
    webhook_url: `${getAppBaseUrl()}/api/payments/infinitepay/webhook`,
  };

  const res = await createCheckoutLink(payload);

  // Response may contain a direct URL or a slug; try common fields
  if (res.url) return String(res.url);
  if (res.link) return String(res.link);
  if (res.checkout_url) return String(res.checkout_url);
  if (res.slug) return `https://checkout.infinitepay.io/${handle}/${res.slug}`;

  throw new Error("Unexpected response from InfinitePay Links API: " + JSON.stringify(res));
}
