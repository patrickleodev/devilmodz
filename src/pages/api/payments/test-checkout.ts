import type { NextApiRequest, NextApiResponse } from "next";
import { getAppBaseUrl } from "../../../lib/infinitepay";
import { createCheckoutLink } from "../../../lib/infinitepay";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Minimal test payload
  const orderId = `test-${Date.now()}`;
  const items = [
    { id: "test-item", title: "Teste Produto", quantity: 1, unit_price: 1.0, currency_id: "BRL" },
  ];

  const notificationUrl = `${getAppBaseUrl()}/api/payments/infinitepay/webhook`;

  const result: Record<string, unknown> = { orderId };

  // Try several InfinitePay payload variants to attempt hiding shipping collection
  const variants = [
    { shipping: { mode: "not_specified" }, collect_shipping: false },
    { shipping: { mode: "none" }, collect_shipping: false },
    { shipping_mode: "no_shipping", shipping_required: false, collect_shipping: false },
    { shipping: { mode: "no_shipping" }, collect_shipping: false },
  ];

  const attempts: any[] = [];

  for (const v of variants) {
    try {
      const payload: Record<string, unknown> = {
        handle: process.env.INFINITEPAY_TAG || "test-handle",
        items: items.map((it) => ({ quantity: it.quantity, price: Math.round((it.unit_price || 0) * 100), description: it.title })),
        redirect_url: `${getAppBaseUrl()}/?payment=success`,
        order_nsu: orderId,
        webhook_url: notificationUrl,
        metadata: { test: true, variant: v },
        ...v,
      };

      const ipRes = await createCheckoutLink(payload as any);
      const ipUrl = (ipRes as any).checkout_url || (ipRes as any).url || (ipRes as any).link || ((ipRes as any).slug ? `https://checkout.infinitepay.io/${process.env.INFINITEPAY_TAG || "test-handle"}/${(ipRes as any).slug}` : undefined);
      attempts.push({ variant: v, ok: true, url: ipUrl, raw: ipRes });
    } catch (err) {
      attempts.push({ variant: v, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  result.infinitePayAttempts = attempts;
  result.mock = { ok: true, url: `${getAppBaseUrl()}/mock-checkout?order=${orderId}` };

  return res.status(200).json(result);
}
