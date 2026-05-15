import type { NextApiRequest, NextApiResponse } from "next";
import { createCustomInfinitePayCheckout } from "@/lib/infinitepay";

const OPCOES = [
  { id: "suporte", valor: 20 },
  { id: "entrega", valor: 15 },
  { id: "garantia", valor: 10 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { opcoes } = req.body;
  if (!Array.isArray(opcoes)) return res.status(400).json({ error: "Opções inválidas" });
  const total = OPCOES.filter(o => opcoes.includes(o.id)).reduce((acc, o) => acc + o.valor, 0);
  if (total === 0) return res.status(400).json({ error: "Selecione ao menos uma opção" });

  // Cria o checkout na InfinitePay
  try {
    const url = await createCustomInfinitePayCheckout(total, opcoes);
    return res.json({ url });
  } catch (e) {
    // Log detalhado para debug
    console.error("Erro ao criar checkout InfinitePay:", e);

    // Fallback: use public checkout links (defined in env) based on total
    const starter = process.env.NEXT_PUBLIC_INFINITEPAY_CHECKOUT_STARTER_URL;
    const pro = process.env.NEXT_PUBLIC_INFINITEPAY_CHECKOUT_PRO_URL;
    const elite = process.env.NEXT_PUBLIC_INFINITEPAY_CHECKOUT_ELITE_URL;

    let fallbackUrl: string | undefined;
    if (total <= 20) fallbackUrl = starter;
    else if (total <= 40) fallbackUrl = pro || starter;
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
