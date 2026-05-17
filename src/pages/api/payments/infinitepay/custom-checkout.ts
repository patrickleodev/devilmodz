import type { NextApiRequest, NextApiResponse } from "next";
import { createCustomInfinitePayCheckout } from "@/lib/infinitepay";

const MIN_MILHOES = 30;
const MAX_MILHOES = 3000;
const STEP_MILHOES = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { milhoes } = req.body;
  const milhoesValue = Number(milhoes);

  if (!Number.isFinite(milhoesValue)) {
    return res.status(400).json({ error: "Quantidade de milhões inválida" });
  }

  if (milhoesValue < MIN_MILHOES || milhoesValue > MAX_MILHOES || milhoesValue % STEP_MILHOES !== 0) {
    return res.status(400).json({ error: "Escolha um valor entre 30 milhões e 3 bilhões, em passos de 30 milhões" });
  }

  const PRICE_PER_STEP = 14.9;
  const total = (milhoesValue / STEP_MILHOES) * PRICE_PER_STEP;
  const label = `Plano Personalizado - ${milhoesValue.toLocaleString("pt-BR")} milhões`;

  // Cria o checkout na InfinitePay
  try {
    const url = await createCustomInfinitePayCheckout(total, label);
    return res.json({ url });
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
