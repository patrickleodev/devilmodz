#!/usr/bin/env node

// Test script to simulate InfinitePay webhook
const baseUrl = process.env.APP_URL || 'http://localhost:3000';

// Generate a valid UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const orderId = generateUUID();

// Simulating a completed transaction from InfinitePay
const mockWebhookPayload = {
  transactionId: 'test-transaction-' + Date.now(),
  checkoutId: 'test-checkout-' + Date.now(),
  status: 'completed',
  amount: 4900, // 49.00 BRL
  metadata: {
    orderId: orderId,
  },
};

async function sendWebhook() {
  try {
    console.log('📤 Enviando webhook simulado para:', `${baseUrl}/api/payments/infinitepay/webhook`);
    console.log('📋 Payload:', JSON.stringify(mockWebhookPayload, null, 2));
    
    const response = await fetch(`${baseUrl}/api/payments/infinitepay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookPayload),
    });

    const data = await response.json();
    
    console.log('\n✅ Response Status:', response.status);
    console.log('📦 Response Body:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n🎉 Webhook processado com sucesso!');
      console.log('📌 Order ID UUID usado:', orderId);
    } else {
      console.log('\n⚠️ Webhook retornou erro');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error.message);
  }
}

sendWebhook();
