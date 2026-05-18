import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ensureDataSource } from "@/lib/db";
import { createCheckoutLink, getAppBaseUrl } from "@/lib/infinitepay";
import { resolveDbUser } from "@/lib/session";
import { createOrderTicketThread } from "@/lib/discord";

const MIN_MILHOES = 0;
const MAX_MILHOES = 3000;
const STEP_MILHOES = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) return res.status(401).json({ error: "Unauthorized" });

  const { milhoes, trajes, carros } = req.body;
  const milhoesValue = Number(milhoes);
  const trajesValue = Number(trajes || 0);
  const carrosValue = Number(carros || 0);
  const nivelPersonalizado = req.body?.nivelPersonalizado === true;

  if (!Number.isFinite(milhoesValue) || !Number.isFinite(trajesValue)) {
    return res.status(400).json({ error: "Quantidade de milhões inválida" });
  }

  if (milhoesValue < MIN_MILHOES || milhoesValue > MAX_MILHOES || milhoesValue % STEP_MILHOES !== 0) {
    return res.status(400).json({ error: "Escolha um valor entre 30 milhões e 3 bilhões, em passos de 30 milhões" });
  }

  const PRICE_PER_STEP = 14.9;
  const PRICE_PER_TRAJE = 0.95;
  const PRICE_PER_CARRO = 2.9;
  const PRICE_NIVEL_PERSONALIZADO = 6;
  if (trajesValue < 0 || trajesValue > 100) {
    return res.status(400).json({ error: "Trajes inválidos (0-100)" });
  }
  if (carrosValue < 0 || carrosValue > 200) {
    return res.status(400).json({ error: "Carros inválidos (0-200)" });
  }
  const milhoesSubtotal = (milhoesValue / STEP_MILHOES) * PRICE_PER_STEP;
  const trajesSubtotal = trajesValue * PRICE_PER_TRAJE;
  const carrosSubtotal = carrosValue * PRICE_PER_CARRO;
  const total = milhoesSubtotal + trajesSubtotal + carrosSubtotal + (nivelPersonalizado ? PRICE_NIVEL_PERSONALIZADO : 0);
  const label = `Plano Personalizado`;
  const customPlanDescription = `Plano customizado gerado pelo usuario.`;
  const customPlanTags = [
    "custom:plan",
    "badge:Personalizado",
    `money:${milhoesValue}`,
    `clothes:${trajesValue}`,
    `cars:${carrosValue}`,
    ...(nivelPersonalizado ? ["level:custom"] : []),
  ];

  // Valor mínimo para criar checkout (R$2.00)
  if (total < 2) {
    return res.status(400).json({ error: "Valor mínimo para checkout é R$2,00" });
  }

  // Cria pedido, pagamento e checkout link
  try {
    const ds = await ensureDataSource();
    const dbUser = await resolveDbUser(sessionUser);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    // Create order
    const orderInsert = await ds.query(
      `INSERT INTO "orders" (
         "userId",
         "productId",
         amount,
         status,
         "productTitle",
         "productDescription",
         "productDeliveryType",
         "productTags"
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [dbUser.id, null, total, "pending", label, customPlanDescription, "manual", customPlanTags.join(",")]
    );

    const orderId = orderInsert?.[0]?.id as string | undefined;
    if (!orderId) return res.status(500).json({ error: "Failed to create order" });

    // Build InfinitePay link payload
    const handle = process.env.INFINITEPAY_TAG;
    if (!handle) return res.status(500).json({ error: "INFINITEPAY_TAG not configured" });

    const notificationUrl = `${getAppBaseUrl()}/api/payments/infinitepay/webhook`;

    const items = [
      { description: label, quantity: 1, price: Math.round(total * 100) },
    ];

    const payload: Record<string, unknown> = {
      handle,
      items,
      order_nsu: orderId,
      metadata: { orderId },
      webhook_url: notificationUrl,
      redirect_url: `${getAppBaseUrl()}/`,
    };

    const checkoutRes = await createCheckoutLink(payload);

    // Save payment record
    await ds.query(
      `INSERT INTO "payments" ("orderId", provider, "providerPaymentId", status, "rawPayload") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        orderId,
        "infinitepay",
        checkoutRes.id || checkoutRes.link || checkoutRes.slug || "",
        "pending",
        JSON.stringify({ request: payload, response: checkoutRes }),
      ],
    );

    // Try to create a Discord ticket for the order
    try {
      const ticket = await createOrderTicketThread({
        orderId,
        productTitle: label,
        amount: total,
        mention: null,
        userEmail: dbUser.email || null,
        userName: dbUser.name || null,
      });

      if (ticket?.threadId) {
        await ds.query(`UPDATE "orders" SET "discordThreadId" = $2, "discordThreadUrl" = $3 WHERE id = $1`, [orderId, ticket.threadId, ticket.threadUrl]);
      }
    } catch (err) {
      console.error("Failed to create Discord ticket for custom plan:", err);
    }

    const paymentUrl = checkoutRes.url || checkoutRes.link || checkoutRes.checkout_url || (checkoutRes.slug ? `https://checkout.infinitepay.io/${handle}/${checkoutRes.slug}` : undefined);

    return res.status(200).json({ orderId, paymentUrl, provider: "infinitepay" });
  } catch (e) {
    // Log detalhado para debug
    console.error("Erro ao criar checkout InfinitePay:", e);

    // Fallback: use public checkout links (defined in env) based on total
    const starter = process.env.NEXT_PUBLIC_INFINITEPAY_CHECKOUT_STARTER_URL;
    const pro = process.env.NEXT_PUBLIC_INFINITEPAY_CHECKOUT_PRO_URL;
    const elite = process.env.NEXT_PUBLIC_INFINITEPAY_CHECKOUT_ELITE_URL;

    let fallbackUrl: string | undefined;
    if (milhoesValue <= 300) fallbackUrl = starter;
    else if (milhoesValue <= 1500) fallbackUrl = pro || starter;
    else fallbackUrl = elite || pro || starter;

    if (fallbackUrl) {
      return res.status(200).json({ url: fallbackUrl, fallback: true, message: e instanceof Error ? e.message : String(e) });
    }

    if (e instanceof Error) {
      return res.status(500).json({ error: e.message });
    }
    return res.status(500).json({ error: "Erro desconhecido ao criar checkout" });
  }
}
