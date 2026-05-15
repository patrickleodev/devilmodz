import type { NextApiRequest, NextApiResponse } from 'next';
import { getInfinitePayCheckoutMode } from '@/lib/infinitepay';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const raw = process.env.INFINITEPAY_MODE;
  const normalized = getInfinitePayCheckoutMode();
  const base = normalized === 'sandbox' ? 'https://api-sandbox.infinitepay.io' : 'https://api.infinitepay.io';
  return res.json({ raw: raw ?? null, normalized, base });
}
