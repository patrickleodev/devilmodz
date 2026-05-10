#!/usr/bin/env node

const baseUrl = process.env.APP_URL || 'http://localhost:3000';
const orderId = 'd71581a1-0c16-487c-9794-5afd94505c9a';

const payload = {
  transactionId: 'test-transaction-' + Date.now(),
  checkoutId: 'test-checkout-' + Date.now(),
  status: 'completed',
  amount: 4900,
  metadata: {
    orderId,
  },
};

async function send() {
  try {
    console.log('Sending webhook with metadata.orderId to', `${baseUrl}/api/payments/infinitepay/webhook`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const res = await fetch(`${baseUrl}/api/payments/infinitepay/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await res.text();
    console.log('Status:', res.status);
    try { console.log('Body:', JSON.stringify(JSON.parse(body), null, 2)); } catch (e) { console.log('Body (raw):', body); }
  } catch (err) {
    console.error('Error sending webhook:', err && err.message ? err.message : err);
  }
}

send();
