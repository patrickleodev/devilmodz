import { createInfinitePayCheckout, getAppBaseUrl } from "./infinitepay";

export async function createCustomInfinitePayCheckout(total: number, opcoes: string[]): Promise<string> {
  // Monta os itens do checkout
  const items = [
    {
      name: "Plano Personalizado",
      quantity: 1,
      price: total,
    },
  ];
  const input = {
    externalReference: `custom-plan-${Date.now()}`,
    notificationUrl: `${getAppBaseUrl()}/api/payments/infinitepay/webhook`,
    items,
    metadata: { opcoes },
  };
  const checkout = await createInfinitePayCheckout(input);
  return checkout.url;
}
