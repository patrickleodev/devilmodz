import fetch from 'node-fetch';

(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/payments/infinitepay/custom-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opcoes: ['suporte','entrega'] }),
    });
    const text = await res.text();
    console.log('Status', res.status);
    console.log(text);
  } catch (e) {
    console.error('Request error', e);
  }
})();
