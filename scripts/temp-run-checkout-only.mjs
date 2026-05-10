#!/usr/bin/env node

const baseUrl = process.env.APP_URL || 'http://localhost:3000';

const payload = {
  checkoutId: 'test-checkout-only-' + Date.now(),
};

async function send() {
  try {
    console.log('Sending checkoutId-only webhook to', `${baseUrl}/api/payments/infinitepay/webhook`);
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
