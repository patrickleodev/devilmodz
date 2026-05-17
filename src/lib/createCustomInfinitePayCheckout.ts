import { createCheckoutLink, getAppBaseUrl, LinkResponse } from "./infinitepay";

export async function createCustomInfinitePayCheckout(total: number, description: string): Promise<string> {
  const items = [
    {
      quantity: 1,
      price: Math.round(total * 100),
      description,
    },
  ];

  const handle = process.env.INFINITEPAY_TAG;
  if (!handle) throw new Error("INFINITEPAY_TAG is not configured");

  const payload: Record<string, unknown> = {
    handle,
    items,
    redirect_url: `${getAppBaseUrl()}/`,
    order_nsu: `custom-plan-${Date.now()}`,
    webhook_url: `${getAppBaseUrl()}/api/payments/infinitepay/webhook`,
    // standard fields only
  };

  const res: LinkResponse = await createCheckoutLink(payload);

  // Response may contain a direct URL or a slug; try common fields
  if (res.url) return String(res.url);
  if (res.link) return String(res.link);
  if (res.checkout_url) return String(res.checkout_url);
  if (res.slug) return `https://checkout.infinitepay.io/${handle}/${res.slug}`;

  throw new Error("Unexpected response from InfinitePay Links API: " + JSON.stringify(res));
}
