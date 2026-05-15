import https from 'https';

const tag = process.env.INFINITEPAY_TAG || 'patrickvieiraleo';
const base = 'https://api.infinitepay.io';

const paths = [
  '/v1/checkouts',
  '/v1/checkout',
  '/v2/checkouts',
  '/v2/checkout',
  '/v1/transactions',
  '/v1/public/checkouts',
  '/v1/public/checkout',
  '/v1/checkout/public',
];

const headerVariants = [
  { name: 'query', apply: (url) => `${url}?tag=${tag}` },
  { name: 'header-x-tag', apply: (url) => url, headers: { 'X-Tag': tag } },
  { name: 'auth-bearer', apply: (url) => url, headers: { Authorization: `Bearer ${tag}` } },
  { name: 'no-tag', apply: (url) => url },
];

async function probe() {
  for (const p of paths) {
    for (const hv of headerVariants) {
      const url = hv.apply(`${base}${p}`);
      const headers = { 'Content-Type': 'application/json', ...(hv.headers || {}) };
      const body = JSON.stringify({ reference: 'probe-' + Date.now(), amount: 100, currency: 'BRL' });

      try {
        const res = await fetch(url, { method: 'POST', headers, body, redirect: 'manual' });
        const text = await res.text();
        console.log(`PATH=${p} VARIANT=${hv.name} STATUS=${res.status}`);
        console.log(text.substring(0, 600));
        console.log('---');
      } catch (e) {
        console.log(`PATH=${p} VARIANT=${hv.name} ERROR=${e.message}`);
        console.log('---');
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

probe().catch(err => { console.error(err); process.exit(1); });
